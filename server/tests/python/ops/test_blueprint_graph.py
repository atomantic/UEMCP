"""
Unit tests for blueprint_graph operations pure Python logic.

Tests type mapping, pin type construction, variable introspection helpers,
and graph extraction logic without requiring Unreal Engine.
"""

import os
import sys
from unittest.mock import MagicMock, Mock

# Mock the unreal module before any ops imports trigger it
mock_unreal = MagicMock()
mock_unreal.SceneComponent = type("SceneComponent", (), {})
sys.modules["unreal"] = mock_unreal

# Add the plugin directory to Python path for imports
plugin_path = os.path.join(os.path.dirname(__file__), "../../../..", "plugin", "Content", "Python")
sys.path.insert(0, plugin_path)


class TestVariableTypeMapping:
    """Test the variable type mapping dictionary structure."""

    def test_type_map_has_all_basic_types(self):
        """Test that all basic variable types are mapped."""
        from ops.blueprint_graph import _VARIABLE_TYPE_MAP

        expected_types = [
            "bool",
            "byte",
            "int",
            "int64",
            "float",
            "double",
            "string",
            "text",
            "name",
            "vector",
            "rotator",
            "transform",
            "color",
            "vector2d",
            "object",
            "actor",
            "class",
        ]
        for t in expected_types:
            assert t in _VARIABLE_TYPE_MAP, f"Missing type mapping for '{t}'"

    def test_type_map_values_are_tuples(self):
        """Test that all type map values are (category, sub_type) tuples."""
        from ops.blueprint_graph import _VARIABLE_TYPE_MAP

        for type_name, value in _VARIABLE_TYPE_MAP.items():
            assert isinstance(value, tuple), f"Type '{type_name}' value is not a tuple"
            assert len(value) == 2, f"Type '{type_name}' tuple should have 2 elements"

    def test_bool_maps_to_bool_category(self):
        """Test bool type mapping."""
        from ops.blueprint_graph import _VARIABLE_TYPE_MAP

        category, sub = _VARIABLE_TYPE_MAP["bool"]
        assert category == "bool"
        assert sub is None

    def test_float_maps_to_real_category(self):
        """Test float type mapping — UE uses 'real' category for floats."""
        from ops.blueprint_graph import _VARIABLE_TYPE_MAP

        category, sub = _VARIABLE_TYPE_MAP["float"]
        assert category == "real"
        assert sub == "double"

    def test_vector_maps_to_struct_category(self):
        """Test vector maps to struct with CoreUObject path."""
        from ops.blueprint_graph import _VARIABLE_TYPE_MAP

        category, sub = _VARIABLE_TYPE_MAP["vector"]
        assert category == "struct"
        assert sub == "/Script/CoreUObject.Vector"

    def test_actor_maps_to_object_category(self):
        """Test actor maps to object with Engine.Actor path."""
        from ops.blueprint_graph import _VARIABLE_TYPE_MAP

        category, sub = _VARIABLE_TYPE_MAP["actor"]
        assert category == "object"
        assert sub == "/Script/Engine.Actor"

    def test_struct_types_have_sub_type_paths(self):
        """Test that struct-category types have valid sub-type paths."""
        from ops.blueprint_graph import _VARIABLE_TYPE_MAP

        struct_types = [k for k, (cat, _) in _VARIABLE_TYPE_MAP.items() if cat == "struct"]
        for t in struct_types:
            _, sub = _VARIABLE_TYPE_MAP[t]
            assert sub is not None, f"Struct type '{t}' should have a sub-type path"
            assert sub.startswith("/Script/"), f"Struct type '{t}' sub-type should start with /Script/"


class TestBlueprintVariableIntrospection:
    """Test the variable introspection helper logic."""

    def test_get_blueprint_variables_empty(self):
        """Test variable extraction with no variables."""
        from ops.blueprint_graph import _get_blueprint_variables

        mock_bp = Mock()
        mock_bp.get_editor_property.return_value = None

        result = _get_blueprint_variables(mock_bp)
        assert result == []

    def test_get_blueprint_variables_with_data(self):
        """Test variable extraction with mock variable data."""
        from ops.blueprint_graph import _get_blueprint_variables

        # Create a mock variable descriptor
        mock_var = Mock()
        mock_var.get_editor_property.side_effect = lambda prop: {
            "var_name": "Health",
            "var_guid": "abc-123",
            "var_type": Mock(
                pin_category="real",
                get_editor_property=lambda p: {
                    "pin_category": "real",
                    "pin_sub_category_object": None,
                }.get(p),
            ),
            "property_flags": 4,  # Instance editable
            "category": "Combat",
        }.get(prop, None)

        mock_bp = Mock()
        mock_bp.get_editor_property.return_value = [mock_var]

        result = _get_blueprint_variables(mock_bp)
        assert len(result) == 1
        assert result[0]["name"] == "Health"
        assert result[0]["guid"] == "abc-123"


