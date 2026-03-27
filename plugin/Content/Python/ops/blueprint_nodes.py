"""
Blueprint node operations for adding, connecting, and removing nodes
in Blueprint event graphs and function graphs.
"""

from typing import Any, Dict, Optional

import unreal

from utils.blueprint_helpers import compile_and_save, list_pin_names, resolve_blueprint
from utils.error_handling import (
    AssetPathRule,
    ProcessingError,
    RequiredRule,
    TypeRule,
    handle_unreal_errors,
    safe_operation,
    validate_inputs,
)
from utils.general import log_debug as log_info

_EVENT_NODES = {
    "BeginPlay": "K2Node_Event",
    "Tick": "K2Node_Event",
    "EndPlay": "K2Node_Event",
    "ActorBeginOverlap": "K2Node_Event",
    "ActorEndOverlap": "K2Node_Event",
    "AnyDamage": "K2Node_Event",
    "OnDestroyed": "K2Node_Event",
}

# Control flow node types
_FLOW_NODES = {
    "Branch": "K2Node_IfThenElse",
    "Sequence": "K2Node_ExecutionSequence",
    "DoOnce": "K2Node_DoOnceMultiInput",
    "FlipFlop": "K2Node_FlipFlop",
    "Gate": "K2Node_Gate",
    "Delay": "K2Node_Delay",
    "ForEachLoop": "K2Node_ForEachElementInEnum",
    "WhileLoop": "K2Node_WhileLoop",
    "Select": "K2Node_Select",
    "MultiGate": "K2Node_MultiGate",
}

# Shortcut nodes — maps friendly names to (function_name, target_class)
_UTILITY_SHORTCUTS = {
    "PrintString": ("PrintString", "KismetSystemLibrary"),
    "SetTimer": ("K2_SetTimerDelegate", "KismetSystemLibrary"),
    "IsValid": ("IsValid", "KismetSystemLibrary"),
    "RandomFloat": ("RandomFloat", "KismetMathLibrary"),
    "RandomInteger": ("RandomInteger", "KismetMathLibrary"),
}

_MATH_SHORTCUTS = {
    "Add": ("Add_FloatFloat", "KismetMathLibrary"),
    "Subtract": ("Subtract_FloatFloat", "KismetMathLibrary"),
    "Multiply": ("Multiply_FloatFloat", "KismetMathLibrary"),
    "Divide": ("Divide_FloatFloat", "KismetMathLibrary"),
    "Clamp": ("FClamp", "KismetMathLibrary"),
    "Lerp": ("Lerp", "KismetMathLibrary"),
}


def _get_graph(blueprint, graph_name=None):
    """Get a specific graph from the Blueprint.

    Args:
        blueprint: The Blueprint object
        graph_name: Optional graph name. If None, returns the default EventGraph.

    Returns:
        The EdGraph object
    """
    uber_graphs = blueprint.get_editor_property("uber_graph_pages") or []
    for graph in uber_graphs:
        if graph_name is None or graph.get_name() == graph_name:
            return graph

    func_graphs = blueprint.get_editor_property("function_graphs") or []
    for graph in func_graphs:
        if graph.get_name() == graph_name:
            return graph

    if graph_name:
        raise ProcessingError(
            f"Graph '{graph_name}' not found in Blueprint",
            operation="blueprint_nodes",
            details={"graph_name": graph_name},
        )

    raise ProcessingError(
        "No event graph found in Blueprint",
        operation="blueprint_nodes",
        details={"blueprint": blueprint.get_name()},
    )


def _find_node_by_id(graph, node_id):
    """Find a node in a graph by its GUID string.

    Args:
        graph: The EdGraph to search
        node_id: Node GUID string

    Returns:
        The EdGraphNode if found
    """
    nodes = graph.get_editor_property("nodes") or []
    for node in nodes:
        guid = str(node.get_editor_property("node_guid"))
        if guid == node_id:
            return node
    return None


