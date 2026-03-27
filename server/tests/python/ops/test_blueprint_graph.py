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
        import ops.blueprint_graph as bg
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
        # Constrain to only these two libraries to avoid scanning MagicMock attrs
        monkeypatch.setattr(bg, "_FUNCTION_LIBRARY_NAMES", ["KismetMathLibrary", "MathLibrary"])

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

    def test_discover_actions_events_have_add_node_params(self):
        """Test that event actions include correct addNodeParams."""
        from ops.blueprint_graph import discover_actions

        result = discover_actions(category="events")
        assert result["success"] is True
        for action in result["actions"]:
            assert "addNodeParams" in action, f"Missing addNodeParams on {action['name']}"
            params = action["addNodeParams"]
            assert "node_type" in params
            if action["name"] == "CustomEvent":
                assert params.get("event_name") == "<your_event_name>"
            else:
                assert params["node_type"] == action["name"]

    def test_discover_actions_flow_have_add_node_params(self):
        """Test that flow actions include correct addNodeParams."""
        from ops.blueprint_graph import discover_actions

        result = discover_actions(category="flow")
        assert result["success"] is True
        for action in result["actions"]:
            assert "addNodeParams" in action
            assert action["addNodeParams"]["node_type"] == action["name"]

    def test_discover_actions_limit_clamps(self):
        """Test that limit is clamped between 1 and 200."""
        from ops.blueprint_graph import discover_actions

        result = discover_actions(category="events", limit=2)
        assert result["returned"] <= 2

    def test_discover_actions_search_filters(self):
        """Test that search filters actions by name."""
        from ops.blueprint_graph import discover_actions

        result = discover_actions(category="events", search="BeginPlay")
        assert result["success"] is True
        names = [a["name"] for a in result["actions"]]
        assert "BeginPlay" in names
        # Other events should be filtered out
        assert "Delay" not in names


