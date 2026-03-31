"""
Unit tests for performance profiling operations.

These tests focus on the pure Python logic (counting, sorting, limiting,
double-count avoidance) by mocking the unreal module and importing the
real implementation from ops.performance.
"""

import os
import sys
from unittest.mock import MagicMock, Mock, patch

# ---------------------------------------------------------------------------
# Set up a properly structured unreal mock so isinstance checks work
# ---------------------------------------------------------------------------


class _MockStaticMeshComponent:
    pass


class _MockInstancedStaticMeshComponent(_MockStaticMeshComponent):
    pass


_mock_unreal = MagicMock()
_mock_unreal.StaticMeshComponent = _MockStaticMeshComponent
_mock_unreal.InstancedStaticMeshComponent = _MockInstancedStaticMeshComponent
sys.modules["unreal"] = _mock_unreal

# Add the plugin directory to Python path for imports
plugin_path = os.path.join(os.path.dirname(__file__), "../../../..", "plugin", "Content", "Python")
sys.path.insert(0, plugin_path)

from ops.performance import (  # noqa: E402
    _is_instanced_component,
    _normalize_path,
    _safe_mesh_triangle_count,
    _safe_mesh_vertex_count,
    gpu_stats,
    rendering_stats,
    scene_breakdown,
)

# ---------------------------------------------------------------------------
# Helpers: build mock actors/components
# ---------------------------------------------------------------------------


def _make_static_mesh(name="SM_Cube", path="/Game/Meshes/SM_Cube", tris=100, verts=80, lods=1):
    sm = Mock()
    sm.get_name.return_value = name
    sm.get_path_name.return_value = path
    sm.get_num_triangles = Mock(return_value=tris)
    sm.get_num_vertices = Mock(return_value=verts)
    sm.get_num_lods.return_value = lods
    return sm


def _make_material(name="M_Default", path="/Game/Materials/M_Default"):
    mat = Mock()
    mat.get_name.return_value = name
    mat.get_path_name.return_value = path
    return mat


def _make_sm_component(static_mesh=None, materials=None, is_instanced=False, instance_count=1):
    """Create a mock component that passes isinstance checks correctly."""
    if is_instanced:
        comp = MagicMock(spec=_MockInstancedStaticMeshComponent)
        comp.get_instance_count = Mock(return_value=instance_count)
    else:
        comp = MagicMock(spec=_MockStaticMeshComponent)

    comp.static_mesh = static_mesh
    comp.get_materials = Mock(return_value=materials or [])
    bounds = Mock()
    bounds.origin = Mock(x=0, y=0, z=0)
    bounds.box_extent = Mock(x=50, y=50, z=50)
    comp.bounds = bounds
    return comp


def _make_actor(label="Actor_0", class_name="StaticMeshActor", sm_comps=None, sk_comps=None, light_comps=None):
    """Create a mock actor with configurable component lists."""
    actor = Mock()
    actor.get_actor_label.return_value = label
    actor_class = Mock()
    actor_class.get_name.return_value = class_name
    actor.get_class.return_value = actor_class

    sm_comps = sm_comps or []
    sk_comps = sk_comps or []
    light_comps = light_comps or []

    def get_components_by_class(cls):
        if cls is _MockInstancedStaticMeshComponent:
            return [c for c in sm_comps if isinstance(c, _MockInstancedStaticMeshComponent)]
        if cls is _MockStaticMeshComponent:
            return sm_comps
        if cls is _mock_unreal.SkeletalMeshComponent:
            return sk_comps
        if cls is _mock_unreal.LightComponent:
            return light_comps
        return []

    actor.get_components_by_class = get_components_by_class
    return actor


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
# Tests for _is_instanced_component
# ---------------------------------------------------------------------------


class TestIsInstancedComponent:
    """Test the _is_instanced_component helper with properly typed mocks."""

    def test_regular_component_not_instanced(self):
        comp = _make_sm_component(is_instanced=False)
        assert not _is_instanced_component(comp)

    def test_instanced_component_detected(self):
        comp = _make_sm_component(is_instanced=True)
        assert _is_instanced_component(comp)


# ---------------------------------------------------------------------------
# Integration tests: call scene_breakdown() with mocked actors
# ---------------------------------------------------------------------------


class TestSceneBreakdownIntegration:
    """Test scene_breakdown() end-to-end with mocked actors."""

    @patch("ops.performance._get_all_actors")
    def test_scene_breakdown_sorts_by_triangles(self, mock_actors):
        """scene_breakdown returns actors sorted by triangle count descending."""
        sm_low = _make_static_mesh(name="Low", tris=10, verts=5)
        sm_high = _make_static_mesh(name="High", tris=1000, verts=500)
        sm_mid = _make_static_mesh(name="Mid", tris=200, verts=100)

        actors = [
            _make_actor("LowActor", sm_comps=[_make_sm_component(sm_low, [_make_material()])]),
            _make_actor("HighActor", sm_comps=[_make_sm_component(sm_high, [_make_material()])]),
            _make_actor("MidActor", sm_comps=[_make_sm_component(sm_mid, [_make_material()])]),
        ]
        mock_actors.return_value = actors

        result = scene_breakdown(limit=50, sort_by="triangles")
        assert result["success"] is True
        assert result["actors_returned"] == 3
        assert result["actors"][0]["actor_name"] == "HighActor"
        assert result["actors"][1]["actor_name"] == "MidActor"
        assert result["actors"][2]["actor_name"] == "LowActor"

    @patch("ops.performance._get_all_actors")
    def test_scene_breakdown_limit(self, mock_actors):
        """scene_breakdown limit truncates returned list but preserves scene totals."""
        actors = []
        for i in range(5):
            sm = _make_static_mesh(name=f"SM_{i}", tris=(i + 1) * 100, verts=(i + 1) * 50)
            actors.append(_make_actor(f"Actor_{i}", sm_comps=[_make_sm_component(sm, [_make_material()])]))
        mock_actors.return_value = actors

        result = scene_breakdown(limit=2, sort_by="triangles")
        assert result["success"] is True
        assert result["actors_returned"] == 2
        assert result["actors_total_with_meshes"] == 5
        assert result["scene_triangles"] == sum((i + 1) * 100 for i in range(5))

    @patch("ops.performance._get_all_actors")
    def test_scene_breakdown_invalid_sort_key(self, mock_actors):
        """scene_breakdown returns error for invalid sort_by."""
        mock_actors.return_value = []
        result = scene_breakdown(sort_by="invalid")
        assert result["success"] is False
        assert "sort_by" in result["error"]

    @patch("ops.performance._get_all_actors")
    def test_scene_breakdown_excludes_empty_mesh_actors(self, mock_actors):
        """Actors with components but no valid static_mesh should be excluded."""
        empty_comp = _make_sm_component(static_mesh=None)
        actors = [_make_actor("Ghost", sm_comps=[empty_comp])]
        mock_actors.return_value = actors

        result = scene_breakdown(limit=50, sort_by="triangles")
        assert result["success"] is True
        assert result["actors_returned"] == 0
        assert result["actors_total_with_meshes"] == 0


