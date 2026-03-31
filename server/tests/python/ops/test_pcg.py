"""
Unit tests for PCG (Procedural Content Generation) operations.

Tests constants and pure Python helpers without requiring Unreal Engine.
The unreal mock must include PCGGraphInterface so the import guard passes.
"""

import os
import sys
from unittest.mock import MagicMock

if "unreal" not in sys.modules:
    mock_unreal = MagicMock()
    sys.modules["unreal"] = mock_unreal
else:
    mock_unreal = sys.modules["unreal"]

# Satisfy the import guard: unreal.PCGGraphInterface must exist
mock_unreal.PCGGraphInterface = type("PCGGraphInterface", (), {})

plugin_path = os.path.join(os.path.dirname(__file__), "../../../..", "plugin", "Content", "Python")
sys.path.insert(0, plugin_path)


class TestBuiltInTemplates:
    """Test _BUILT_IN_TEMPLATES constant."""

    def test_is_dict(self):
        from ops.pcg import _BUILT_IN_TEMPLATES

        assert isinstance(_BUILT_IN_TEMPLATES, dict)

    def test_has_expected_templates(self):
        from ops.pcg import _BUILT_IN_TEMPLATES

        for name in ("scatter", "spline", "grid", "biome"):
            assert name in _BUILT_IN_TEMPLATES, f"Missing template: {name}"

    def test_values_are_strings(self):
        from ops.pcg import _BUILT_IN_TEMPLATES

        for key, value in _BUILT_IN_TEMPLATES.items():
            assert isinstance(value, str), f"Description for '{key}' should be str"

    def test_keys_are_lowercase(self):
        from ops.pcg import _BUILT_IN_TEMPLATES

        for key in _BUILT_IN_TEMPLATES:
            assert key == key.lower(), f"Template key should be lowercase: {key}"


class TestCommonNodeTypes:
    """Test _COMMON_NODE_TYPES constant."""

    def test_is_dict(self):
        from ops.pcg import _COMMON_NODE_TYPES

        assert isinstance(_COMMON_NODE_TYPES, dict)

    def test_has_surface_sampler(self):
        from ops.pcg import _COMMON_NODE_TYPES

        assert "SurfaceSampler" in _COMMON_NODE_TYPES
        assert _COMMON_NODE_TYPES["SurfaceSampler"] == "PCGSurfaceSamplerSettings"

    def test_has_static_mesh_spawner(self):
        from ops.pcg import _COMMON_NODE_TYPES

        assert "StaticMeshSpawner" in _COMMON_NODE_TYPES

    def test_has_boolean_ops(self):
        from ops.pcg import _COMMON_NODE_TYPES

        for op in ("Difference", "Union", "Intersection"):
            assert op in _COMMON_NODE_TYPES, f"Missing boolean op: {op}"

    def test_has_filter_ops(self):
        from ops.pcg import _COMMON_NODE_TYPES

        for op in ("DensityFilter", "PointFilter", "DistanceFilter"):
            assert op in _COMMON_NODE_TYPES, f"Missing filter op: {op}"

    def test_has_subgraph_io(self):
        from ops.pcg import _COMMON_NODE_TYPES

        assert "SubgraphInput" in _COMMON_NODE_TYPES
        assert "SubgraphOutput" in _COMMON_NODE_TYPES

    def test_values_are_strings(self):
        from ops.pcg import _COMMON_NODE_TYPES

        for _key, value in _COMMON_NODE_TYPES.items():
            assert isinstance(value, str)


class TestFindNodeById:
    """Test _find_node_by_id helper."""

    def _make_node(self, guid_str):
        node = MagicMock()
        node.get_editor_property.return_value = guid_str
        return node

    def test_finds_matching_node(self):
        from ops.pcg import _find_node_by_id

        node_a = self._make_node("abc-123")
        node_b = self._make_node("def-456")
        graph = MagicMock()
        graph.get_nodes.return_value = [node_a, node_b]
        result = _find_node_by_id(graph, "abc-123")
        assert result is node_a

    def test_returns_none_when_not_found(self):
        from ops.pcg import _find_node_by_id

        node = self._make_node("abc-123")
        graph = MagicMock()
        graph.get_nodes.return_value = [node]
        result = _find_node_by_id(graph, "not-found")
        assert result is None

    def test_empty_graph_returns_none(self):
        from ops.pcg import _find_node_by_id

        graph = MagicMock()
        graph.get_nodes.return_value = []
        result = _find_node_by_id(graph, "any-id")
        assert result is None

    def test_second_node_found(self):
        from ops.pcg import _find_node_by_id

        nodes = [self._make_node(f"id-{i}") for i in range(5)]
        graph = MagicMock()
        graph.get_nodes.return_value = nodes
        result = _find_node_by_id(graph, "id-4")
        assert result is nodes[4]


class TestResolveNodeSettingsClass:
    """Test _resolve_node_settings_class helper."""

    def test_known_type_resolves_settings_name(self):
        from ops.pcg import _COMMON_NODE_TYPES, _resolve_node_settings_class

        # All entries in _COMMON_NODE_TYPES should resolve to the mapped name on unreal
        for node_type, expected_settings_name in _COMMON_NODE_TYPES.items():
            sentinel = object()
            setattr(mock_unreal, expected_settings_name, sentinel)
            result = _resolve_node_settings_class(node_type)
            assert result is sentinel, (
                f"_resolve_node_settings_class('{node_type}') should return " f"unreal.{expected_settings_name}"
            )

    def test_returns_value_from_unreal_for_known_type(self):
        from ops.pcg import _resolve_node_settings_class

        sentinel = object()
        mock_unreal.PCGSurfaceSamplerSettings = sentinel
        result = _resolve_node_settings_class("SurfaceSampler")
        assert result is sentinel