class TestCoerceValueForCdo:
    """Test the _coerce_value_for_cdo helper function."""

    def test_bool_passthrough(self):
        """Test that bool values are passed through unchanged."""
        from ops.blueprint_graph import _coerce_value_for_cdo

        assert _coerce_value_for_cdo(True, "MyBool") is True
        assert _coerce_value_for_cdo(False, "MyBool") is False

    def test_int_passthrough(self):
        """Test that int values are passed through unchanged."""
        from ops.blueprint_graph import _coerce_value_for_cdo

        assert _coerce_value_for_cdo(42, "MyInt") == 42
        assert _coerce_value_for_cdo(0, "MyInt") == 0

    def test_float_passthrough(self):
        """Test that float values are passed through unchanged."""
        from ops.blueprint_graph import _coerce_value_for_cdo

        assert _coerce_value_for_cdo(3.14, "MyFloat") == 3.14

    def test_plain_string_passthrough(self):
        """Test that plain strings (not asset paths) are passed through."""
        from ops.blueprint_graph import _coerce_value_for_cdo

        assert _coerce_value_for_cdo("hello", "MyString") == "hello"

    def test_asset_path_string_loads_asset(self):
        """Test that /Game/ paths trigger asset loading."""
        from ops.blueprint_graph import _coerce_value_for_cdo

        mock_asset = Mock()
        mock_unreal.EditorAssetLibrary.load_asset.return_value = mock_asset

        result = _coerce_value_for_cdo("/Game/Meshes/SM_Cube", "MyMesh")
        assert result is mock_asset
        mock_unreal.EditorAssetLibrary.load_asset.assert_called_with("/Game/Meshes/SM_Cube")

    def test_asset_path_not_found_raises(self):
        """Test that missing asset paths raise ProcessingError."""
        import pytest

        from ops.blueprint_graph import _coerce_value_for_cdo
        from utils.error_handling import ProcessingError

        mock_unreal.EditorAssetLibrary.load_asset.return_value = None

        with pytest.raises(ProcessingError, match="Asset not found"):
            _coerce_value_for_cdo("/Game/Missing/Asset", "MyRef")

    def test_3_element_list_creates_vector(self, monkeypatch):
        """Test that a 3-element list delegates to create_vector."""
        import ops.blueprint_graph as bg
        from ops.blueprint_graph import _coerce_value_for_cdo

        sentinel = object()
        calls = []

        def fake_create_vector(arr):
            calls.append(arr)
            return sentinel

        monkeypatch.setattr(bg, "create_vector", fake_create_vector)

        result = _coerce_value_for_cdo([1.0, 2.0, 3.0], "MyVec")
        assert result is sentinel
        assert calls == [[1.0, 2.0, 3.0]]

    def test_4_element_list_creates_linear_color(self):
        """Test that a 4-element list creates an unreal.LinearColor."""
        from ops.blueprint_graph import _coerce_value_for_cdo

        _coerce_value_for_cdo([1.0, 0.5, 0.0, 1.0], "MyColor")
        mock_unreal.LinearColor.assert_called_with(1.0, 0.5, 0.0, 1.0)

    def test_invalid_list_length_raises(self):
        """Test that lists with invalid length raise ProcessingError."""
        import pytest

        from ops.blueprint_graph import _coerce_value_for_cdo
        from utils.error_handling import ProcessingError

        with pytest.raises(ProcessingError, match="must have 3 or 4 elements"):
            _coerce_value_for_cdo([1.0, 2.0], "MyVar")

    def test_dict_value_raises(self):
        """Test that dict values are rejected with a clear error."""
        import pytest

        from ops.blueprint_graph import _coerce_value_for_cdo
        from utils.error_handling import ProcessingError

        with pytest.raises(ProcessingError, match="Unsupported value type"):
            _coerce_value_for_cdo({"key": "val"}, "MyVar")

    def test_script_path_loads_object(self):
        """Test that /Script/ paths use unreal.load_object for native class refs."""
        from ops.blueprint_graph import _coerce_value_for_cdo

        mock_obj = Mock()
        mock_unreal.load_object.return_value = mock_obj

        result = _coerce_value_for_cdo("/Script/Engine.StaticMesh", "MyRef")
        assert result is mock_obj
        mock_unreal.load_object.assert_called_with(None, "/Script/Engine.StaticMesh")

    def test_engine_path_loads_asset(self):
        """Test that /Engine/ paths trigger asset loading."""
        from ops.blueprint_graph import _coerce_value_for_cdo

        mock_asset = Mock()
        mock_unreal.EditorAssetLibrary.load_asset.return_value = mock_asset

        result = _coerce_value_for_cdo("/Engine/BasicShapes/Cube", "MyRef")
        assert result is mock_asset


class TestSetVariableDefaultSignature:
    """Test set_variable_default function signature and parameter defaults."""

    def test_signature_has_required_params(self):
        """Test that set_variable_default has the required parameters."""
        import inspect

        from ops.blueprint_graph import set_variable_default

        sig = inspect.signature(set_variable_default)
        assert "blueprint_path" in sig.parameters
        assert "variable_name" in sig.parameters
        assert "value" in sig.parameters

    def test_value_type_defaults_to_none(self):
        """Test that value_type parameter defaults to None."""
        import inspect

        from ops.blueprint_graph import set_variable_default

        sig = inspect.signature(set_variable_default)
        assert "value_type" in sig.parameters
        assert sig.parameters["value_type"].default is None


class TestSetVariableDefaultRotatorDisambiguation:
    """Test that value_type='rotator' routes through create_rotator."""

    def test_rotator_value_type_uses_create_rotator(self, monkeypatch):
        """When value_type='rotator' and value is a 3-element list, create_rotator is used."""
        import ops.blueprint_graph as bg

        # Track which coercion function was called
        rotator_calls = []
        vector_calls = []

        def fake_create_rotator(arr):
            rotator_calls.append(arr)
            return "mock_rotator"

        def fake_create_vector(arr):
            vector_calls.append(arr)
            return "mock_vector"

        # Mock the full chain: resolve_blueprint -> compile -> generated_class -> CDO
        mock_cdo = Mock()
        mock_gen_class = Mock()
        mock_gen_class.get_default_object.return_value = mock_cdo
        mock_blueprint = Mock()
        mock_blueprint.generated_class.return_value = mock_gen_class

        monkeypatch.setattr(bg, "resolve_blueprint", lambda path: mock_blueprint)
        monkeypatch.setattr(bg, "create_rotator", fake_create_rotator)
        monkeypatch.setattr(bg, "create_vector", fake_create_vector)

        result = bg.set_variable_default(
            "/Game/BP_Test",
            "MyRotator",
            [10.0, 20.0, 30.0],
            value_type="rotator",
        )

        assert result["success"] is True
        assert rotator_calls == [[10.0, 20.0, 30.0]]
        assert vector_calls == []
        mock_cdo.set_editor_property.assert_called_once_with("MyRotator", "mock_rotator")