def _find_pin(node, pin_name, direction=None):
    """Find a pin on a node by name and optional direction.

    Args:
        node: The EdGraphNode
        pin_name: Pin name to find
        direction: Optional 'input' or 'output' filter

    Returns:
        The EdGraphPin if found
    """
    pins = node.get_editor_property("pins") or []
    for pin in pins:
        name = str(pin.get_editor_property("pin_name"))
        if name == pin_name:
            if direction:
                pin_dir = str(pin.get_editor_property("direction"))
                if direction.lower() == "input" and "input" in pin_dir.lower():
                    return pin
                if direction.lower() == "output" and "output" in pin_dir.lower():
                    return pin
                continue
            return pin
    return None


def _dispatch_node_creation(blueprint, graph, node_type, pos_x, pos_y, **kwargs):
    """Route node creation to the appropriate handler.

    Checks registries in order: events, custom event, flow, function call,
    variable get/set, utility shortcuts, math shortcuts, then generic lookup.
    """
    if node_type in _EVENT_NODES:
        return _create_event_node(blueprint, graph, node_type, pos_x, pos_y)

    if node_type == "CustomEvent":
        name = kwargs.get("event_name") or kwargs.get("node_name") or "NewCustomEvent"
        return _create_custom_event_node(blueprint, graph, name, pos_x, pos_y)

    if node_type in _FLOW_NODES:
        return _create_flow_node(blueprint, graph, node_type, pos_x, pos_y)

    if node_type == "CallFunction":
        fn = kwargs.get("function_name")
        if not fn:
            raise ProcessingError(
                "function_name is required for CallFunction nodes",
                operation="blueprint_add_node",
                details={"node_type": node_type},
            )
        return _create_function_call_node(blueprint, graph, fn, kwargs.get("target_class"), pos_x, pos_y)

    if node_type in ("VariableGet", "VariableSet"):
        var = kwargs.get("variable_name")
        if not var:
            raise ProcessingError(
                "variable_name is required for Variable nodes",
                operation="blueprint_add_node",
                details={"node_type": node_type},
            )
        return _create_variable_node(blueprint, graph, var, node_type == "VariableGet", pos_x, pos_y)

    if node_type in _UTILITY_SHORTCUTS:
        func, target = _UTILITY_SHORTCUTS[node_type]
        return _create_function_call_node(blueprint, graph, func, target, pos_x, pos_y)

    if node_type in _MATH_SHORTCUTS:
        func, target = _MATH_SHORTCUTS[node_type]
        return _create_function_call_node(blueprint, graph, func, target, pos_x, pos_y)

    return _create_generic_node(blueprint, graph, node_type, pos_x, pos_y)


# ============================================================================
# Node Operations
# ============================================================================


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "node_type": [RequiredRule(), TypeRule(str)],
        "graph_name": [TypeRule(str, allow_none=True)],
        "position_x": [TypeRule((int, float), allow_none=True)],
        "position_y": [TypeRule((int, float), allow_none=True)],
        "node_name": [TypeRule(str, allow_none=True)],
        "function_name": [TypeRule(str, allow_none=True)],
        "target_class": [TypeRule(str, allow_none=True)],
        "variable_name": [TypeRule(str, allow_none=True)],
        "is_getter": [TypeRule(bool, allow_none=True)],
        "event_name": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("blueprint_add_node")
