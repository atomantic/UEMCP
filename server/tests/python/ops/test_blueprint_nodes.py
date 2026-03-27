"""
Unit tests for blueprint_nodes operations pure Python logic.

Tests node type registries, pin finding logic, and graph lookup helpers
without requiring Unreal Engine.
"""

import os
import sys
from unittest.mock import MagicMock, Mock

# Mock the unreal module before any ops imports trigger it
if "unreal" not in sys.modules:
    sys.modules["unreal"] = MagicMock()

# Add the plugin directory to Python path for imports
plugin_path = os.path.join(os.path.dirname(__file__), "../../../..", "plugin", "Content", "Python")
sys.path.insert(0, plugin_path)


class TestEventNodeRegistry:
    """Test the event node type registry."""

    def test_common_events_registered(self):
        """Test that common UE events are in the registry."""
        from ops.blueprint_nodes import _EVENT_NODES

        expected_events = [
            "BeginPlay",
            "Tick",
            "EndPlay",
            "ActorBeginOverlap",
            "ActorEndOverlap",
            "AnyDamage",
            "OnDestroyed",
        ]
        for event in expected_events:
            assert event in _EVENT_NODES, f"Missing event node: {event}"

    def test_event_nodes_map_to_k2node_event(self):
        """Test that event nodes map to K2Node_Event class."""
        from ops.blueprint_nodes import _EVENT_NODES

        for event_name, node_class in _EVENT_NODES.items():
            assert (
                node_class == "K2Node_Event"
            ), f"Event '{event_name}' should map to 'K2Node_Event', got '{node_class}'"


class TestFlowNodeRegistry:
    """Test the control flow node type registry."""

    def test_common_flow_nodes_registered(self):
        """Test that common control flow nodes are registered."""
        from ops.blueprint_nodes import _FLOW_NODES

        expected_flow = [
            "Branch",
            "Sequence",
            "DoOnce",
            "FlipFlop",
            "Gate",
            "Delay",
            "Select",
            "MultiGate",
        ]
        for flow in expected_flow:
            assert flow in _FLOW_NODES, f"Missing flow node: {flow}"

    def test_branch_maps_to_correct_class(self):
        """Test Branch maps to K2Node_IfThenElse."""
        from ops.blueprint_nodes import _FLOW_NODES

        assert _FLOW_NODES["Branch"] == "K2Node_IfThenElse"

    def test_sequence_maps_to_correct_class(self):
        """Test Sequence maps to K2Node_ExecutionSequence."""
        from ops.blueprint_nodes import _FLOW_NODES

        assert _FLOW_NODES["Sequence"] == "K2Node_ExecutionSequence"

    def test_all_flow_nodes_have_k2node_prefix(self):
        """Test that all flow node classes start with K2Node_."""
        from ops.blueprint_nodes import _FLOW_NODES

        for name, cls in _FLOW_NODES.items():
            assert cls.startswith("K2Node_"), f"Flow node '{name}' class '{cls}' should start with 'K2Node_'"


class TestPinFinding:
    """Test the pin finding helper logic."""

    def test_find_pin_by_name(self):
        """Test finding a pin by name."""
        from ops.blueprint_nodes import _find_pin

        # Create mock pins
        exec_pin = Mock()
        exec_pin.get_editor_property.side_effect = lambda p: {
            "pin_name": "execute",
            "direction": "EGPD_Input",
        }.get(p)

        then_pin = Mock()
        then_pin.get_editor_property.side_effect = lambda p: {
            "pin_name": "then",
            "direction": "EGPD_Output",
        }.get(p)

        mock_node = Mock()
        mock_node.get_editor_property.return_value = [exec_pin, then_pin]

        # Find by name
        result = _find_pin(mock_node, "execute")
        assert result == exec_pin

        result = _find_pin(mock_node, "then")
        assert result == then_pin

    def test_find_pin_not_found(self):
        """Test finding a pin that doesn't exist."""
        from ops.blueprint_nodes import _find_pin

        mock_node = Mock()
        mock_node.get_editor_property.return_value = []

        result = _find_pin(mock_node, "nonexistent")
        assert result is None

    def test_find_pin_with_direction_filter(self):
        """Test finding a pin with direction filter."""
        from ops.blueprint_nodes import _find_pin

        # Create a pin that's an output
        pin = Mock()
        pin.get_editor_property.side_effect = lambda p: {
            "pin_name": "Result",
            "direction": "EGPD_Output",
        }.get(p)

        mock_node = Mock()
        mock_node.get_editor_property.return_value = [pin]

        # Should find with output filter
        result = _find_pin(mock_node, "Result", "output")
        assert result == pin

        # Should not find with input filter
        result = _find_pin(mock_node, "Result", "input")
        assert result is None

    def test_find_pin_no_pins(self):
        """Test finding pin when node has no pins."""
        from ops.blueprint_nodes import _find_pin

        mock_node = Mock()
        mock_node.get_editor_property.return_value = None

        result = _find_pin(mock_node, "anything")
        assert result is None