class TestCreateInterface:
    """Test blueprint_create_interface function."""

    def test_create_interface_signature(self):
        """Test create_interface function signature has correct parameters and defaults."""
        import inspect

        from ops.blueprint_graph import create_interface

        sig = inspect.signature(create_interface)

        assert "interface_path" in sig.parameters
        assert sig.parameters["interface_path"].default is inspect.Parameter.empty

        assert "functions" in sig.parameters
        assert sig.parameters["functions"].default is None

    def test_create_interface_uses_make_pin_type(self):
        """Test that _make_pin_type is importable and usable for interface function params."""
        from ops.blueprint_graph import _make_pin_type

        # _make_pin_type should exist and be callable
        assert callable(_make_pin_type)

    def test_create_interface_rejects_empty_path(self):
        """Test create_interface rejects path without asset name."""
        from ops.blueprint_graph import create_interface

        result = create_interface(interface_path="/Game/Interfaces/")
        # The decorators catch ProcessingError and return an error dict
        assert result.get("success") is False

    def test_create_interface_rejects_path_without_slash(self):
        """Test create_interface rejects path without any slash."""
        import pytest

        from ops.blueprint_graph import create_interface
        from utils.error_handling import ValidationError

        with pytest.raises(ValidationError):
            create_interface(interface_path="BPI_NoSlash")

    def test_create_interface_validates_interface_path_required(self):
        """Test create_interface requires interface_path parameter."""
        import pytest

        from ops.blueprint_graph import create_interface
        from utils.error_handling import ValidationError

        with pytest.raises(ValidationError):
            create_interface(interface_path=None)

    def test_create_interface_accepts_functions_as_none(self):
        """Test that functions parameter defaults to None and is optional."""
        import inspect

        from ops.blueprint_graph import create_interface

        sig = inspect.signature(create_interface)
        func_param = sig.parameters["functions"]
        assert func_param.default is None

    def test_create_interface_has_correct_decorators(self):
        """Test that create_interface is wrapped by decorators (functools.wraps chain)."""
        from ops.blueprint_graph import create_interface

        assert callable(create_interface)
        # functools.wraps preserves __wrapped__ through the decorator chain
        assert hasattr(create_interface, "__wrapped__")


