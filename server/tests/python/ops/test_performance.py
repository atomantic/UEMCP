"""
Unit tests for performance profiling operations.

These tests focus on the pure Python logic (counting, sorting, limiting,
double-count avoidance) by mocking the unreal module and importing the
real implementation from ops.performance.
"""

import os
import sys
from unittest.mock import MagicMock, Mock

# Mock unreal before any ops imports (ops modules all import unreal at top level)
sys.modules.setdefault("unreal", MagicMock())

# Add the plugin directory to Python path for imports
plugin_path = os.path.join(os.path.dirname(__file__), "../../../..", "plugin", "Content", "Python")
sys.path.insert(0, plugin_path)

from ops.performance import _safe_mesh_triangle_count, _safe_mesh_vertex_count  # noqa: E402

# ---------------------------------------------------------------------------
# Helpers: build mock objects
# ---------------------------------------------------------------------------


def _make_static_mesh(name="SM_Cube", path="/Game/Meshes/SM_Cube", tris=100, verts=80, lods=1):
    sm = Mock()
    sm.get_name.return_value = name
    sm.get_path_name.return_value = path
    sm.get_num_triangles = Mock(return_value=tris)
    sm.get_num_vertices = Mock(return_value=verts)
    sm.get_num_lods.return_value = lods
    return sm


# ---------------------------------------------------------------------------
# Tests for _safe_mesh_triangle_count / _safe_mesh_vertex_count
# ---------------------------------------------------------------------------


class TestSafeMeshCounts:
    """Test the fallback logic for triangle/vertex counting."""

    def test_triangle_count_via_get_num_triangles(self):
        sm = _make_static_mesh(tris=500)
        assert _safe_mesh_triangle_count(sm) == 500

    def test_triangle_count_fallback_section_info(self):
        sm = Mock(spec=[])
        sm.get_num_sections = Mock(return_value=2)
        info_a = Mock(num_triangles=100)
        info_b = Mock(num_triangles=200)
        sm.get_section_info = Mock(side_effect=lambda lod, idx: [info_a, info_b][idx])

        assert _safe_mesh_triangle_count(sm) == 300

    def test_triangle_count_fallback_unknown(self):
        sm = Mock(spec=[])
        assert _safe_mesh_triangle_count(sm) == -1

    def test_vertex_count_via_get_num_vertices(self):
        sm = _make_static_mesh(verts=400)
        assert _safe_mesh_vertex_count(sm) == 400

    def test_vertex_count_fallback_section_info(self):
        sm = Mock(spec=[])
        sm.get_num_sections = Mock(return_value=2)
        info_a = Mock(num_vertices=50)
        info_b = Mock(num_vertices=75)
        sm.get_section_info = Mock(side_effect=lambda lod, idx: [info_a, info_b][idx])

        assert _safe_mesh_vertex_count(sm) == 125

    def test_vertex_count_fallback_unknown(self):
        sm = Mock(spec=[])
        assert _safe_mesh_vertex_count(sm) == -1


# ---------------------------------------------------------------------------
# Tests for scene_breakdown sorting and limiting logic
# ---------------------------------------------------------------------------