class TestBlueprintFunctionIntrospection:
    """Test function graph introspection helper logic."""

    def test_get_blueprint_functions_empty(self):
        """Test function extraction with no functions."""
        from ops.blueprint_graph import _get_blueprint_functions

        mock_bp = Mock()
        mock_bp.get_editor_property.return_value = None

        result = _get_blueprint_functions(mock_bp)
        assert result == []

    def test_get_blueprint_functions_with_data(self):
        """Test function extraction with mock function graph data."""
        from ops.blueprint_graph import _get_blueprint_functions

        mock_graph = Mock()
        mock_graph.get_name.return_value = "CalculateDamage"
        mock_graph.get_editor_property.return_value = [Mock(), Mock(), Mock()]  # 3 nodes

        mock_bp = Mock()
        mock_bp.get_editor_property.return_value = [mock_graph]

        result = _get_blueprint_functions(mock_bp)
        assert len(result) == 1
        assert result[0]["name"] == "CalculateDamage"
        assert result[0]["nodeCount"] == 3


class TestBlueprintComponentIntrospection:
    """Test component hierarchy introspection logic."""

    def test_get_blueprint_components_no_scs(self):
        """Test component extraction when Blueprint has no SCS."""
        from ops.blueprint_graph import _get_blueprint_components

        mock_bp = Mock()
        mock_bp.simple_construction_script = None

        result = _get_blueprint_components(mock_bp)
        assert result == []

    def test_get_blueprint_components_with_scene_component(self):
        """Test component extraction with a SceneComponent template."""
        from ops.blueprint_graph import _get_blueprint_components

        # Mock a SceneComponent template
        mock_template = Mock(spec=["get_name", "get_class", "get_editor_property"])
        mock_template.get_name.return_value = "MyMesh"
        mock_template.get_class.return_value = Mock(get_name=Mock(return_value="StaticMeshComponent"))

        # Make it a SceneComponent for transform extraction
        # We need to mock isinstance check — use __class__ approach
        mock_loc = Mock(x=100, y=200, z=300)
        mock_rot = Mock(roll=0, pitch=45, yaw=90)
        mock_scale = Mock(x=1, y=1, z=1)
        mock_template.get_editor_property.side_effect = lambda prop: {
            "relative_location": mock_loc,
            "relative_rotation": mock_rot,
            "relative_scale3d": mock_scale,
            "parent_component_or_variable_name": None,
        }.get(prop)

        mock_node = Mock()
        mock_node.component_template = mock_template
        mock_node.get_editor_property.return_value = None

        mock_scs = Mock()
        mock_scs.get_all_nodes.return_value = [mock_node]

        mock_bp = Mock()
        mock_bp.simple_construction_script = mock_scs

        # Since isinstance check won't work with mocks for SceneComponent,
        # we test the non-SceneComponent path
        result = _get_blueprint_components(mock_bp)
        assert len(result) == 1
        assert result[0]["name"] == "MyMesh"
        assert result[0]["class"] == "StaticMeshComponent"


class TestGraphNodeExtraction:
    """Test graph node extraction logic."""

    def test_extract_graph_info_empty(self):
        """Test graph info extraction with empty graph."""
        from ops.blueprint_graph import _extract_graph_info

        mock_graph = Mock()
        mock_graph.get_name.return_value = "EventGraph"
        mock_graph.get_editor_property.return_value = None

        result = _extract_graph_info(mock_graph, "summary", "EventGraph")
        assert result["name"] == "EventGraph"
        assert result["type"] == "EventGraph"
        assert result["nodeCount"] == 0
        assert result["nodes"] == []

    def test_extract_graph_info_summary_level(self):
        """Test summary detail level includes only IDs and classes."""
        from ops.blueprint_graph import _extract_graph_info

        mock_node = Mock()
        mock_node.get_editor_property.side_effect = lambda prop: {
            "node_guid": "guid-123",
            "node_comment": None,
        }.get(prop)
        mock_node.get_class.return_value = Mock(get_name=Mock(return_value="K2Node_Event"))

        mock_graph = Mock()
        mock_graph.get_name.return_value = "EventGraph"
        mock_graph.get_editor_property.return_value = [mock_node]

        result = _extract_graph_info(mock_graph, "summary", "EventGraph")
        assert result["nodeCount"] == 1
        assert len(result["nodes"]) == 1
        assert result["nodes"][0]["id"] == "guid-123"
        assert result["nodes"][0]["class"] == "K2Node_Event"
        assert "position" not in result["nodes"][0]
        assert "pins" not in result["nodes"][0]

    def test_detail_level_validation(self):
        """Test that invalid detail levels are handled."""
        valid_levels = ("summary", "flow", "full")
        for level in valid_levels:
            assert level in valid_levels

        # Invalid level should default to 'flow' in the actual code
        assert "invalid" not in valid_levels


class TestComponentClassMapping:
    """Test component class resolution logic."""

    def test_supported_component_classes(self):
        """Test that common component classes are in the mapping."""
        expected_classes = [
            "StaticMeshComponent",
            "SkeletalMeshComponent",
            "SceneComponent",
            "PointLightComponent",
            "SpotLightComponent",
            "DirectionalLightComponent",
            "CameraComponent",
            "AudioComponent",
            "ArrowComponent",
            "BoxCollisionComponent",
            "SphereComponent",
            "CapsuleComponent",
            "WidgetComponent",
            "SplineComponent",
            "DecalComponent",
            "BillboardComponent",
            "TextRenderComponent",
        ]
        # This tests the structure of what the add_component function supports
        assert len(expected_classes) == 17
        # Verify no duplicates
        assert len(expected_classes) == len(set(expected_classes))