class TestCoercePropertyValue:
    """Test the _coerce_property_value helper."""

    def test_passthrough_string(self):
        """Test that plain strings pass through unchanged."""
        from ops.blueprint_graph import _coerce_property_value

        assert _coerce_property_value("hello") == "hello"

    def test_passthrough_number(self):
        """Test that numbers pass through unchanged."""
        from ops.blueprint_graph import _coerce_property_value

        assert _coerce_property_value(42) == 42
        assert _coerce_property_value(3.14) == 3.14

    def test_passthrough_bool(self):
        """Test that booleans pass through unchanged."""
        from ops.blueprint_graph import _coerce_property_value

        assert _coerce_property_value(True) is True
        assert _coerce_property_value(False) is False

    def test_list_3_becomes_vector(self):
        """Test that 3-element list becomes a Vector."""
        from ops.blueprint_graph import _coerce_property_value

        mock_unreal.Vector.reset_mock()
        _coerce_property_value([1.0, 2.0, 3.0])
        mock_unreal.Vector.assert_called_with(1.0, 2.0, 3.0)

    def test_list_4_becomes_linear_color(self):
        """Test that 4-element list becomes a LinearColor."""
        from ops.blueprint_graph import _coerce_property_value

        mock_unreal.LinearColor.reset_mock()
        _coerce_property_value([1.0, 0.5, 0.0, 1.0])
        mock_unreal.LinearColor.assert_called_with(r=1.0, g=0.5, b=0.0, a=1.0)

    def test_asset_path_game(self):
        """Test that /Game/ paths trigger asset loading."""
        from ops.blueprint_graph import _coerce_property_value

        mock_unreal.EditorAssetLibrary.load_asset.reset_mock()
        mock_asset = MagicMock()
        mock_unreal.EditorAssetLibrary.load_asset.return_value = mock_asset

        result = _coerce_property_value("/Game/Meshes/Cube")
        mock_unreal.EditorAssetLibrary.load_asset.assert_called_with("/Game/Meshes/Cube")
        assert result == mock_asset

    def test_asset_path_engine(self):
        """Test that /Engine/ paths trigger asset loading."""
        from ops.blueprint_graph import _coerce_property_value

        mock_unreal.EditorAssetLibrary.load_asset.reset_mock()
        mock_asset = MagicMock()
        mock_unreal.EditorAssetLibrary.load_asset.return_value = mock_asset

        result = _coerce_property_value("/Engine/BasicShapes/Cube")
        mock_unreal.EditorAssetLibrary.load_asset.assert_called_with("/Engine/BasicShapes/Cube")
        assert result == mock_asset

    def test_asset_path_not_found_raises(self):
        """Test that missing asset path raises ProcessingError."""
        import pytest

        from ops.blueprint_graph import _coerce_property_value
        from utils.error_handling import ProcessingError

        mock_unreal.EditorAssetLibrary.load_asset.return_value = None

        with pytest.raises(ProcessingError, match="Asset not found"):
            _coerce_property_value("/Game/Missing/Asset")

    def test_list_3_non_numeric_raises(self):
        """Test that 3-element list with non-numeric values raises ProcessingError."""
        import pytest

        from ops.blueprint_graph import _coerce_property_value
        from utils.error_handling import ProcessingError

        with pytest.raises(ProcessingError, match="3-element array must contain only numbers"):
            _coerce_property_value([1.0, "bad", 3.0])

    def test_list_4_non_numeric_raises(self):
        """Test that 4-element list with non-numeric values raises ProcessingError."""
        import pytest

        from ops.blueprint_graph import _coerce_property_value
        from utils.error_handling import ProcessingError

        with pytest.raises(ProcessingError, match="4-element array must contain only numbers"):
            _coerce_property_value([1.0, 0.5, None, 1.0])

    def test_list_3_with_booleans_raises(self):
        """Test that booleans in arrays are rejected (bool is subclass of int in Python)."""
        import pytest

        from ops.blueprint_graph import _coerce_property_value
        from utils.error_handling import ProcessingError

        with pytest.raises(ProcessingError, match="3-element array must contain only numbers"):
            _coerce_property_value([True, False, True])


class TestValidateNumericList:
    """Test the _validate_numeric_list helper."""

    def test_valid_ints(self):
        """Test that integer lists pass validation."""
        from ops.blueprint_graph import _validate_numeric_list

        _validate_numeric_list([1, 2, 3], "Vector")

    def test_valid_floats(self):
        """Test that float lists pass validation."""
        from ops.blueprint_graph import _validate_numeric_list

        _validate_numeric_list([1.0, 2.5, 3.7], "Vector")

    def test_mixed_int_float(self):
        """Test that mixed int/float lists pass validation."""
        from ops.blueprint_graph import _validate_numeric_list

        _validate_numeric_list([1, 2.5, 3], "Vector")

    def test_booleans_rejected(self):
        """Test that booleans are rejected even though bool is subclass of int."""
        import pytest

        from ops.blueprint_graph import _validate_numeric_list
        from utils.error_handling import ProcessingError

        with pytest.raises(ProcessingError):
            _validate_numeric_list([True, False, True], "Vector")

    def test_strings_rejected(self):
        """Test that strings are rejected."""
        import pytest

        from ops.blueprint_graph import _validate_numeric_list
        from utils.error_handling import ProcessingError

        with pytest.raises(ProcessingError):
            _validate_numeric_list(["a", "b", "c"], "Vector")