# ---------------------------------------------------------------------------
# Integration tests: call rendering_stats() with mocked actors
# ---------------------------------------------------------------------------


class TestRenderingStatsIntegration:
    """Test rendering_stats() end-to-end with mocked actors."""

    @patch("ops.performance._get_all_actors")
    def test_rendering_stats_counts_correctly(self, mock_actors):
        """rendering_stats returns correct counts for a simple scene."""
        sm = _make_static_mesh(tris=200, verts=150)
        mat = _make_material()
        comp = _make_sm_component(sm, [mat])
        actors = [_make_actor("Cube", sm_comps=[comp])]
        mock_actors.return_value = actors

        result = rendering_stats()
        assert result["success"] is True
        assert result["actor_count"] == 1
        assert result["total_triangles"] == 200
        assert result["total_vertices"] == 150
        assert result["static_mesh_components"] == 1
        assert result["unique_meshes"] == 1
        assert result["unique_materials"] == 1

    @patch("ops.performance._get_all_actors")
    def test_rendering_stats_skips_instanced_in_static_loop(self, mock_actors):
        """Instanced components should not be double-counted as static mesh components."""
        sm = _make_static_mesh(tris=100, verts=80)
        mat = _make_material()
        regular_comp = _make_sm_component(sm, [mat], is_instanced=False)
        instanced_comp = _make_sm_component(sm, [mat], is_instanced=True, instance_count=10)
        actors = [_make_actor("Mixed", sm_comps=[regular_comp, instanced_comp])]
        mock_actors.return_value = actors

        result = rendering_stats()
        assert result["success"] is True
        # Regular component: 1 static mesh
        assert result["static_mesh_components"] == 1
        # Instanced component: counted separately
        assert result["instanced_mesh_components"] == 1


# ---------------------------------------------------------------------------
# Integration tests: call gpu_stats() with mocked actors
# ---------------------------------------------------------------------------


class TestGpuStatsIntegration:
    """Test gpu_stats() end-to-end with mocked actors."""

    @patch("ops.performance._get_world")
    @patch("ops.performance._get_all_actors")
    def test_gpu_stats_returns_draw_call_estimate(self, mock_actors, mock_world):
        """gpu_stats returns estimated draw calls based on component counts."""
        sm = _make_static_mesh(tris=100, verts=80)
        comp = _make_sm_component(sm, [_make_material()])
        actors = [_make_actor("Cube", sm_comps=[comp])]
        mock_actors.return_value = actors
        mock_world.return_value = Mock()

        result = gpu_stats(fire_stat_commands=False)
        assert result["success"] is True
        assert result["estimated_draw_calls"] == 1
        assert result["stat_commands_fired"] == []

    @patch("ops.performance._get_world")
    @patch("ops.performance._get_all_actors")
    def test_gpu_stats_fires_stat_when_requested(self, mock_actors, mock_world):
        """gpu_stats fires stat unit only when fire_stat_commands=True."""
        mock_actors.return_value = []
        mock_world.return_value = Mock()

        result = gpu_stats(fire_stat_commands=True)
        assert result["success"] is True
        assert "stat unit" in result["stat_commands_fired"]

    @patch("ops.performance._get_world")
    @patch("ops.performance._get_all_actors")
    def test_gpu_stats_no_fire_by_default(self, mock_actors, mock_world):
        """gpu_stats does not fire stat commands by default."""
        mock_actors.return_value = []
        mock_world.return_value = Mock()

        result = gpu_stats()
        assert result["success"] is True
        assert result["stat_commands_fired"] == []


# ---------------------------------------------------------------------------
# Tests for _normalize_path
# ---------------------------------------------------------------------------


class TestNormalizePath:
    """Test UE path normalization."""

    def test_path_without_suffix_unchanged(self):
        assert _normalize_path("/Game/Meshes/SM_Cube") == "/Game/Meshes/SM_Cube"

    def test_path_with_colon_suffix_stripped(self):
        assert _normalize_path("/Game/Meshes/SM_Cube:StaticMesh") == "/Game/Meshes/SM_Cube"

    def test_path_with_multiple_colons(self):
        assert _normalize_path("/Game/SM:A:B") == "/Game/SM"

    def test_empty_path(self):
        assert _normalize_path("") == ""


# ---------------------------------------------------------------------------
# Tests for material/mesh uniqueness logic
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
