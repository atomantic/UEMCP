"""
Blueprint graph editing operations for manipulating Blueprint variables,
components, functions, event dispatchers, graph introspection, and action discovery.
"""

import inspect as _inspect
from typing import Any, Dict, List, Optional

import unreal

from utils.blueprint_helpers import compile_and_save, resolve_blueprint
from utils.error_handling import (
    AssetPathRule,
    ListLengthRule,
    ProcessingError,
    RequiredRule,
    TypeRule,
    ValidationError,
    handle_unreal_errors,
    safe_operation,
    validate_inputs,
)
from utils.general import create_rotator, create_vector, log_error
from utils.general import log_debug as log_info

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

# Supported component class names for add_component.
# Note: "BoxCollisionComponent" is a friendly alias for UE's BoxComponent.
# The internal UE class name is "BoxComponent" but we use the more descriptive
# name for the API surface.
SUPPORTED_COMPONENT_CLASSES = (
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
)


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
            if default_sub.startswith("/Script/"):
                # Loadable object path (struct/object types)
                sub_obj = unreal.load_object(None, default_sub)
                if sub_obj:
                    pin_type.pin_sub_category_object = sub_obj
            else:
                # String sub-category (e.g., "double" for real/float types)
                pin_type.pin_sub_category = default_sub
    else:
        # Try treating it as a struct/object path directly
        pin_type.pin_category = "struct"
        # Use load_object for /Script/ paths, load_asset for /Game/ paths
        if var_type.startswith("/Script/"):
            sub_obj = unreal.load_object(None, var_type)
        else:
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


def _validate_param_list(params, direction, function_name):
    """Validate that a parameter list contains only dicts with a 'name' key.

    Args:
        params: The list to validate (may be None)
        direction: 'input' or 'output' — used in error messages
        function_name: Name of the parent function — used in error messages

    Raises:
        ValidationError: If params is not a list or contains non-dict elements
    """
    if params is None:
        return
    if not isinstance(params, list):
        raise ValidationError(
            f"Function '{function_name}' {direction}s must be a list, got {type(params).__name__}",
            operation="blueprint_function_params",
            details={"function_name": function_name, "direction": direction},
        )
    for i, item in enumerate(params):
        if not isinstance(item, dict):
            raise ValidationError(
                f"Function '{function_name}' {direction}[{i}] must be a dict, got {type(item).__name__}",
                operation="blueprint_function_params",
                details={"function_name": function_name, "direction": direction, "index": i},
            )


def _add_function_params(blueprint, function_name, inputs=None, outputs=None):
    """Add input and output parameters to a function graph on a Blueprint.

    Args:
        blueprint: The Blueprint asset
        function_name: Name of the function to add params to
        inputs: Optional list of input param dicts with 'name', 'type', optional 'sub_type'
        outputs: Optional list of output param dicts with 'name', 'type', optional 'sub_type'

    Returns:
        Tuple of (input_count, output_count)

    Raises:
        ValidationError: If inputs/outputs is not a list or contains non-dict elements
    """
    _validate_param_list(inputs, "input", function_name)
    _validate_param_list(outputs, "output", function_name)

    input_count = 0
    if inputs:
        for param in inputs:
            param_name = param.get("name")
            param_type = param.get("type", "string")
            if param_name:
                pin_type = _make_pin_type(param_type, param.get("sub_type"))
                unreal.BlueprintEditorLibrary.add_function_input(blueprint, function_name, param_name, pin_type)
                input_count += 1

    output_count = 0
    if outputs:
        for param in outputs:
            param_name = param.get("name")
            param_type = param.get("type", "bool")
            if param_name:
                pin_type = _make_pin_type(param_type, param.get("sub_type"))
                unreal.BlueprintEditorLibrary.add_function_output(blueprint, function_name, param_name, pin_type)
                output_count += 1

    return input_count, output_count


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

    # Normalize None to default (validation allows None but UE API requires bool)
    editable = True if is_instance_editable is None else is_instance_editable
    success = unreal.BlueprintEditorLibrary.add_variable(blueprint, variable_name, pin_type, editable)

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