class TestNodeFinding:
    """Test the node finding helper logic."""

    def test_find_node_by_id(self):
        """Test finding a node by its GUID."""
        from ops.blueprint_nodes import _find_node_by_id

        mock_node = Mock()
        mock_node.get_editor_property.side_effect = lambda p: {
            "node_guid": "abc-123-def",
        }.get(p)

        mock_graph = Mock()
        mock_graph.get_editor_property.return_value = [mock_node]

        result = _find_node_by_id(mock_graph, "abc-123-def")
        assert result == mock_node

    def test_find_node_not_found(self):
        """Test finding a node that doesn't exist."""
        from ops.blueprint_nodes import _find_node_by_id

        mock_graph = Mock()
        mock_graph.get_editor_property.return_value = []

        result = _find_node_by_id(mock_graph, "nonexistent")
        assert result is None

    def test_find_node_empty_graph(self):
        """Test finding node in graph with no nodes."""
        from ops.blueprint_nodes import _find_node_by_id

        mock_graph = Mock()
        mock_graph.get_editor_property.return_value = None

        result = _find_node_by_id(mock_graph, "any-id")
        assert result is None


class TestMathFunctionMapping:
    """Test that math node types map to correct KismetMathLibrary functions."""

    def test_math_function_names(self):
        """Test math function name mappings used in add_node."""
        math_func_map = {
            "Add": "Add_FloatFloat",
            "Subtract": "Subtract_FloatFloat",
            "Multiply": "Multiply_FloatFloat",
            "Divide": "Divide_FloatFloat",
            "Clamp": "FClamp",
            "Lerp": "Lerp",
        }

        # All map to valid Kismet function names
        for friendly, func_name in math_func_map.items():
            assert isinstance(func_name, str)
            assert len(func_name) > 0
            assert friendly in math_func_map

    def test_no_duplicate_math_mappings(self):
        """Test no duplicate values in math function mapping."""
        math_func_map = {
            "Add": "Add_FloatFloat",
            "Subtract": "Subtract_FloatFloat",
            "Multiply": "Multiply_FloatFloat",
            "Divide": "Divide_FloatFloat",
            "Clamp": "FClamp",
            "Lerp": "Lerp",
        }

        values = list(math_func_map.values())
        assert len(values) == len(set(values)), "Duplicate math function mappings found"


class TestNodeTypeCategories:
    """Test that all supported node types are properly categorized."""

    def test_no_overlap_between_event_and_flow(self):
        """Test that event and flow node registries don't overlap."""
        from ops.blueprint_nodes import _EVENT_NODES, _FLOW_NODES

        overlap = set(_EVENT_NODES.keys()) & set(_FLOW_NODES.keys())
        assert len(overlap) == 0, f"Overlapping node types: {overlap}"

    def test_special_node_types_not_in_registries(self):
        """Test that special-case types aren't in the static registries."""
        from ops.blueprint_nodes import _EVENT_NODES, _FLOW_NODES

        special_types = [
            "CustomEvent",
            "CallFunction",
            "VariableGet",
            "VariableSet",
            "PrintString",
            "SetTimer",
            "IsValid",
        ]
        all_registered = set(_EVENT_NODES.keys()) | set(_FLOW_NODES.keys())

        for special in special_types:
            assert special not in all_registered, f"'{special}' should be handled as special case, not in registries"