@safe_operation("blueprint")
def add_node(
    blueprint_path: str,
    node_type: str,
    graph_name: Optional[str] = None,
    position_x: float = 0,
    position_y: float = 0,
    node_name: Optional[str] = None,
    function_name: Optional[str] = None,
    target_class: Optional[str] = None,
    variable_name: Optional[str] = None,
    is_getter: bool = True,
    event_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Add a node to a Blueprint graph.

    Args:
        blueprint_path: Path to the Blueprint asset
        node_type: Type of node to add. Options:
            Events: 'BeginPlay', 'Tick', 'EndPlay', 'ActorBeginOverlap',
                    'ActorEndOverlap', 'AnyDamage', 'CustomEvent'
            Flow: 'Branch', 'Sequence', 'DoOnce', 'FlipFlop', 'Gate',
                  'Delay', 'ForEachLoop', 'Select', 'MultiGate'
            Functions: 'CallFunction' (requires function_name)
            Variables: 'VariableGet', 'VariableSet' (requires variable_name)
            Utility: 'PrintString', 'PrintText', 'SetTimer', 'ClearTimer',
                     'IsValid', 'Cast', 'MakeArray', 'SpawnActor'
            Math: 'Add', 'Subtract', 'Multiply', 'Divide', 'Clamp',
                  'Lerp', 'RandomFloat', 'RandomInteger'
        graph_name: Optional graph name (defaults to EventGraph)
        position_x: X position in graph editor
        position_y: Y position in graph editor
        node_name: Optional custom node name/comment
        function_name: Required for 'CallFunction' type — the function to call
        target_class: Optional target class for function calls (e.g., 'KismetSystemLibrary')
        variable_name: Required for 'VariableGet'/'VariableSet' — the variable name
        is_getter: For variable nodes — True for getter, False for setter (default: True)
        event_name: Custom event name for 'CustomEvent' type

    Returns:
        Dictionary with node creation result including the node's GUID
    """
    blueprint = resolve_blueprint(blueprint_path)
    graph = _get_graph(blueprint, graph_name)

    node = _dispatch_node_creation(
        blueprint,
        graph,
        node_type,
        position_x,
        position_y,
        node_name=node_name,
        function_name=function_name,
        target_class=target_class,
        variable_name=variable_name,
        is_getter=is_getter,
        event_name=event_name,
    )

    if not node:
        raise ProcessingError(
            f"Failed to create node of type '{node_type}'",
            operation="blueprint_add_node",
            details={
                "node_type": node_type,
                "supported_events": list(_EVENT_NODES.keys()) + ["CustomEvent"],
                "supported_flow": list(_FLOW_NODES.keys()),
                "special_types": [
                    "CallFunction",
                    "VariableGet",
                    "VariableSet",
                    "PrintString",
                    "SetTimer",
                    "IsValid",
                    "Add",
                    "Subtract",
                    "Multiply",
                    "Divide",
                    "Clamp",
                    "Lerp",
                    "RandomFloat",
                    "RandomInteger",
                ],
            },
        )

    # Set position
    node.set_editor_property("node_pos_x", int(position_x))
    node.set_editor_property("node_pos_y", int(position_y))

    # Set comment if provided
    if node_name:
        node.set_editor_property("node_comment", node_name)

    compile_and_save(blueprint, blueprint_path)

    node_guid = str(node.get_editor_property("node_guid"))
    log_info(f"Added node '{node_type}' (id: {node_guid}) to {blueprint_path}")

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "nodeId": node_guid,
        "nodeType": node_type,
        "nodeClass": node.get_class().get_name(),
        "graphName": graph.get_name(),
    }


def _create_event_node(blueprint, graph, event_name, pos_x, pos_y):
    """Create an event node (BeginPlay, Tick, etc.)."""
    # Use BlueprintEditorLibrary to add event nodes
    node = unreal.BlueprintEditorLibrary.add_event_node(blueprint, graph, event_name)
    return node


def _create_custom_event_node(blueprint, graph, event_name, pos_x, pos_y):
    """Create a custom event node."""
    node = unreal.BlueprintEditorLibrary.add_custom_event_node(blueprint, graph, event_name)
    return node


def _create_flow_node(blueprint, graph, flow_type, pos_x, pos_y):
    """Create a control flow node (Branch, Sequence, etc.)."""
    k2_class_name = _FLOW_NODES.get(flow_type)
    if not k2_class_name:
        return None

    node_class = getattr(unreal, k2_class_name, None)
    if not node_class:
        return None

    # Create node instance and add to graph
    node = unreal.BlueprintEditorLibrary.add_node(blueprint, graph, node_class)
    return node


def _create_function_call_node(blueprint, graph, function_name, target_class, pos_x, pos_y):
    """Create a function call node."""
    # Resolve the target class for the function
    target = None
    if target_class:
        target = getattr(unreal, target_class, None)
        if not target:
            # Try loading as an asset
            target = unreal.EditorAssetLibrary.load_asset(f"/Script/Engine.{target_class}")

    node = unreal.BlueprintEditorLibrary.add_call_function_node(blueprint, graph, function_name, target)
    return node


def _create_variable_node(blueprint, graph, variable_name, is_getter, pos_x, pos_y):
    """Create a variable get or set node."""
    if is_getter:
        node = unreal.BlueprintEditorLibrary.add_variable_get_node(blueprint, graph, variable_name)
    else:
        node = unreal.BlueprintEditorLibrary.add_variable_set_node(blueprint, graph, variable_name)
    return node


def _create_generic_node(blueprint, graph, node_type, pos_x, pos_y):
    """Try to create a node by its K2Node class name."""
    # Try with and without K2Node_ prefix
    candidates = [node_type, f"K2Node_{node_type}"]
    for name in candidates:
        node_class = getattr(unreal, name, None)
        if node_class:
            node = unreal.BlueprintEditorLibrary.add_node(blueprint, graph, node_class)
            if node:
                return node
    return None


# ============================================================================
# Pin Connection Operations
# ============================================================================


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "source_node_id": [RequiredRule(), TypeRule(str)],
        "source_pin_name": [RequiredRule(), TypeRule(str)],
        "target_node_id": [RequiredRule(), TypeRule(str)],
        "target_pin_name": [RequiredRule(), TypeRule(str)],
        "graph_name": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("blueprint_connect_nodes")
@safe_operation("blueprint")
def connect_nodes(
    blueprint_path: str,
    source_node_id: str,
    source_pin_name: str,
    target_node_id: str,
    target_pin_name: str,
    graph_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Connect two nodes by linking an output pin to an input pin.

    Args:
        blueprint_path: Path to the Blueprint asset
        source_node_id: GUID of the source (output) node
        source_pin_name: Name of the output pin on the source node
                         (e.g., 'then', 'ReturnValue', 'Result')
        target_node_id: GUID of the target (input) node
        target_pin_name: Name of the input pin on the target node
                         (e.g., 'execute', 'InString', 'Condition')
        graph_name: Optional graph name (defaults to EventGraph)

    Returns:
        Dictionary with connection result
    """
    blueprint = resolve_blueprint(blueprint_path)
    graph = _get_graph(blueprint, graph_name)

    # Find source and target nodes
    source_node = _find_node_by_id(graph, source_node_id)
    if not source_node:
        raise ProcessingError(
            f"Source node '{source_node_id}' not found",
            operation="blueprint_connect_nodes",
            details={"source_node_id": source_node_id, "graph": graph.get_name()},
        )

    target_node = _find_node_by_id(graph, target_node_id)
    if not target_node:
        raise ProcessingError(
            f"Target node '{target_node_id}' not found",
            operation="blueprint_connect_nodes",
            details={"target_node_id": target_node_id, "graph": graph.get_name()},
        )

    # Find pins
    source_pin = _find_pin(source_node, source_pin_name, "output")
    if not source_pin:
        # Try without direction filter
        source_pin = _find_pin(source_node, source_pin_name)
    if not source_pin:
        raise ProcessingError(
            f"Output pin '{source_pin_name}' not found on source node",
            operation="blueprint_connect_nodes",
            details={"source_pin_name": source_pin_name, "available_pins": list_pin_names(source_node)},
        )

    target_pin = _find_pin(target_node, target_pin_name, "input")
    if not target_pin:
        target_pin = _find_pin(target_node, target_pin_name)
    if not target_pin:
        raise ProcessingError(
            f"Input pin '{target_pin_name}' not found on target node",
            operation="blueprint_connect_nodes",
            details={"target_pin_name": target_pin_name, "available_pins": list_pin_names(target_node)},
        )

    # Make the connection using the graph schema
    schema = graph.get_schema()
    if schema:
        result = schema.try_create_connection(source_pin, target_pin)
        if not result:
            raise ProcessingError(
                f"Cannot connect '{source_pin_name}' to '{target_pin_name}' — incompatible types",
                operation="blueprint_connect_nodes",
                details={
                    "source_pin": source_pin_name,
                    "target_pin": target_pin_name,
                },
            )
    else:
        # Fallback: direct pin linking
        source_pin.make_link_to(target_pin)

    compile_and_save(blueprint, blueprint_path)
    log_info(
        f"Connected {source_node_id}:{source_pin_name} -> " f"{target_node_id}:{target_pin_name} in {blueprint_path}"
    )

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "sourceNodeId": source_node_id,
        "sourcePinName": source_pin_name,
        "targetNodeId": target_node_id,
        "targetPinName": target_pin_name,
    }


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "node_id": [RequiredRule(), TypeRule(str)],
        "pin_name": [RequiredRule(), TypeRule(str)],
        "graph_name": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("blueprint_disconnect_pin")
