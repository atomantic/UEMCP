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
        """Test component extraction with a SceneComponent template, including transforms."""
        from ops.blueprint_graph import _get_blueprint_components

        # Create a mock template that passes isinstance(template, unreal.SceneComponent)
        # by making it an instance of the mocked SceneComponent class
        SceneComp = mock_unreal.SceneComponent

        class MockSceneTemplate(SceneComp):
            pass

        mock_template = MockSceneTemplate()
        mock_template.get_name = Mock(return_value="MyMesh")
        mock_template.get_class = Mock(return_value=Mock(get_name=Mock(return_value="StaticMeshComponent")))

        mock_loc = Mock(x=100, y=200, z=300)
        mock_rot = Mock(roll=0, pitch=45, yaw=90)
        mock_scale = Mock(x=1, y=1, z=1)
        mock_template.get_editor_property = Mock(
            side_effect=lambda prop: {
                "relative_location": mock_loc,
                "relative_rotation": mock_rot,
                "relative_scale3d": mock_scale,
                "parent_component_or_variable_name": None,
            }.get(prop)
        )

        mock_node = Mock()
        mock_node.component_template = mock_template
        mock_node.get_editor_property.return_value = None

        mock_scs = Mock()
        mock_scs.get_all_nodes.return_value = [mock_node]

        mock_bp = Mock()
        mock_bp.simple_construction_script = mock_scs

        result = _get_blueprint_components(mock_bp)
        assert len(result) == 1
        assert result[0]["name"] == "MyMesh"
        assert result[0]["class"] == "StaticMeshComponent"
        # Verify transform extraction (SceneComponent branch)
        assert result[0]["location"] == [100, 200, 300]
        assert result[0]["rotation"] == [0, 45, 90]
        assert result[0]["scale"] == [1, 1, 1]


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
        """Test that the detail_level parameter defaults to 'flow'."""
        import inspect

        from ops.blueprint_graph import get_graph

        # Inspect the get_graph signature to verify default
        sig = inspect.signature(get_graph)
        detail_param = sig.parameters.get("detail_level")

        assert detail_param is not None, "get_graph should accept a 'detail_level' parameter"
        assert detail_param.default == "flow", "The default detail_level should be 'flow'"


class TestComponentClassMapping:
    """Test component class resolution logic."""

    def test_supported_component_classes(self):
        """Test that the production SUPPORTED_COMPONENT_CLASSES constant has expected entries."""
        from ops.blueprint_graph import SUPPORTED_COMPONENT_CLASSES

        expected_classes = {
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
        }

        assert set(SUPPORTED_COMPONENT_CLASSES) == expected_classes

        # Verify no duplicates in the production constant
        assert len(SUPPORTED_COMPONENT_CLASSES) == len(set(SUPPORTED_COMPONENT_CLASSES))


