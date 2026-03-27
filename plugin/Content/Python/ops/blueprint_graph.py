"""
Blueprint graph editing operations for manipulating Blueprint variables,
components, functions, event dispatchers, and graph introspection.
"""

from typing import Any, Dict, List, Optional

import unreal

from utils.blueprint_helpers import compile_and_save, resolve_blueprint
from utils.error_handling import (
    AssetPathRule,
    ListLengthRule,
    ProcessingError,
    RequiredRule,
    TypeRule,
    handle_unreal_errors,
    safe_operation,
    validate_inputs,
)
from utils.general import log_debug as log_info
from utils.general import log_error

_VARIABLE_TYPE_MAP = {
    "bool": ("bool", None),
    "byte": ("byte", None),
    "int": ("int", None),
    "int64": ("int64", None),
    "float": ("real", "double"),
    "double": ("real", "double"),
    "string": ("string", None),
    "text": ("text", None),
    "name": ("name", None),
    "vector": ("struct", "/Script/CoreUObject.Vector"),
    "rotator": ("struct", "/Script/CoreUObject.Rotator"),
    "transform": ("struct", "/Script/CoreUObject.Transform"),
    "color": ("struct", "/Script/CoreUObject.LinearColor"),
    "vector2d": ("struct", "/Script/CoreUObject.Vector2D"),
    "object": ("object", "/Script/CoreUObject.Object"),
    "actor": ("object", "/Script/Engine.Actor"),
    "class": ("class", "/Script/CoreUObject.Object"),
}


def _make_pin_type(var_type, sub_type=None):
    """Create an EdGraphPinType from a friendly type name.

    Args:
        var_type: Friendly type name (e.g., 'bool', 'int', 'vector', 'object')
        sub_type: Optional sub-object path for object/struct types

    Returns:
        unreal.EdGraphPinType configured for the requested type
    """
    pin_type = unreal.EdGraphPinType()

    type_lower = var_type.lower()
    if type_lower in _VARIABLE_TYPE_MAP:
        category, default_sub = _VARIABLE_TYPE_MAP[type_lower]
        pin_type.pin_category = category
        if sub_type:
            # Use load_object for /Script/ paths (class references),
            # fall back to load_asset for /Game/ content paths
            if sub_type.startswith("/Script/"):
                sub_obj = unreal.load_object(None, sub_type)
            else:
                sub_obj = unreal.EditorAssetLibrary.load_asset(sub_type)
            if not sub_obj:
                raise ProcessingError(
                    f"Sub-type asset not found: {sub_type}",
                    operation="blueprint_graph",
                    details={"sub_type": sub_type},
                )
            pin_type.pin_sub_category_object = sub_obj
        elif default_sub:
            sub_obj = unreal.load_object(None, default_sub)
            if sub_obj:
                pin_type.pin_sub_category_object = sub_obj
    else:
        # Try treating it as a struct/object path directly
        pin_type.pin_category = "struct"
        sub_obj = unreal.EditorAssetLibrary.load_asset(var_type)
        if sub_obj:
            pin_type.pin_sub_category_object = sub_obj
        else:
            raise ProcessingError(
                f"Unknown variable type: {var_type}",
                operation="blueprint_graph",
                details={
                    "var_type": var_type,
                    "supported_types": list(_VARIABLE_TYPE_MAP.keys()),
                },
            )

    return pin_type


# ============================================================================
# Variable Operations
# ============================================================================


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "variable_name": [RequiredRule(), TypeRule(str)],
        "variable_type": [RequiredRule(), TypeRule(str)],
        "is_instance_editable": [TypeRule(bool, allow_none=True)],
        "is_expose_on_spawn": [TypeRule(bool, allow_none=True)],
        "category": [TypeRule(str, allow_none=True)],
        "sub_type": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("blueprint_add_variable")