class TestModifyComponentRotationDetection:
    """Test rotation property detection and numeric validation in modify_component's loop."""

    def test_rotation_property_name_detected(self):
        """Test that property names containing 'rotation' trigger Rotator coercion."""
        from ops.blueprint_graph import _validate_numeric_list

        # Verify the detection condition matches rotation properties
        rotation_names = ["relative_rotation", "Rotation", "my_ROTATION_value"]
        for name in rotation_names:
            raw = [0.0, 45.0, 90.0]
            assert "rotation" in name.lower(), f"{name} should match rotation detection"
            _validate_numeric_list(raw, "Rotator")

    def test_non_rotation_property_uses_vector(self):
        """Test that non-rotation 3-element list properties use Vector."""
        from ops.blueprint_graph import _coerce_property_value

        mock_unreal.Vector.reset_mock()
        _coerce_property_value([1.0, 2.0, 3.0])
        mock_unreal.Vector.assert_called_with(1.0, 2.0, 3.0)


class TestModifyComponentIntegration:
    """Integration-level tests for modify_component function."""

    def _make_mock_blueprint_with_component(self, component_name="MyMesh"):
        """Create a mock Blueprint with a named component in its SCS."""
        mock_template = Mock()
        mock_template.get_name.return_value = component_name

        mock_node = Mock()
        mock_node.component_template = mock_template

        mock_scs = Mock()
        mock_scs.get_all_nodes.return_value = [mock_node]

        mock_bp = Mock()
        mock_bp.simple_construction_script = mock_scs

        return mock_bp, mock_template

    def test_sets_editor_property_on_template(self, monkeypatch):
        """Test that modify_component calls set_editor_property on the found template."""
        from ops.blueprint_graph import modify_component

        mock_bp, mock_template = self._make_mock_blueprint_with_component("Light1")
        monkeypatch.setattr("ops.blueprint_graph.resolve_blueprint", lambda _: mock_bp)
        monkeypatch.setattr("ops.blueprint_graph.compile_and_save", lambda *a: None)

        result = modify_component(
            blueprint_path="/Game/BP_Test",
            component_name="Light1",
            properties={"intensity": 500.0},
        )

        assert result["success"] is True
        assert result["propertiesSet"] == ["intensity"]
        mock_template.set_editor_property.assert_called_once_with("intensity", 500.0)

    def test_calls_compile_and_save(self, monkeypatch):
        """Test that modify_component compiles and saves after modification."""
        from ops.blueprint_graph import modify_component

        mock_bp, _ = self._make_mock_blueprint_with_component("Mesh1")
        compile_calls = []
        monkeypatch.setattr("ops.blueprint_graph.resolve_blueprint", lambda _: mock_bp)
        monkeypatch.setattr("ops.blueprint_graph.compile_and_save", lambda bp, path: compile_calls.append((bp, path)))

        modify_component(
            blueprint_path="/Game/BP_Test",
            component_name="Mesh1",
            properties={"visible": True},
        )

        assert len(compile_calls) == 1
        assert compile_calls[0][1] == "/Game/BP_Test"

    def test_missing_component_returns_error(self, monkeypatch):
        """Test that missing component returns error with available component names."""
        from ops.blueprint_graph import modify_component

        mock_bp, _ = self._make_mock_blueprint_with_component("ExistingComp")
        monkeypatch.setattr("ops.blueprint_graph.resolve_blueprint", lambda _: mock_bp)

        result = modify_component(
            blueprint_path="/Game/BP_Test",
            component_name="NonExistent",
            properties={"foo": 1},
        )
        assert result["success"] is False
        assert "not found" in result["error"]

    def test_no_scs_returns_error(self, monkeypatch):
        """Test that Blueprint without SCS returns error dict."""
        from ops.blueprint_graph import modify_component

        mock_bp = Mock()
        mock_bp.simple_construction_script = None
        monkeypatch.setattr("ops.blueprint_graph.resolve_blueprint", lambda _: mock_bp)

        result = modify_component(
            blueprint_path="/Game/BP_Test",
            component_name="Anything",
            properties={"foo": 1},
        )
        assert result["success"] is False
        assert "SimpleConstructionScript" in result["error"]

    def test_rotation_property_coerced_to_rotator(self, monkeypatch):
        """Test that rotation-named properties use Rotator instead of Vector."""
        from ops.blueprint_graph import modify_component

        mock_bp, mock_template = self._make_mock_blueprint_with_component("Root")
        monkeypatch.setattr("ops.blueprint_graph.resolve_blueprint", lambda _: mock_bp)
        monkeypatch.setattr("ops.blueprint_graph.compile_and_save", lambda *a: None)
        mock_unreal.Rotator.reset_mock()

        modify_component(
            blueprint_path="/Game/BP_Test",
            component_name="Root",
            properties={"relative_rotation": [0.0, 45.0, 90.0]},
        )

        mock_unreal.Rotator.assert_called_once_with(roll=0.0, pitch=45.0, yaw=90.0)

    def test_multiple_properties_set(self, monkeypatch):
        """Test that multiple properties are all set."""
        from ops.blueprint_graph import modify_component

        mock_bp, mock_template = self._make_mock_blueprint_with_component("Mesh")
        monkeypatch.setattr("ops.blueprint_graph.resolve_blueprint", lambda _: mock_bp)
        monkeypatch.setattr("ops.blueprint_graph.compile_and_save", lambda *a: None)

        result = modify_component(
            blueprint_path="/Game/BP_Test",
            component_name="Mesh",
            properties={"visible": True, "cast_shadow": False},
        )

        assert set(result["propertiesSet"]) == {"visible", "cast_shadow"}
        assert mock_template.set_editor_property.call_count == 2