@safe_operation("blueprint")
def disconnect_pin(
    blueprint_path: str,
    node_id: str,
    pin_name: str,
    graph_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Break all connections on a specific pin.

    Args:
        blueprint_path: Path to the Blueprint asset
        node_id: GUID of the node
        pin_name: Name of the pin to disconnect
        graph_name: Optional graph name (defaults to EventGraph)

    Returns:
        Dictionary with disconnection result
    """
    blueprint = resolve_blueprint(blueprint_path)
    graph = _get_graph(blueprint, graph_name)

    node = _find_node_by_id(graph, node_id)
    if not node:
        raise ProcessingError(
            f"Node '{node_id}' not found",
            operation="blueprint_disconnect_pin",
            details={"node_id": node_id},
        )

    pin = _find_pin(node, pin_name)
    if not pin:
        raise ProcessingError(
            f"Pin '{pin_name}' not found on node",
            operation="blueprint_disconnect_pin",
            details={"node_id": node_id, "pin_name": pin_name},
        )

    # Break all links on this pin
    pin.break_all_pin_links()

    compile_and_save(blueprint, blueprint_path)
    log_info(f"Disconnected pin '{pin_name}' on node {node_id} in {blueprint_path}")

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "nodeId": node_id,
        "pinName": pin_name,
    }


# ============================================================================
# Node Removal
# ============================================================================


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "node_id": [RequiredRule(), TypeRule(str)],
        "graph_name": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("blueprint_remove_node")
@safe_operation("blueprint")
def remove_node(
    blueprint_path: str,
    node_id: str,
    graph_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Remove a node from a Blueprint graph.

    Args:
        blueprint_path: Path to the Blueprint asset
        node_id: GUID of the node to remove
        graph_name: Optional graph name (defaults to EventGraph)

    Returns:
        Dictionary with removal result
    """
    blueprint = resolve_blueprint(blueprint_path)
    graph = _get_graph(blueprint, graph_name)

    node = _find_node_by_id(graph, node_id)
    if not node:
        raise ProcessingError(
            f"Node '{node_id}' not found",
            operation="blueprint_remove_node",
            details={"node_id": node_id, "graph": graph.get_name()},
        )

    node_class = node.get_class().get_name()

    # Break all connections first
    pins = node.get_editor_property("pins") or []
    for pin in pins:
        pin.break_all_pin_links()

    # Remove the node from the graph
    graph.remove_node(node)

    compile_and_save(blueprint, blueprint_path)
    log_info(f"Removed node {node_id} ({node_class}) from {blueprint_path}")

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "nodeId": node_id,
        "nodeClass": node_class,
        "graphName": graph.get_name(),
    }


# ============================================================================
# Console Command (bonus utility)
# ============================================================================


@validate_inputs(
    {
        "command": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("console_command")
@safe_operation("system")
def execute_console_command(
    command: str,
) -> Dict[str, Any]:
    """
    Execute an Unreal Engine console command.

    Args:
        command: The console command to execute (e.g., 'stat fps', 'stat unit',
                 'r.SetRes 1920x1080', 'obj list', 'memreport -full')

    Returns:
        Dictionary with command execution result
    """
    # Get the editor world
    world = unreal.EditorLevelLibrary.get_editor_world()
    if not world:
        raise ProcessingError(
            "No editor world available",
            operation="console_command",
        )

    # Execute the command
    unreal.SystemLibrary.execute_console_command(world, command)

    log_info(f"Executed console command: {command}")

    return {
        "success": True,
        "command": command,
    }