def _coerce_value_for_cdo(value, variable_name: str):
    """Convert a JSON-friendly value to the appropriate Unreal type for CDO assignment.

    Handles:
        - Primitives (bool, int, float, str): passed through as-is
        - 3-element lists: converted to unreal.Vector (use value_type='rotator' in caller for Rotator)
        - 4-element lists: converted to unreal.LinearColor
        - /Script/ paths: loaded via unreal.load_object (native class references)
        - /Game/ and /Engine/ paths: loaded via EditorAssetLibrary.load_asset

    Returns:
        The coerced value ready for set_editor_property()
    """
    if isinstance(value, (bool, int, float)):
        return value

    if isinstance(value, str):
        if value.startswith("/Script/"):
            loaded = unreal.load_object(None, value)
            if not loaded:
                raise ProcessingError(
                    f"Object not found for variable '{variable_name}': {value}",
                    operation="blueprint_set_variable_default",
                    details={"variable_name": variable_name, "object_path": value},
                )
            return loaded
        if value.startswith("/Game/") or value.startswith("/Engine/"):
            loaded = unreal.EditorAssetLibrary.load_asset(value)
            if not loaded:
                raise ProcessingError(
                    f"Asset not found for variable '{variable_name}': {value}",
                    operation="blueprint_set_variable_default",
                    details={"variable_name": variable_name, "asset_path": value},
                )
            return loaded
        return value

    if isinstance(value, list):
        if len(value) == 3:
            return create_vector(value)
        if len(value) == 4:
            return unreal.LinearColor(value[0], value[1], value[2], value[3])
        raise ProcessingError(
            f"List value for '{variable_name}' must have 3 or 4 elements, got {len(value)}",
            operation="blueprint_set_variable_default",
            details={"variable_name": variable_name, "value": value},
        )

    raise ProcessingError(
        f"Unsupported value type for '{variable_name}': {type(value).__name__}",
        operation="blueprint_set_variable_default",
        details={
            "variable_name": variable_name,
            "value_type": type(value).__name__,
            "supported_types": ["bool", "int", "float", "str", "list"],
        },
    )


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "variable_name": [RequiredRule(), TypeRule(str)],
        "value": [],
        "value_type": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("blueprint_set_variable_default")