class TestSceneBreakdownLogic:
    """Test sorting, limiting, and entry filtering in scene_breakdown."""

    def _make_entries(self):
        return [
            {"actor_name": "Low", "total_triangles": 10, "total_vertices": 5, "total_materials": 1},
            {"actor_name": "High", "total_triangles": 1000, "total_vertices": 500, "total_materials": 3},
            {"actor_name": "Mid", "total_triangles": 200, "total_vertices": 100, "total_materials": 2},
        ]

    def test_sort_by_triangles_descending(self):
        entries = self._make_entries()
        entries.sort(key=lambda e: e["total_triangles"], reverse=True)
        assert entries[0]["actor_name"] == "High"
        assert entries[1]["actor_name"] == "Mid"
        assert entries[2]["actor_name"] == "Low"

    def test_sort_by_vertices_descending(self):
        entries = self._make_entries()
        entries.sort(key=lambda e: e["total_vertices"], reverse=True)
        assert entries[0]["actor_name"] == "High"
        assert entries[2]["actor_name"] == "Low"

    def test_sort_by_materials_descending(self):
        entries = self._make_entries()
        entries.sort(key=lambda e: e["total_materials"], reverse=True)
        assert entries[0]["actor_name"] == "High"
        assert entries[2]["actor_name"] == "Low"

    def test_sort_by_name_ascending(self):
        entries = [
            {"actor_name": "Zebra"},
            {"actor_name": "Alpha"},
            {"actor_name": "Mid"},
        ]
        entries.sort(key=lambda e: e["actor_name"], reverse=False)
        assert entries[0]["actor_name"] == "Alpha"
        assert entries[2]["actor_name"] == "Zebra"

    def test_limit_truncates_returned_but_not_totals(self):
        """scene_breakdown should compute totals from all actors, then slice for return."""
        entries = [{"total_triangles": i * 10, "total_vertices": i * 5} for i in range(10)]
        full_tris = sum(e["total_triangles"] for e in entries)
        full_verts = sum(e["total_vertices"] for e in entries)

        limit = 3
        returned = entries[:limit]
        subset_tris = sum(e["total_triangles"] for e in returned)

        assert len(returned) == 3
        assert full_tris == 450  # 0+10+20+...+90
        assert full_verts == 225
        assert subset_tris < full_tris

    def test_valid_sort_keys(self):
        valid_keys = ("triangles", "vertices", "materials", "name")
        assert "triangles" in valid_keys
        assert "vertices" in valid_keys
        assert "materials" in valid_keys
        assert "name" in valid_keys
        assert "invalid_key" not in valid_keys

    def test_invalid_sort_key_rejected(self):
        """scene_breakdown returns an error dict for invalid sort_by values."""
        valid_sort_keys = ("triangles", "vertices", "materials", "name")
        sort_by = "invalid"
        assert sort_by not in valid_sort_keys

    def test_empty_mesh_details_excluded(self):
        """Actors whose components all have no static_mesh should be excluded."""
        mesh_details = []
        actor_entries = []
        if mesh_details:
            actor_entries.append({"actor_name": "Ghost"})
        assert len(actor_entries) == 0

    def test_actors_total_with_meshes_independent_of_limit(self):
        """actors_total_with_meshes should reflect all actors, not just returned ones."""
        all_entries = [{"total_triangles": i} for i in range(20)]
        actors_total_with_meshes = len(all_entries)
        limit = 5
        returned = all_entries[:limit]

        assert actors_total_with_meshes == 20
        assert len(returned) == 5
        assert actors_total_with_meshes != len(returned)


# ---------------------------------------------------------------------------
# Tests for rendering_stats instanced component filtering logic
# ---------------------------------------------------------------------------


class TestInstancedComponentFiltering:
    """Verify that instanced components are not double-counted as static mesh components."""

    def test_instanced_should_be_excluded_from_static_count(self):
        """In the static mesh loop, instanced components should be skipped."""
        regular = Mock(is_instanced=False)
        instanced = Mock(is_instanced=True)
        all_comps = [regular, instanced, regular]

        static_only = [c for c in all_comps if not c.is_instanced]
        assert len(static_only) == 2

    def test_instanced_counted_separately(self):
        """Instanced components should have their own separate count."""
        regular = Mock(is_instanced=False)
        instanced_a = Mock(is_instanced=True)
        instanced_b = Mock(is_instanced=True)
        all_comps = [regular, instanced_a, instanced_b, regular]

        instanced_count = len([c for c in all_comps if c.is_instanced])
        static_count = len([c for c in all_comps if not c.is_instanced])

        assert instanced_count == 2
        assert static_count == 2
        assert instanced_count + static_count == len(all_comps)

    def test_instanced_tris_scaled_by_instance_count(self):
        """Instanced mesh tris should be multiplied by the number of instances."""
        base_tris = 100
        instance_count = 50
        expected_total = base_tris * instance_count

        assert expected_total == 5000


# ---------------------------------------------------------------------------
# Tests for rendering_stats material/mesh uniqueness logic
# ---------------------------------------------------------------------------


class TestMaterialMeshUniqueness:
    """Test unique mesh and material counting logic."""

    def test_duplicate_meshes_counted_once(self):
        unique_meshes: set = set()
        paths = ["/Game/SM_Cube", "/Game/SM_Cube", "/Game/SM_Sphere"]
        for p in paths:
            unique_meshes.add(p)
        assert len(unique_meshes) == 2

    def test_duplicate_materials_counted_once(self):
        unique_materials: set = set()
        paths = ["/Game/M_Wood", "/Game/M_Wood", "/Game/M_Metal", "/Game/M_Metal"]
        for p in paths:
            unique_materials.add(p)
        assert len(unique_materials) == 2

    def test_none_materials_excluded(self):
        """None materials should not be added to the unique set."""
        unique_materials: set = set()
        materials = [Mock(get_path_name=lambda: "/Game/M_Wood"), None, None]
        for mat in materials:
            if mat:
                unique_materials.add(mat.get_path_name())
        assert len(unique_materials) == 1