class TestActionDiscovery:
    """Test blueprint action discovery helpers."""

    def test_common_events_structure(self):
        """Test that common events have required fields."""
        from ops.blueprint_graph import _COMMON_EVENTS

        assert len(_COMMON_EVENTS) > 0
        for event in _COMMON_EVENTS:
            assert "name" in event, f"Event missing 'name': {event}"
            assert "nodeType" in event, f"Event missing 'nodeType': {event}"
            assert event["nodeType"] == "Event"
            assert "category" in event
            assert event["category"] == "events"
            assert "description" in event

    def test_flow_nodes_structure(self):
        """Test that flow nodes have required fields."""
        from ops.blueprint_graph import _FLOW_NODES

        assert len(_FLOW_NODES) > 0
        for node in _FLOW_NODES:
            assert "name" in node, f"Flow node missing 'name': {node}"
            assert "nodeType" in node, f"Flow node missing 'nodeType': {node}"
            assert "category" in node
            assert node["category"] == "flow"
            assert "description" in node

    def test_flow_nodes_include_key_types(self):
        """Test that essential flow nodes are present."""
        from ops.blueprint_graph import _FLOW_NODES

        names = {n["name"] for n in _FLOW_NODES}
        assert "Branch" in names
        assert "Sequence" in names
        assert "ForEachLoop" in names
        assert "Delay" in names

    def test_common_events_include_key_events(self):
        """Test that essential events are present."""
        from ops.blueprint_graph import _COMMON_EVENTS

        names = {e["name"] for e in _COMMON_EVENTS}
        assert "BeginPlay" in names
        assert "Tick" in names
        assert "EndPlay" in names

    def test_function_library_names_not_empty(self):
        """Test that function library list is populated."""
        from ops.blueprint_graph import _FUNCTION_LIBRARY_NAMES

        assert len(_FUNCTION_LIBRARY_NAMES) > 5

    def test_library_category_map_covers_all_libraries(self):
        """Test that every library name has a category mapping."""
        from ops.blueprint_graph import _FUNCTION_LIBRARY_NAMES, _LIBRARY_CATEGORY_MAP

        for lib in _FUNCTION_LIBRARY_NAMES:
            assert lib in _LIBRARY_CATEGORY_MAP, f"Library '{lib}' missing from category map"

    def test_extract_method_info_non_callable(self):
        """Test _extract_method_info returns None for non-callable."""
        from ops.blueprint_graph import _extract_method_info

        class FakeClass:
            some_attr = 42

        result = _extract_method_info(FakeClass, "some_attr", "FakeClass")
        assert result is None

    def test_extract_method_info_callable(self):
        """Test _extract_method_info extracts lightweight info from a method."""
        from ops.blueprint_graph import _extract_method_info

        class FakeClass:
            @staticmethod
            def do_something(target: str, amount: float = 1.0):
                """Do something useful."""
                pass

        result = _extract_method_info(FakeClass, "do_something", "FakeClass", category="math")
        assert result is not None
        assert result["name"] == "do_something"
        assert result["functionName"] == "FakeClass.do_something"
        assert result["className"] == "FakeClass"
        assert result["category"] == "math"
        assert result["description"] == "Do something useful."
        # Parameters are deferred — not included in lightweight extraction
        assert "parameters" not in result

    def test_extract_method_info_with_pre_fetched_attr(self):
        """Test _extract_method_info accepts pre-fetched attribute."""
        from ops.blueprint_graph import _extract_method_info

        class FakeClass:
            @staticmethod
            def my_func():
                """A function."""
                pass

        attr = FakeClass.my_func
        result = _extract_method_info(FakeClass, "my_func", "Fake", attr=attr)
        assert result is not None
        assert result["name"] == "my_func"

    def test_valid_library_categories_derived(self):
        """Test _VALID_LIBRARY_CATEGORIES is derived from _LIBRARY_CATEGORY_MAP."""
        from ops.blueprint_graph import _LIBRARY_CATEGORY_MAP, _VALID_LIBRARY_CATEGORIES

        for cat in _LIBRARY_CATEGORY_MAP.values():
            assert cat in _VALID_LIBRARY_CATEGORIES
        assert None in _VALID_LIBRARY_CATEGORIES
        assert "all" in _VALID_LIBRARY_CATEGORIES

    def test_extract_method_info_missing_method(self):
        """Test _extract_method_info returns None for missing method."""
        from ops.blueprint_graph import _extract_method_info

        class FakeClass:
            pass

        result = _extract_method_info(FakeClass, "nonexistent", "FakeClass")
        assert result is None

    def test_discover_class_actions_unknown_class(self, monkeypatch):
        """Test _discover_class_actions returns empty for unknown class."""
        from ops.blueprint_graph import _discover_class_actions

        # MagicMock auto-creates attrs; explicitly set to None to simulate missing class
        monkeypatch.setattr(mock_unreal, "NonExistentClass12345", None)
        result = _discover_class_actions("NonExistentClass12345")
        assert result == []

    def test_discover_class_actions_with_mock(self, monkeypatch):
        """Test _discover_class_actions discovers methods on a mocked UE class."""
        from ops.blueprint_graph import _discover_class_actions

        # Add a mock class to the unreal module
        mock_cls = type(
            "TestActor",
            (),
            {
                "get_name": lambda self: "test",
                "do_action": lambda self, target: None,
                "_private": lambda self: None,
            },
        )
        monkeypatch.setattr(mock_unreal, "TestActor", mock_cls)

        result = _discover_class_actions("TestActor")
        names = [a["name"] for a in result]
        assert "get_name" in names
        assert "do_action" in names
        assert "_private" not in names
        for action in result:
            assert action["category"] == "class"
            assert action["nodeType"] == "CallFunction"

    def test_discover_library_actions_deduplicates(self, monkeypatch):
        """Test that library discovery deduplicates alias classes."""
        from ops.blueprint_graph import _discover_library_actions

        # Make two library names point to the same mock class
        mock_lib = type(
            "MockMathLib",
            (),
            {
                "add": lambda a, b: a + b,
            },
        )()
        monkeypatch.setattr(mock_unreal, "KismetMathLibrary", mock_lib)
        monkeypatch.setattr(mock_unreal, "MathLibrary", mock_lib)

        result = _discover_library_actions()
        # Should only include "add" once since both names point to same id()
        add_entries = [a for a in result if a["name"] == "add"]
        assert len(add_entries) == 1

    def test_discover_actions_signature(self):
        """Test discover_actions function signature has correct defaults."""
        import inspect

        from ops.blueprint_graph import discover_actions

        sig = inspect.signature(discover_actions)

        assert "blueprint_path" in sig.parameters
        assert sig.parameters["blueprint_path"].default is None

        assert "class_name" in sig.parameters
        assert sig.parameters["class_name"].default is None

        assert "search" in sig.parameters
        assert sig.parameters["search"].default is None

        assert "category" in sig.parameters
        assert sig.parameters["category"].default is None

        assert "limit" in sig.parameters
        assert sig.parameters["limit"].default == 50

    def test_discover_actions_invalid_category_returns_error(self):
        """Test discover_actions returns error dict for invalid category."""
        from ops.blueprint_graph import discover_actions

        result = discover_actions(category="bogus")
        assert result["success"] is False
        assert "Invalid category 'bogus'" in result["error"]
        assert "category" in result.get("details", {}).get("field", "")