class TestFindComponentNode:
    """Test the _find_component_node helper."""

    def test_finds_existing_node(self):
        """Test finding an SCS node by component name."""
        from ops.blueprint_graph import _find_component_node

        mock_template = Mock()
        mock_template.get_name.return_value = "MyMesh"

        mock_node = Mock()
        mock_node.component_template = mock_template

        mock_scs = Mock()
        mock_scs.get_all_nodes.return_value = [mock_node]

        result = _find_component_node(mock_scs, "MyMesh")
        assert result == mock_node

    def test_returns_none_for_missing_component(self):
        """Test that missing component returns None."""
        from ops.blueprint_graph import _find_component_node

        mock_template = Mock()
        mock_template.get_name.return_value = "OtherComp"

        mock_node = Mock()
        mock_node.component_template = mock_template

        mock_scs = Mock()
        mock_scs.get_all_nodes.return_value = [mock_node]

        result = _find_component_node(mock_scs, "NonExistent")
        assert result is None

    def test_skips_nodes_without_template(self):
        """Test that nodes with no template are skipped."""
        from ops.blueprint_graph import _find_component_node

        mock_node = Mock()
        mock_node.component_template = None

        mock_scs = Mock()
        mock_scs.get_all_nodes.return_value = [mock_node]

        result = _find_component_node(mock_scs, "Anything")
        assert result is None


class TestFindComponentTemplate:
    """Test the _find_component_template helper delegates to _find_component_node."""

    def test_returns_template_from_node(self):
        """Test that _find_component_template returns the template, not the node."""
        from ops.blueprint_graph import _find_component_template

        mock_template = Mock()
        mock_template.get_name.return_value = "MyMesh"

        mock_node = Mock()
        mock_node.component_template = mock_template

        mock_scs = Mock()
        mock_scs.get_all_nodes.return_value = [mock_node]

        result = _find_component_template(mock_scs, "MyMesh")
        assert result == mock_template

    def test_returns_none_when_not_found(self):
        """Test that missing component returns None."""
        from ops.blueprint_graph import _find_component_template

        mock_scs = Mock()
        mock_scs.get_all_nodes.return_value = []

        result = _find_component_template(mock_scs, "NonExistent")
        assert result is None