@safe_operation("blueprint")
def set_variable_default(
    blueprint_path: str,
    variable_name: str,
    value: Any,
    value_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Set the default value of a Blueprint variable on the Class Default Object.

    Args:
        blueprint_path: Path to the Blueprint asset
        variable_name: Name of the variable whose default to set
        value: The default value (type depends on variable):
               - Primitives: bool, int, float, string
               - Vectors: [x, y, z] array
               - Rotators: [roll, pitch, yaw] array (requires value_type='rotator')
               - Colors: [r, g, b, a] array
               - Asset references: string path like '/Game/Meshes/MyMesh'
        value_type: Optional type hint to disambiguate values.
                    Use 'rotator' to interpret a 3-element list as Rotator instead of Vector.

    Returns:
        Dictionary with the variable name and value that was set
    """
    blueprint = resolve_blueprint(blueprint_path)

    # Compile first to ensure CDO exists and is up to date
    unreal.KismetEditorUtilities.compile_blueprint(blueprint)

    gen_class = blueprint.generated_class()
    if not gen_class:
        raise ProcessingError(
            f"Blueprint has no generated class: {blueprint_path}",
            operation="blueprint_set_variable_default",
            details={"blueprint_path": blueprint_path},
        )

    cdo = gen_class.get_default_object()
    if not cdo:
        raise ProcessingError(
            f"Could not get Class Default Object for: {blueprint_path}",
            operation="blueprint_set_variable_default",
            details={"blueprint_path": blueprint_path},
        )

    # Handle rotator disambiguation: 3-element list + value_type='rotator'
    if value_type and value_type.lower() == "rotator" and isinstance(value, list) and len(value) == 3:
        coerced = create_rotator(value)
    else:
        coerced = _coerce_value_for_cdo(value, variable_name)

    cdo.set_editor_property(variable_name, coerced)

    # CDO property changes may not mark the package dirty — force save
    compile_and_save(blueprint, blueprint_path, force_save=True)
    log_info(f"Set default for '{variable_name}' = {value} on {blueprint_path}")

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "variableName": variable_name,
        "value": value,
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
                         'SkeletalMeshComponent', 'WidgetComponent',
                         'SplineComponent', 'DecalComponent',
                         'BillboardComponent', 'TextRenderComponent')
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
                    "supported_classes": list(SUPPORTED_COMPONENT_CLASSES),
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
            log_info(f"Parent component '{parent_component}' not found, adding '{component_name}' as root")
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

    input_count, output_count = _add_function_params(blueprint, function_name, inputs, outputs)

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
                blueprint.is_package_dirty()
                if hasattr(blueprint, "is_package_dirty") and callable(getattr(blueprint, "is_package_dirty", None))
                else None
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

    Collects node-level errors from all graphs and provides a blueprint-level
    compilation status summary.

    Args:
        blueprint_path: Path to the Blueprint asset

    Returns:
        Dictionary with detailed compilation result including:
        - compilationSuccess: Whether compilation succeeded
        - errors: List of blueprint-level error summaries
        - nodeErrors: Errors specific to individual nodes (with graph, nodeId, nodeClass)
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
        "nodeErrors": [],
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

    # UE expects an interface class, not the asset itself.
    # For Blueprint interfaces, get the generated class.
    interface_class = interface_asset
    if hasattr(interface_asset, "generated_class") and callable(interface_asset.generated_class):
        gen_class = interface_asset.generated_class()
        if gen_class:
            interface_class = gen_class

    # Add the interface
    success = unreal.BlueprintEditorLibrary.add_interface(blueprint, interface_class)

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


@validate_inputs(
    {
        "interface_path": [RequiredRule(), AssetPathRule()],
        "functions": [TypeRule(list, allow_none=True)],
    }
)
@handle_unreal_errors("blueprint_create_interface")
@safe_operation("blueprint")
def create_interface(
    interface_path: str,
    functions: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Create a Blueprint Interface asset with optional function signatures.

    Args:
        interface_path: Full asset path for the interface
                        (e.g., '/Game/Interfaces/BPI_Interactable')
        functions: Optional list of function definitions, each a dict with:
                   - name (str): Function name. Entries without 'name' are skipped.
                   - inputs (list[dict], optional): Input params [{name, type}]
                   - outputs (list[dict], optional): Output params [{name, type}]

    Returns:
        Dictionary with interface creation result including functionCount,
        functions list, and optional failedFunctions/warning if any failed.
    """
    last_slash = interface_path.rfind("/")
    target_folder = interface_path[:last_slash]
    asset_name = interface_path[last_slash + 1 :]

    if not asset_name:
        raise ProcessingError(
            "Interface asset name cannot be empty",
            operation="blueprint_create_interface",
            details={"interface_path": interface_path},
        )

    # Check if asset already exists
    if unreal.EditorAssetLibrary.does_asset_exist(interface_path):
        raise ProcessingError(
            f"Asset already exists at {interface_path}",
            operation="blueprint_create_interface",
            details={"interface_path": interface_path},
        )

    # Ensure target folder exists
    if not unreal.EditorAssetLibrary.does_directory_exist(target_folder):
        unreal.EditorAssetLibrary.make_directory(target_folder)

    # Create the Blueprint Interface asset
    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.BlueprintFactory()
    factory.set_editor_property("blueprint_type", unreal.BlueprintType.BPTYPE_INTERFACE)

    interface_bp = asset_tools.create_asset(
        asset_name=asset_name,
        package_path=target_folder,
        asset_class=unreal.Blueprint,
        factory=factory,
    )

    if not interface_bp:
        raise ProcessingError(
            f"Failed to create Blueprint Interface at {interface_path}",
            operation="blueprint_create_interface",
            details={"interface_path": interface_path},
        )

    # Add function signatures
    function_count = 0
    function_names = []
    failed_functions = []
    if functions:
        for func_def in functions:
            if not isinstance(func_def, dict):
                raise ValidationError(
                    "Each function definition must be a dict with at least a 'name' key",
                    operation="blueprint_create_interface",
                    details={"invalid_element": str(func_def)},
                )

            func_name = func_def.get("name")
            if not func_name:
                continue

            func_graph = unreal.BlueprintEditorLibrary.add_function_graph(interface_bp, func_name)
            if not func_graph:
                log_error(f"Failed to add function '{func_name}' to interface")
                failed_functions.append(func_name)
                continue

            _add_function_params(
                interface_bp,
                func_name,
                func_def.get("inputs"),
                func_def.get("outputs"),
            )

            function_count += 1
            function_names.append(func_name)

    compile_and_save(interface_bp, interface_path)
    log_info(f"Created Blueprint Interface: {interface_path} with {function_count} functions")

    result = {
        "success": True,
        "interfacePath": interface_path,
        "functionCount": function_count,
        "functions": function_names,
    }

    if failed_functions:
        result["failedFunctions"] = failed_functions
        result["warning"] = f"Failed to add {len(failed_functions)} function(s): {', '.join(failed_functions)}"

    return result


# ============================================================================
# Action Discovery
# ============================================================================

# UE function libraries to search for available Blueprint actions
_FUNCTION_LIBRARY_NAMES = [
    "KismetMathLibrary",
    "MathLibrary",
    "KismetSystemLibrary",
    "SystemLibrary",
    "GameplayStatics",
    "KismetStringLibrary",
    "StringLibrary",
    "KismetArrayLibrary",
    "ArrayLibrary",
    "KismetTextLibrary",
    "TextLibrary",
    "BlueprintMapLibrary",
    "MapLibrary",
    "BlueprintSetLibrary",
    "SetLibrary",
    "KismetNodeHelperLibrary",
    "KismetInputLibrary",
    "BlueprintPathsLibrary",
    "KismetRenderingLibrary",
    "AIBlueprintHelperLibrary",
    "NavigationSystemV1",
    "HeadMountedDisplayFunctionLibrary",
    "WidgetBlueprintLibrary",
    "WidgetLayoutLibrary",
    "SlateBlueprintLibrary",
]

_LIBRARY_CATEGORY_MAP = {
    "KismetMathLibrary": "math",
    "MathLibrary": "math",
    "KismetSystemLibrary": "system",
    "SystemLibrary": "system",
    "GameplayStatics": "gameplay",
    "KismetStringLibrary": "string",
    "StringLibrary": "string",
    "KismetArrayLibrary": "array",
    "ArrayLibrary": "array",
    "KismetTextLibrary": "text",
    "TextLibrary": "text",
    "BlueprintMapLibrary": "map",
    "MapLibrary": "map",
    "BlueprintSetLibrary": "set",
    "SetLibrary": "set",
    "KismetNodeHelperLibrary": "utility",
    "KismetInputLibrary": "input",
    "BlueprintPathsLibrary": "utility",
    "KismetRenderingLibrary": "rendering",
    "AIBlueprintHelperLibrary": "ai",
    "NavigationSystemV1": "navigation",
    "HeadMountedDisplayFunctionLibrary": "vr",
    "WidgetBlueprintLibrary": "ui",
    "WidgetLayoutLibrary": "ui",
    "SlateBlueprintLibrary": "ui",
}

# Derived from _LIBRARY_CATEGORY_MAP — single source of truth for valid categories
_VALID_LIBRARY_CATEGORIES = frozenset(_LIBRARY_CATEGORY_MAP.values()) | {None, "all"}

# All valid category values accepted by discover_actions (libraries + special)
_ALL_VALID_CATEGORIES = _VALID_LIBRARY_CATEGORIES | {"class", "events", "flow"}

# Common event types available in Blueprints
_COMMON_EVENTS = [
    {
        "name": "BeginPlay",
        "nodeType": "Event",
        "category": "events",
        "description": "Called when play begins for this actor",
    },
    {
        "name": "Tick",
        "nodeType": "Event",
        "category": "events",
        "description": "Called every frame",
        "parameters": [{"name": "DeltaSeconds", "type": "float"}],
    },
    {
        "name": "EndPlay",
        "nodeType": "Event",
        "category": "events",
        "description": "Called when play ends for this actor",
    },
    {
        "name": "ActorBeginOverlap",
        "nodeType": "Event",
        "category": "events",
        "description": "Called when another actor begins to overlap",
    },
    {
        "name": "ActorEndOverlap",
        "nodeType": "Event",
        "category": "events",
        "description": "Called when another actor stops overlapping",
    },
    {
        "name": "AnyDamage",
        "nodeType": "Event",
        "category": "events",
        "description": "Called when the actor receives damage",
    },
    {
        "name": "OnHit",
        "nodeType": "Event",
        "category": "events",
        "description": "Called when this actor hits or is hit by something",
    },
    {
        "name": "OnDestroyed",
        "nodeType": "Event",
        "category": "events",
        "description": "Called when the actor is destroyed",
    },
    {
        "name": "CustomEvent",
        "nodeType": "Event",
        "category": "events",
        "description": "Create a custom event (specify event_name in blueprint_add_node)",
    },
]

# Control flow nodes available in Blueprints
_FLOW_NODES = [
    {"name": "Branch", "nodeType": "Branch", "category": "flow", "description": "Conditional branch (if/else)"},
    {
        "name": "Sequence",
        "nodeType": "Sequence",
        "category": "flow",
        "description": "Execute output pins in sequential order",
    },
    {
        "name": "ForEachLoop",
        "nodeType": "ForEachLoop",
        "category": "flow",
        "description": "Loop over each element in an array",
    },
    {"name": "WhileLoop", "nodeType": "WhileLoop", "category": "flow", "description": "Loop while condition is true"},
    {
        "name": "FlipFlop",
        "nodeType": "FlipFlop",
        "category": "flow",
        "description": "Toggle between two execution paths each call",
    },
    {
        "name": "DoOnce",
        "nodeType": "DoOnce",
        "category": "flow",
        "description": "Execute only the first time, ignore subsequent calls",
    },
    {
        "name": "Gate",
        "nodeType": "Gate",
        "category": "flow",
        "description": "Controllable gate that can be opened/closed",
    },
    {
        "name": "Delay",
        "nodeType": "Delay",
        "category": "flow",
        "description": "Wait for a specified duration before continuing",
    },
    {
        "name": "Select",
        "nodeType": "Select",
        "category": "flow",
        "description": "Select output value based on an index",
    },
    {"name": "DoN", "nodeType": "DoN", "category": "flow", "description": "Execute up to N times then stop"},
    {
        "name": "MultiGate",
        "nodeType": "MultiGate",
        "category": "flow",
        "description": "Route execution to multiple outputs sequentially or randomly",
    },
    {
        "name": "ForLoopWithBreak",
        "nodeType": "ForLoopWithBreak",
        "category": "flow",
        "description": "For loop with integer index and optional break",
    },
]


def _extract_method_info(cls, method_name, class_name, category="class", attr=None):
    """Extract callable method info for discover_actions results.

    Args:
        cls: The UE class object
        method_name: Name of the method to inspect
        class_name: String name of the class (for display)
        category: Category label for this action
        attr: Pre-fetched attribute (avoids redundant getattr if caller already has it)

    Returns:
        Method info dict or None if not callable
    """
    if attr is None:
        attr = getattr(cls, method_name, None)
    if attr is None or not callable(attr):
        return None

    info = {
        "name": method_name,
        "functionName": f"{class_name}.{method_name}",
        "nodeType": "CallFunction",
        "className": class_name,
        "category": category,
    }

    doc = getattr(attr, "__doc__", None)
    if doc:
        first_line = doc.strip().split("\n")[0].strip()
        if first_line:
            info["description"] = first_line

    return info


def _enrich_with_parameters(actions):
    """Add parameter details to action infos via inspect.signature.

    Called only on the final result set to avoid expensive reflection on
    items that will be filtered out or exceed the limit.

    Args:
        actions: List of action info dicts (modified in place)
    """
    for info in actions:
        class_name = info.get("className")
        method_name = info.get("name")
        if not class_name or not method_name:
            continue

        cls = getattr(unreal, class_name, None)
        if cls is None:
            continue

        attr = getattr(cls, method_name, None)
        if attr is None:
            continue

        try:
            sig = _inspect.signature(attr)
            params = []
            for pname, param in sig.parameters.items():
                if pname == "self":
                    continue
                param_info = {"name": pname}
                if param.annotation != _inspect.Parameter.empty:
                    ann = param.annotation
                    param_info["type"] = getattr(ann, "__name__", str(ann))
                if param.default != _inspect.Parameter.empty:
                    param_info["hasDefault"] = True
                params.append(param_info)
            info["parameters"] = params
        except (ValueError, TypeError):
            info["parameters"] = []


def _deep_copy_action(action):
    """Create a copy of an action dict, including the nested parameters list."""
    copy = dict(action)
    if "parameters" in copy and isinstance(copy["parameters"], list):
        copy["parameters"] = [dict(p) for p in copy["parameters"]]
    return copy


def _enrich_with_add_node_params(actions):
    """Add blueprint_add_node parameter mapping to each action.

    Provides an ``addNodeParams`` dict showing which parameters to pass
    to ``blueprint_add_node`` for each discovered action. Function names
    use the exact UE Python binding name (snake_case), which is the format
    accepted by ``BlueprintEditorLibrary.add_call_function_node``.

    Note: Utility/math shortcuts (e.g., ``PrintString``, ``Add``) use
    different friendly names and are not discovered via reflection. They
    are documented in ``blueprint_add_node``'s ``node_type`` parameter.

    Args:
        actions: List of action info dicts (modified in place)
    """
    for action in actions:
        node_type = action.get("nodeType", "")
        if node_type == "Event":
            if action.get("name") == "CustomEvent":
                action["addNodeParams"] = {
                    "node_type": "CustomEvent",
                    "event_name": "<your_event_name>",
                }
            else:
                action["addNodeParams"] = {"node_type": action["name"]}
        elif node_type == "CallFunction":
            params = {
                "node_type": "CallFunction",
                "function_name": action["name"],
            }
            class_name = action.get("className")
            if class_name:
                params["target_class"] = class_name
            action["addNodeParams"] = params
        else:
            # Flow nodes and others — name maps directly to node_type
            action["addNodeParams"] = {"node_type": action["name"]}


def _discover_class_actions(class_name):
    """Discover callable methods on a UE class via reflection.

    Args:
        class_name: Name of the UE class (e.g., 'Actor', 'Character')

    Returns:
        List of action info dicts
    """
    cls = getattr(unreal, class_name, None)
    if cls is None:
        return []

    actions = []
    for name in sorted(dir(cls)):
        if name.startswith("_"):
            continue
        attr = getattr(cls, name, None)
        if attr is None or not callable(attr):
            continue
        info = _extract_method_info(cls, name, class_name, category="class", attr=attr)
        if info:
            actions.append(info)

    return actions


def _discover_library_actions(filter_category=None):
    """Discover functions from UE function libraries.

    Args:
        filter_category: If set, only scan libraries matching this category.
                         Skips irrelevant libraries entirely for efficiency.

    Returns:
        List of action info dicts from matching libraries
    """
    actions = []
    seen_libraries = set()

    for lib_name in _FUNCTION_LIBRARY_NAMES:
        lib_category = _LIBRARY_CATEGORY_MAP.get(lib_name, "library")
        if filter_category and lib_category != filter_category:
            continue

        cls = getattr(unreal, lib_name, None)
        if cls is None:
            continue
        # Deduplicate aliases (e.g., MathLibrary == KismetMathLibrary)
        cls_id = id(cls)
        if cls_id in seen_libraries:
            continue
        seen_libraries.add(cls_id)

        for name in sorted(dir(cls)):
            if name.startswith("_"):
                continue
            attr = getattr(cls, name, None)
            if attr is None or not callable(attr):
                continue
            info = _extract_method_info(cls, name, lib_name, category=lib_category, attr=attr)
            if info:
                actions.append(info)

    return actions


@safe_operation("blueprint")
@validate_inputs(
    {
        "blueprint_path": [TypeRule(str, allow_none=True)],
        "class_name": [TypeRule(str, allow_none=True)],
        "search": [TypeRule(str, allow_none=True)],
        "category": [TypeRule(str, allow_none=True)],
        "limit": [TypeRule(int, allow_none=True)],
    }
)
@handle_unreal_errors("blueprint_discover_actions")
def discover_actions(
    blueprint_path: Optional[str] = None,
    class_name: Optional[str] = None,
    search: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
) -> Dict[str, Any]:
    """
    Discover available Blueprint actions, functions, and nodes.

    Queries UE's reflection system to find Blueprint-callable functions,
    events, and flow control nodes.

    Usage with blueprint_add_node:
        Each action includes an ``addNodeParams`` dict with the exact parameters
        to pass to ``blueprint_add_node``. For example:
        - Events: ``addNodeParams = {"node_type": "BeginPlay"}``
        - Flow: ``addNodeParams = {"node_type": "Branch"}``
        - CallFunction: ``addNodeParams = {"node_type": "CallFunction",
          "function_name": "get_actor_transform", "target_class": "Actor"}``

    Args:
        blueprint_path: Optional Blueprint asset path (uses its parent class as context)
        class_name: UE class name to discover functions on (e.g., 'Actor',
                    'Character', 'KismetMathLibrary'). Ignored if blueprint_path given.
        search: Search term to filter results (case-insensitive, matches name and description)
        category: Filter by category. Valid values: 'all', 'class', 'events', 'flow',
                  plus library categories derived from _LIBRARY_CATEGORY_MAP: 'ai',
                  'array', 'gameplay', 'input', 'map', 'math', 'navigation',
                  'rendering', 'set', 'string', 'system', 'text', 'ui', 'utility',
                  'vr'. Defaults to None (meaning 'all') if omitted.
        limit: Maximum results to return (default 50, max 200)

    Returns:
        Dictionary with discovered actions including addNodeParams with node_type,
        function_name, and target_class fields for use with blueprint_add_node
    """
    limit = min(max(1, limit if limit is not None else 50), 200)

    # Validate category
    if category is not None and category not in _ALL_VALID_CATEGORIES:
        valid_list = sorted(c for c in _ALL_VALID_CATEGORIES if c is not None)
        raise ValidationError(
            f"Invalid category '{category}'. Valid categories: {', '.join(valid_list)}",
            operation="blueprint_discover_actions",
            details={"field": "category", "value": category},
        )

    context_class = None
    if blueprint_path:
        blueprint = resolve_blueprint(blueprint_path)
        parent = blueprint.get_editor_property("parent_class")
        if parent:
            context_class = parent.get_name()
    elif class_name:
        context_class = class_name

    actions = []

    # Deep-copy global entries to avoid mutating shared constants
    # (some entries contain nested lists like 'parameters')
    if category in (None, "all", "events"):
        actions.extend(_deep_copy_action(e) for e in _COMMON_EVENTS)

    if category in (None, "all", "flow"):
        actions.extend(_deep_copy_action(n) for n in _FLOW_NODES)

    # Skip class discovery for known function libraries (unless explicitly
    # requesting category 'class') to avoid mislabeling library functions.
    is_known_library = context_class in _LIBRARY_CATEGORY_MAP
    if context_class and category in (None, "all", "class") and (category == "class" or not is_known_library):
        actions.extend(_discover_class_actions(context_class))

    if category in _VALID_LIBRARY_CATEGORIES:
        # Pass specific category to skip irrelevant libraries entirely
        filter_cat = category if category not in (None, "all") else None
        actions.extend(_discover_library_actions(filter_category=filter_cat))

    # Deduplicate actions discovered via multiple paths.
    # Use resolved class identity (id) instead of string name to handle
    # aliases (e.g., MathLibrary and KismetMathLibrary are the same class).
    seen_keys = set()
    deduped = []
    for action in actions:
        cls_name = action.get("className")
        cls_id = id(getattr(unreal, cls_name, None)) if cls_name else 0
        key = (action.get("nodeType"), action.get("name"), cls_id)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        deduped.append(action)
    actions = deduped

    if search:
        search_lower = search.lower()
        actions = [
            a
            for a in actions
            if search_lower in a.get("name", "").lower()
            or search_lower in a.get("description", "").lower()
            or search_lower in a.get("functionName", "").lower()
        ]

    total = len(actions)
    actions = actions[:limit]

    # Defer expensive signature extraction to the final limited result set
    _enrich_with_parameters(actions)

    # Add blueprint_add_node parameter mapping for direct usability
    _enrich_with_add_node_params(actions)

    log_info(f"Discovered {total} actions, returning {len(actions)}")

    return {
        "success": True,
        "actions": actions,
        "totalAvailable": total,
        "returned": len(actions),
        "contextClass": context_class,
        "searchTerm": search,
        "categoryFilter": category,
    }