@safe_operation("blueprint")
def add_variable(
    blueprint_path: str,
    variable_name: str,
    variable_type: str,
    is_instance_editable: bool = True,
    is_expose_on_spawn: bool = False,
    category: Optional[str] = None,
    sub_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Add a typed variable to a Blueprint.

    Args:
        blueprint_path: Path to the Blueprint asset
        variable_name: Name for the new variable
        variable_type: Type of variable (bool, int, float, string, vector,
                       rotator, transform, object, actor, class, etc.)
        is_instance_editable: Whether variable is editable per-instance in details panel
        is_expose_on_spawn: Whether to expose as a spawn parameter
        category: Optional category for organizing in details panel
        sub_type: Optional sub-type path for object/struct types
                  (e.g., '/Script/Engine.StaticMesh' for object type)

    Returns:
        Dictionary with variable creation result
    """
    blueprint = resolve_blueprint(blueprint_path)

    pin_type = _make_pin_type(variable_type, sub_type)

    success = unreal.BlueprintEditorLibrary.add_variable(blueprint, variable_name, pin_type, is_instance_editable)

    if not success:
        raise ProcessingError(
            f"Failed to add variable '{variable_name}' — may already exist",
            operation="blueprint_add_variable",
            details={"blueprint_path": blueprint_path, "variable_name": variable_name},
        )

    # Set additional properties if supported
    if category:
        unreal.BlueprintEditorLibrary.set_blueprint_variable_category(blueprint, variable_name, unreal.Text(category))

    if is_expose_on_spawn:
        unreal.BlueprintEditorLibrary.set_blueprint_variable_expose_on_spawn(blueprint, variable_name, True)

    compile_and_save(blueprint, blueprint_path)
    log_info(f"Added variable '{variable_name}' ({variable_type}) to {blueprint_path}")

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "variableName": variable_name,
        "variableType": variable_type,
    }


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "variable_name": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("blueprint_remove_variable")
@safe_operation("blueprint")
def remove_variable(
    blueprint_path: str,
    variable_name: str,
) -> Dict[str, Any]:
    """
    Remove a variable from a Blueprint.

    Args:
        blueprint_path: Path to the Blueprint asset
        variable_name: Name of the variable to remove

    Returns:
        Dictionary with removal result
    """
    blueprint = resolve_blueprint(blueprint_path)

    success = unreal.BlueprintEditorLibrary.remove_variable(blueprint, variable_name)

    if not success:
        raise ProcessingError(
            f"Failed to remove variable '{variable_name}' — may not exist",
            operation="blueprint_remove_variable",
            details={"blueprint_path": blueprint_path, "variable_name": variable_name},
        )

    compile_and_save(blueprint, blueprint_path)
    log_info(f"Removed variable '{variable_name}' from {blueprint_path}")

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "variableName": variable_name,
    }


# ============================================================================
# Component Operations
# ============================================================================


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "component_name": [RequiredRule(), TypeRule(str)],
        "component_class": [RequiredRule(), TypeRule(str)],
        "parent_component": [TypeRule(str, allow_none=True)],
        "location": [TypeRule(list, allow_none=True), ListLengthRule(3, allow_none=True)],
        "rotation": [TypeRule(list, allow_none=True), ListLengthRule(3, allow_none=True)],
        "scale": [TypeRule(list, allow_none=True), ListLengthRule(3, allow_none=True)],
    }
)
@handle_unreal_errors("blueprint_add_component")
@safe_operation("blueprint")
def add_component(
    blueprint_path: str,
    component_name: str,
    component_class: str,
    parent_component: Optional[str] = None,
    location: Optional[List[float]] = None,
    rotation: Optional[List[float]] = None,
    scale: Optional[List[float]] = None,
) -> Dict[str, Any]:
    """
    Add a component to a Blueprint's component hierarchy.

    Args:
        blueprint_path: Path to the Blueprint asset
        component_name: Name for the new component
        component_class: Component class name (e.g., 'StaticMeshComponent',
                         'PointLightComponent', 'BoxCollisionComponent',
                         'ArrowComponent', 'AudioComponent', 'CameraComponent',
                         'SceneComponent', 'SphereComponent', 'CapsuleComponent',
                         'SkeletalMeshComponent', 'ParticleSystemComponent',
                         'WidgetComponent', 'SplineComponent', 'DecalComponent',
                         'NiagaraComponent', 'BillboardComponent')
        parent_component: Optional parent component name for attachment
        location: Optional relative location [X, Y, Z]
        rotation: Optional relative rotation [Roll, Pitch, Yaw]
        scale: Optional relative scale [X, Y, Z]

    Returns:
        Dictionary with component addition result
    """
    blueprint = resolve_blueprint(blueprint_path)

    # Component class mapping
    component_class_map = {
        "StaticMeshComponent": unreal.StaticMeshComponent,
        "SkeletalMeshComponent": unreal.SkeletalMeshComponent,
        "SceneComponent": unreal.SceneComponent,
        "PointLightComponent": unreal.PointLightComponent,
        "SpotLightComponent": unreal.SpotLightComponent,
        "DirectionalLightComponent": unreal.DirectionalLightComponent,
        "CameraComponent": unreal.CameraComponent,
        "AudioComponent": unreal.AudioComponent,
        "ArrowComponent": unreal.ArrowComponent,
        "BoxCollisionComponent": unreal.BoxComponent,
        "SphereComponent": unreal.SphereComponent,
        "CapsuleComponent": unreal.CapsuleComponent,
        "WidgetComponent": unreal.WidgetComponent,
        "SplineComponent": unreal.SplineComponent,
        "DecalComponent": unreal.DecalComponent,
        "BillboardComponent": unreal.BillboardComponent,
        "TextRenderComponent": unreal.TextRenderComponent,
    }

    # Resolve component class
    comp_cls = component_class_map.get(component_class)
    if not comp_cls:
        # Try to find it dynamically via unreal module
        comp_cls = getattr(unreal, component_class, None)
        if not comp_cls:
            raise ProcessingError(
                f"Unknown component class: {component_class}",
                operation="blueprint_add_component",
                details={
                    "component_class": component_class,
                    "supported_classes": list(component_class_map.keys()),
                },
            )

    scs = blueprint.simple_construction_script

    if not scs:
        raise ProcessingError(
            "Blueprint does not support components (no SimpleConstructionScript)",
            operation="blueprint_add_component",
            details={"blueprint_path": blueprint_path},
        )

    # Create the component node
    new_node = scs.create_node(comp_cls, component_name)

    if not new_node:
        raise ProcessingError(
            f"Failed to create component '{component_name}'",
            operation="blueprint_add_component",
            details={"blueprint_path": blueprint_path, "component_name": component_name},
        )

    # Attach to parent or add as root
    if parent_component:
        # Find parent node in SCS
        all_nodes = scs.get_all_nodes()
        parent_node = None
        for node in all_nodes:
            template = node.component_template
            if template and template.get_name() == parent_component:
                parent_node = node
                break

        if parent_node:
            parent_node.add_child_node(new_node, False)
        else:
            log_info(f"Parent component '{parent_component}' not found, " f"adding '{component_name}' as root")
            scs.add_node(new_node)
    else:
        scs.add_node(new_node)

    # Set transform if component has one
    template = new_node.component_template
    if template and isinstance(template, unreal.SceneComponent):
        if location:
            template.set_editor_property(
                "relative_location",
                unreal.Vector(location[0], location[1], location[2]),
            )
        if rotation:
            template.set_editor_property(
                "relative_rotation",
                unreal.Rotator(
                    roll=rotation[0],
                    pitch=rotation[1],
                    yaw=rotation[2],
                ),
            )
        if scale:
            template.set_editor_property(
                "relative_scale3d",
                unreal.Vector(scale[0], scale[1], scale[2]),
            )

    compile_and_save(blueprint, blueprint_path)
    log_info(f"Added component '{component_name}' ({component_class}) to {blueprint_path}")

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "componentName": component_name,
        "componentClass": component_class,
        "parentComponent": parent_component,
    }


# ============================================================================
# Function Operations
# ============================================================================


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "function_name": [RequiredRule(), TypeRule(str)],
        "inputs": [TypeRule(list, allow_none=True)],
        "outputs": [TypeRule(list, allow_none=True)],
        "is_pure": [TypeRule(bool, allow_none=True)],
    }
)
@handle_unreal_errors("blueprint_add_function")
@safe_operation("blueprint")
def add_function(
    blueprint_path: str,
    function_name: str,
    inputs: Optional[List[Dict[str, str]]] = None,
    outputs: Optional[List[Dict[str, str]]] = None,
    is_pure: bool = False,
) -> Dict[str, Any]:
    """
    Add a custom function graph to a Blueprint.

    Args:
        blueprint_path: Path to the Blueprint asset
        function_name: Name for the new function
        inputs: Optional list of input parameters, each with 'name' and 'type'
                (e.g., [{"name": "Health", "type": "float"}, {"name": "Target", "type": "actor"}])
        outputs: Optional list of output parameters, each with 'name' and 'type'
                 (e.g., [{"name": "Success", "type": "bool"}])
        is_pure: Whether the function is pure (no side effects, no exec pins)

    Returns:
        Dictionary with function creation result
    """
    blueprint = resolve_blueprint(blueprint_path)

    # Add function graph
    func_graph = unreal.BlueprintEditorLibrary.add_function_graph(blueprint, function_name)

    if not func_graph:
        raise ProcessingError(
            f"Failed to add function '{function_name}' to Blueprint",
            operation="blueprint_add_function",
            details={"blueprint_path": blueprint_path, "function_name": function_name},
        )

    # Add input parameters
    input_count = 0
    if inputs:
        for param in inputs:
            param_name = param.get("name")
            param_type = param.get("type", "string")
            if param_name:
                pin_type = _make_pin_type(param_type, param.get("sub_type"))
                unreal.BlueprintEditorLibrary.add_function_input(blueprint, function_name, param_name, pin_type)
                input_count += 1

    # Add output parameters
    output_count = 0
    if outputs:
        for param in outputs:
            param_name = param.get("name")
            param_type = param.get("type", "bool")
            if param_name:
                pin_type = _make_pin_type(param_type, param.get("sub_type"))
                unreal.BlueprintEditorLibrary.add_function_output(blueprint, function_name, param_name, pin_type)
                output_count += 1

    # Set pure flag
    if is_pure:
        unreal.BlueprintEditorLibrary.set_is_function_pure(blueprint, function_name, True)

    compile_and_save(blueprint, blueprint_path)
    log_info(f"Added function '{function_name}' to {blueprint_path}")

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "functionName": function_name,
        "inputCount": input_count,
        "outputCount": output_count,
        "isPure": is_pure,
    }


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "function_name": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("blueprint_remove_function")
@safe_operation("blueprint")
def remove_function(
    blueprint_path: str,
    function_name: str,
) -> Dict[str, Any]:
    """
    Remove a custom function graph from a Blueprint.

    Args:
        blueprint_path: Path to the Blueprint asset
        function_name: Name of the function to remove

    Returns:
        Dictionary with removal result
    """
    blueprint = resolve_blueprint(blueprint_path)

    success = unreal.BlueprintEditorLibrary.remove_function_graph(blueprint, function_name)

    if not success:
        raise ProcessingError(
            f"Failed to remove function '{function_name}' — may not exist",
            operation="blueprint_remove_function",
            details={"blueprint_path": blueprint_path, "function_name": function_name},
        )

    compile_and_save(blueprint, blueprint_path)
    log_info(f"Removed function '{function_name}' from {blueprint_path}")

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "functionName": function_name,
    }


# ============================================================================
# Event Dispatcher Operations
# ============================================================================


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "dispatcher_name": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("blueprint_add_event_dispatcher")
@safe_operation("blueprint")
def add_event_dispatcher(
    blueprint_path: str,
    dispatcher_name: str,
) -> Dict[str, Any]:
    """
    Add an event dispatcher (multicast delegate) to a Blueprint.

    Args:
        blueprint_path: Path to the Blueprint asset
        dispatcher_name: Name for the event dispatcher

    Returns:
        Dictionary with event dispatcher creation result
    """
    blueprint = resolve_blueprint(blueprint_path)

    pin_type = unreal.EdGraphPinType()
    pin_type.pin_category = "delegate"

    success = unreal.BlueprintEditorLibrary.add_variable(blueprint, dispatcher_name, pin_type, True)

    if not success:
        raise ProcessingError(
            f"Failed to add event dispatcher '{dispatcher_name}'",
            operation="blueprint_add_event_dispatcher",
            details={
                "blueprint_path": blueprint_path,
                "dispatcher_name": dispatcher_name,
            },
        )

    compile_and_save(blueprint, blueprint_path)
    log_info(f"Added event dispatcher '{dispatcher_name}' to {blueprint_path}")

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "dispatcherName": dispatcher_name,
    }


# ============================================================================
# Graph Introspection
# ============================================================================


def _get_blueprint_variables(blueprint):
    """Extract variable information from a Blueprint.

    Args:
        blueprint: The Blueprint object

    Returns:
        List of variable info dictionaries
    """
    variables = []

    # Get new variables defined in this Blueprint
    new_vars = blueprint.get_editor_property("new_variables")
    if new_vars:
        for var_desc in new_vars:
            var_info = {
                "name": str(var_desc.get_editor_property("var_name")),
                "guid": str(var_desc.get_editor_property("var_guid")),
            }

            # Get pin type info
            pin_type = var_desc.get_editor_property("var_type")
            if pin_type:
                var_info["category"] = str(pin_type.get_editor_property("pin_category"))
                sub_obj = pin_type.get_editor_property("pin_sub_category_object")
                if sub_obj:
                    var_info["subType"] = sub_obj.get_name()

            # Get flags
            var_info["instanceEditable"] = bool(var_desc.get_editor_property("property_flags") & 4)

            # Get category
            category = var_desc.get_editor_property("category")
            if category:
                var_info["editorCategory"] = str(category)

            variables.append(var_info)

    return variables


def _get_blueprint_functions(blueprint):
    """Extract function graph information from a Blueprint.

    Args:
        blueprint: The Blueprint object

    Returns:
        List of function info dictionaries
    """
    functions = []

    func_graphs = blueprint.get_editor_property("function_graphs")
    if func_graphs:
        for graph in func_graphs:
            func_info = {
                "name": graph.get_name(),
            }

            # Count nodes in the graph
            nodes = graph.get_editor_property("nodes")
            if nodes:
                func_info["nodeCount"] = len(nodes)
            else:
                func_info["nodeCount"] = 0

            functions.append(func_info)

    return functions


def _get_blueprint_components(blueprint):
    """Extract component hierarchy from a Blueprint.

    Args:
        blueprint: The Blueprint object

    Returns:
        List of component info dictionaries
    """
    components = []

    scs = blueprint.simple_construction_script
    if not scs:
        return components

    all_nodes = scs.get_all_nodes()
    for node in all_nodes:
        template = node.component_template
        if not template:
            continue

        comp_info = {
            "name": template.get_name(),
            "class": template.get_class().get_name(),
        }

        # Get relative transform for scene components
        if isinstance(template, unreal.SceneComponent):
            loc = template.get_editor_property("relative_location")
            rot = template.get_editor_property("relative_rotation")
            scale = template.get_editor_property("relative_scale3d")
            comp_info["location"] = [loc.x, loc.y, loc.z]
            comp_info["rotation"] = [rot.roll, rot.pitch, rot.yaw]
            comp_info["scale"] = [scale.x, scale.y, scale.z]

        # Check for parent
        parent_node = node.get_editor_property("parent_component_or_variable_name")
        if parent_node:
            comp_info["parent"] = str(parent_node)

        components.append(comp_info)

    return components


def _get_graph_nodes(blueprint, detail_level="flow"):
    """Extract node information from Blueprint graphs.

    Args:
        blueprint: The Blueprint object
        detail_level: 'summary', 'flow', or 'full'

    Returns:
        List of graph info dictionaries
    """
    graphs = []

    # Get uber graphs (event graphs)
    uber_graphs = blueprint.get_editor_property("uber_graph_pages")
    if uber_graphs:
        for graph in uber_graphs:
            graph_info = _extract_graph_info(graph, detail_level, "EventGraph")
            graphs.append(graph_info)

    # Get function graphs
    func_graphs = blueprint.get_editor_property("function_graphs")
    if func_graphs:
        for graph in func_graphs:
            graph_info = _extract_graph_info(graph, detail_level, "Function")
            graphs.append(graph_info)

    return graphs


def _extract_exec_connections(pins):
    """Extract exec pin connections from a list of pins."""
    connections = []
    for pin in pins:
        pin_category = str(pin.get_editor_property("pin_type").pin_category)
        if pin_category != "exec":
            continue
        linked = pin.get_editor_property("linked_to")
        if linked:
            for linked_pin in linked:
                owner = linked_pin.get_owning_node()
                connections.append(str(owner.get_editor_property("node_guid")))
    return connections


def _extract_full_pin_info(pin):
    """Extract complete pin information including connections."""
    pin_info = {
        "name": str(pin.get_editor_property("pin_name")),
        "direction": str(pin.get_editor_property("direction")),
        "type": str(pin.get_editor_property("pin_type").pin_category),
    }
    default = pin.get_editor_property("default_value")
    if default:
        pin_info["defaultValue"] = str(default)

    linked = pin.get_editor_property("linked_to")
    if linked:
        pin_info["connections"] = [
            {
                "nodeId": str(lp.get_owning_node().get_editor_property("node_guid")),
                "pinName": str(lp.get_editor_property("pin_name")),
            }
            for lp in linked
        ]
    return pin_info


def _extract_node_info(node, detail_level):
    """Extract information from a single graph node at the given detail level."""
    node_info = {"id": str(node.get_editor_property("node_guid"))}
    node_info["class"] = node.get_class().get_name()

    node_comment = node.get_editor_property("node_comment")
    if node_comment:
        node_info["comment"] = str(node_comment)

    if detail_level == "summary":
        return node_info

    # Flow and full levels include position
    node_info["position"] = {
        "x": node.get_editor_property("node_pos_x"),
        "y": node.get_editor_property("node_pos_y"),
    }

    pins = node.get_editor_property("pins") or []
    if detail_level == "flow":
        exec_connections = _extract_exec_connections(pins)
        if exec_connections:
            node_info["execConnections"] = exec_connections
    elif detail_level == "full":
        node_info["pins"] = [_extract_full_pin_info(p) for p in pins]

    return node_info


def _extract_graph_info(graph, detail_level, graph_type):
    """Extract info from a single graph.

    Args:
        graph: The EdGraph object
        detail_level: 'summary', 'flow', or 'full'
        graph_type: Type label ('EventGraph', 'Function', etc.)

    Returns:
        Dictionary with graph information
    """
    graph_info = {
        "name": graph.get_name(),
        "type": graph_type,
    }

    nodes = graph.get_editor_property("nodes")
    if not nodes:
        graph_info["nodes"] = []
        graph_info["nodeCount"] = 0
        return graph_info

    graph_info["nodeCount"] = len(nodes)
    graph_info["nodes"] = [_extract_node_info(n, detail_level) for n in nodes]
    return graph_info


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "fields": [TypeRule(list, allow_none=True)],
        "detail_level": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("blueprint_get_graph")
@safe_operation("blueprint")
def get_graph(
    blueprint_path: str,
    fields: Optional[List[str]] = None,
    detail_level: str = "flow",
) -> Dict[str, Any]:
    """
    Get detailed Blueprint graph information with selective field filtering.

    Args:
        blueprint_path: Path to the Blueprint asset
        fields: Optional list of fields to include. Available fields:
                'variables', 'functions', 'components', 'graphs', 'parent_class',
                'interfaces', 'status', 'asset_info'
                If not specified, returns all fields.
        detail_level: Detail level for graph nodes: 'summary', 'flow' (default), or 'full'
                      - summary: Node IDs and classes only
                      - flow: Nodes with exec pin connections (default)
                      - full: All pins, connections, types, and default values

    Returns:
        Dictionary with Blueprint graph information
    """
    blueprint = resolve_blueprint(blueprint_path)

    if detail_level not in ("summary", "flow", "full"):
        detail_level = "flow"

    # Determine which fields to include
    all_fields = {
        "variables",
        "functions",
        "components",
        "graphs",
        "parent_class",
        "interfaces",
        "status",
        "asset_info",
    }
    requested_fields = set(fields) if fields else all_fields

    result = {
        "success": True,
        "blueprintPath": blueprint_path,
        "blueprintName": blueprint.get_name(),
    }

    if "parent_class" in requested_fields:
        parent = blueprint.get_editor_property("parent_class")
        result["parentClass"] = parent.get_name() if parent else None

    if "variables" in requested_fields:
        result["variables"] = _get_blueprint_variables(blueprint)

    if "functions" in requested_fields:
        result["functions"] = _get_blueprint_functions(blueprint)

    if "components" in requested_fields:
        result["components"] = _get_blueprint_components(blueprint)

    if "graphs" in requested_fields:
        result["graphs"] = _get_graph_nodes(blueprint, detail_level)

    if "interfaces" in requested_fields:
        interfaces = []
        implemented = blueprint.get_editor_property("implemented_interfaces")
        if implemented:
            for iface in implemented:
                iface_class = iface.get_editor_property("interface")
                if iface_class:
                    interfaces.append(iface_class.get_name())
        result["interfaces"] = interfaces

    if "status" in requested_fields:
        generated = blueprint.generated_class()
        result["status"] = {
            "compiled": generated is not None,
            "isDirty": (
                blueprint.get_editor_property("is_package_dirty") if hasattr(blueprint, "is_package_dirty") else None
            ),
        }

    if "asset_info" in requested_fields:
        result["assetInfo"] = {
            "path": blueprint_path,
            "name": blueprint.get_name(),
        }

    return result


# ============================================================================
# Enhanced Compilation
# ============================================================================


@validate_inputs({"blueprint_path": [RequiredRule(), AssetPathRule()]})
@handle_unreal_errors("blueprint_compile_enhanced")
@safe_operation("blueprint")
def compile_enhanced(blueprint_path: str) -> Dict[str, Any]:
    """
    Compile a Blueprint with structured error reporting for AI self-correction.

    Returns categorized errors at node, graph, and component levels
    to help identify and fix issues programmatically.

    Args:
        blueprint_path: Path to the Blueprint asset

    Returns:
        Dictionary with detailed compilation result including:
        - compilationSuccess: Whether compilation succeeded
        - errors: List of categorized error objects
        - warnings: List of warning objects
        - nodeErrors: Errors specific to individual nodes
        - graphErrors: Errors at the graph level
    """
    blueprint = resolve_blueprint(blueprint_path)

    # Perform compilation
    unreal.KismetEditorUtilities.compile_blueprint(blueprint)

    # Check compilation status
    generated_class = blueprint.generated_class()
    compilation_success = generated_class is not None

    result = {
        "success": True,
        "blueprintPath": blueprint_path,
        "compilationSuccess": compilation_success,
        "errors": [],
        "warnings": [],
        "nodeErrors": [],
        "graphErrors": [],
    }

    # Collect node-level errors from graphs
    uber_graphs = blueprint.get_editor_property("uber_graph_pages") or []
    func_graphs = blueprint.get_editor_property("function_graphs") or []

    all_graphs = list(uber_graphs) + list(func_graphs)

    for graph in all_graphs:
        graph_name = graph.get_name()
        nodes = graph.get_editor_property("nodes") or []

        for node in nodes:
            has_error = node.get_editor_property("error_type") if hasattr(node, "error_type") else 0
            if has_error and has_error > 0:
                error_msg = node.get_editor_property("error_msg") if hasattr(node, "error_msg") else "Unknown error"
                node_error = {
                    "graph": graph_name,
                    "nodeId": str(node.get_editor_property("node_guid")),
                    "nodeClass": node.get_class().get_name(),
                    "errorType": has_error,
                    "message": str(error_msg),
                }
                result["nodeErrors"].append(node_error)

    # Overall error summary
    if not compilation_success:
        result["errors"].append(
            {
                "level": "blueprint",
                "message": "Blueprint compilation failed — check nodeErrors for details",
            }
        )

    if compilation_success:
        log_info(f"Blueprint compiled successfully: {blueprint_path}")
    else:
        log_error(f"Blueprint compilation failed: {blueprint_path}")

    # Save after compilation
    unreal.EditorAssetLibrary.save_asset(blueprint_path)

    return result


# ============================================================================
# Interface Operations
# ============================================================================


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "interface_path": [RequiredRule(), AssetPathRule()],
    }
)
@handle_unreal_errors("blueprint_implement_interface")
@safe_operation("blueprint")
def implement_interface(
    blueprint_path: str,
    interface_path: str,
) -> Dict[str, Any]:
    """
    Add a Blueprint Interface implementation to a Blueprint.

    Args:
        blueprint_path: Path to the Blueprint asset
        interface_path: Path to the Blueprint Interface asset
                        (e.g., '/Game/Interfaces/BPI_Interactable')

    Returns:
        Dictionary with interface implementation result
    """
    blueprint = resolve_blueprint(blueprint_path)

    # Load the interface
    interface_asset = unreal.EditorAssetLibrary.load_asset(interface_path)
    if not interface_asset:
        raise ProcessingError(
            f"Interface not found: {interface_path}",
            operation="blueprint_implement_interface",
            details={"interface_path": interface_path},
        )

    # Add the interface
    success = unreal.BlueprintEditorLibrary.add_interface(blueprint, interface_asset)

    if not success:
        raise ProcessingError(
            f"Failed to implement interface '{interface_path}'",
            operation="blueprint_implement_interface",
            details={
                "blueprint_path": blueprint_path,
                "interface_path": interface_path,
            },
        )

    compile_and_save(blueprint, blueprint_path)
    log_info(f"Implemented interface '{interface_path}' on {blueprint_path}")

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "interfacePath": interface_path,
    }
