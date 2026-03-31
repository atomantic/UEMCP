"""
Animation Blueprint operations for creating and managing Animation Blueprints,
state machines, montages, and animation layers.
"""

from typing import Any, Optional

import unreal

from utils.error_handling import (
    AssetPathRule,
    ProcessingError,
    RequiredRule,
    TypeRule,
    handle_unreal_errors,
    require_asset,
    safe_operation,
    validate_inputs,
)
from utils.general import log_debug, log_error

_VARIABLE_TYPE_MAP = {
    "bool": "bool",
    "int": "int",
    "float": "real",
    "byte": "byte",
    "name": "name",
}


def _resolve_anim_blueprint(blueprint_path: str) -> unreal.AnimBlueprint:
    """Load and validate an Animation Blueprint asset."""
    asset = require_asset(blueprint_path)
    if not isinstance(asset, unreal.AnimBlueprint):
        raise ProcessingError(
            f"Not an Animation Blueprint: {blueprint_path}",
            operation="animation",
            details={"asset_path": blueprint_path},
        )
    return asset


def _find_state_machine(anim_bp: unreal.AnimBlueprint, machine_name: str):
    """Find a state machine node by name in the anim graph."""
    anim_graphs = anim_bp.get_editor_property("function_graphs")
    if not anim_graphs:
        return None
    for graph in anim_graphs:
        for node in graph.get_editor_property("nodes"):
            if hasattr(node, "get_editor_property"):
                node_name = str(node.get_editor_property("node_comment") or "")
                class_name = node.get_class().get_name()
                if machine_name in node_name or machine_name in class_name:
                    return node
    return None


def _get_anim_graph(anim_bp: unreal.AnimBlueprint):
    """Get the main AnimGraph from an Animation Blueprint."""
    anim_graphs = anim_bp.get_editor_property("function_graphs")
    if anim_graphs:
        for graph in anim_graphs:
            if "AnimGraph" in graph.get_name():
                return graph
    return None


@validate_inputs(
    {
        "name": [RequiredRule(), TypeRule(str)],
        "skeleton_path": [RequiredRule(), AssetPathRule()],
        "target_folder": [RequiredRule(), TypeRule(str)],
        "mesh_path": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("create_blueprint")
@safe_operation("animation")
def create_blueprint(
    name: str,
    skeleton_path: str,
    target_folder: str = "/Game/Animations",
    mesh_path: Optional[str] = None,
) -> dict[str, Any]:
    """Create an Animation Blueprint with skeleton/mesh reference.

    Args:
        name: Name for the new Animation Blueprint
        skeleton_path: Path to the Skeleton asset
        target_folder: Destination folder for the Animation Blueprint
        mesh_path: Optional path to a Skeletal Mesh asset

    Returns:
        Dictionary with creation result
    """
    if not unreal.EditorAssetLibrary.does_directory_exist(target_folder):
        unreal.EditorAssetLibrary.make_directory(target_folder)

    asset_path = f"{target_folder}/{name}"

    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        raise ProcessingError(
            f"Animation Blueprint already exists at {asset_path}",
            operation="create_blueprint",
            details={"asset_path": asset_path},
        )

    skeleton = require_asset(skeleton_path)
    if not isinstance(skeleton, unreal.Skeleton):
        raise ProcessingError(
            f"Not a Skeleton asset: {skeleton_path}",
            operation="create_blueprint",
            details={"asset_path": skeleton_path},
        )

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.AnimBlueprintFactory()
    factory.set_editor_property("target_skeleton", skeleton)

    if mesh_path:
        mesh = require_asset(mesh_path)
        if isinstance(mesh, unreal.SkeletalMesh):
            factory.set_editor_property("preview_skeletal_mesh", mesh)
        else:
            log_error(f"Not a SkeletalMesh: {mesh_path}, skipping mesh assignment")

    anim_bp = asset_tools.create_asset(
        asset_name=name,
        package_path=target_folder,
        asset_class=unreal.AnimBlueprint,
        factory=factory,
    )

    if not anim_bp:
        raise ProcessingError(
            "Failed to create Animation Blueprint",
            operation="create_blueprint",
            details={"asset_path": asset_path},
        )

    unreal.KismetEditorUtilities.compile_blueprint(anim_bp)
    unreal.EditorAssetLibrary.save_asset(asset_path)

    log_debug(f"Created Animation Blueprint: {asset_path}")

    return {
        "success": True,
        "blueprintPath": asset_path,
        "skeletonPath": skeleton_path,
        "meshPath": mesh_path,
    }


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "machine_name": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("create_state_machine")
@safe_operation("animation")
def create_state_machine(
    blueprint_path: str,
    machine_name: str = "DefaultStateMachine",
) -> dict[str, Any]:
    """Build a state machine programmatically in an Animation Blueprint.

    Args:
        blueprint_path: Path to the Animation Blueprint asset
        machine_name: Name for the new state machine

    Returns:
        Dictionary with state machine creation result
    """
    anim_bp = _resolve_anim_blueprint(blueprint_path)

    anim_graph = _get_anim_graph(anim_bp)
    if not anim_graph:
        raise ProcessingError(
            "Could not find AnimGraph in Animation Blueprint",
            operation="create_state_machine",
            details={"blueprint_path": blueprint_path},
        )

    sm_node = unreal.AnimGraphNode_StateMachine()
    sm_node.set_editor_property("node_comment", machine_name)
    anim_graph.add_node(sm_node, False, False)
    # Pin wiring to the final animation pose output is handled by UE compilation

    unreal.KismetEditorUtilities.compile_blueprint(anim_bp)
    unreal.EditorAssetLibrary.save_asset(blueprint_path)

    log_debug(f"Created state machine '{machine_name}' in {blueprint_path}")

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "machineName": machine_name,
    }


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "machine_name": [RequiredRule(), TypeRule(str)],
        "state_name": [RequiredRule(), TypeRule(str)],
        "animation_path": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("add_state")
@safe_operation("animation")
def add_state(
    blueprint_path: str,
    machine_name: str,
    state_name: str,
    animation_path: Optional[str] = None,
) -> dict[str, Any]:
    """Add a state with animation asset reference to a state machine.

    Args:
        blueprint_path: Path to the Animation Blueprint asset
        machine_name: Name of the target state machine
        state_name: Name for the new state
        animation_path: Optional path to an animation sequence asset

    Returns:
        Dictionary with state addition result
    """
    anim_bp = _resolve_anim_blueprint(blueprint_path)

    sm_node = _find_state_machine(anim_bp, machine_name)
    if not sm_node:
        raise ProcessingError(
            f"State machine '{machine_name}' not found",
            operation="add_state",
            details={"blueprint_path": blueprint_path, "machine_name": machine_name},
        )

    anim_asset = None
    if animation_path:
        anim_asset = require_asset(animation_path)
        if not isinstance(anim_asset, unreal.AnimSequence):
            raise ProcessingError(
                f"Not an AnimSequence: {animation_path}",
                operation="add_state",
                details={"animation_path": animation_path},
            )

    state_machine = sm_node.get_editor_property("editor_state_machine_graph")
    if not state_machine:
        raise ProcessingError(
            f"Could not access state machine graph for '{machine_name}'",
            operation="add_state",
            details={"machine_name": machine_name},
        )

    state_node = unreal.AnimStateNode()
    state_node.set_editor_property("node_comment", state_name)
    state_machine.add_node(state_node, False, False)

    if anim_asset:
        play_node = unreal.AnimGraphNode_SequencePlayer()
        play_node.get_editor_property("node").set_editor_property("sequence", anim_asset)
        bound_graph = state_node.get_editor_property("bound_graph")
        if bound_graph:
            bound_graph.add_node(play_node, False, False)

    unreal.KismetEditorUtilities.compile_blueprint(anim_bp)
    unreal.EditorAssetLibrary.save_asset(blueprint_path)

    log_debug(f"Added state '{state_name}' to machine '{machine_name}' in {blueprint_path}")

    result: dict[str, Any] = {
        "success": True,
        "blueprintPath": blueprint_path,
        "machineName": machine_name,
        "stateName": state_name,
    }
    if animation_path:
        result["animationPath"] = animation_path
    return result


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "machine_name": [RequiredRule(), TypeRule(str)],
        "source_state": [RequiredRule(), TypeRule(str)],
        "target_state": [RequiredRule(), TypeRule(str)],
        "transition_rule": [TypeRule(str, allow_none=True)],
        "duration": [TypeRule(float, allow_none=True)],
    }
)
@handle_unreal_errors("add_transition")
@safe_operation("animation")
def add_transition(
    blueprint_path: str,
    machine_name: str,
    source_state: str,
    target_state: str,
    transition_rule: Optional[str] = None,
    duration: Optional[float] = 0.2,
) -> dict[str, Any]:
    """Connect states with a transition rule in a state machine.

    Args:
        blueprint_path: Path to the Animation Blueprint asset
        machine_name: Name of the target state machine
        source_state: Name of the source state
        target_state: Name of the target state
        transition_rule: Optional expression for the transition condition
        duration: Blend duration in seconds (default 0.2)

    Returns:
        Dictionary with transition creation result
    """
    anim_bp = _resolve_anim_blueprint(blueprint_path)

    sm_node = _find_state_machine(anim_bp, machine_name)
    if not sm_node:
        raise ProcessingError(
            f"State machine '{machine_name}' not found",
            operation="add_transition",
            details={"blueprint_path": blueprint_path, "machine_name": machine_name},
        )

    state_machine_graph = sm_node.get_editor_property("editor_state_machine_graph")
    if not state_machine_graph:
        raise ProcessingError(
            f"Could not access state machine graph for '{machine_name}'",
            operation="add_transition",
            details={"machine_name": machine_name},
        )

    source_node = None
    target_node = None
    for node in state_machine_graph.get_editor_property("nodes"):
        comment = str(node.get_editor_property("node_comment") or "")
        if comment == source_state:
            source_node = node
        elif comment == target_state:
            target_node = node

    if not source_node:
        raise ProcessingError(
            f"Source state '{source_state}' not found in '{machine_name}'",
            operation="add_transition",
            details={"source_state": source_state, "machine_name": machine_name},
        )
    if not target_node:
        raise ProcessingError(
            f"Target state '{target_state}' not found in '{machine_name}'",
            operation="add_transition",
            details={"target_state": target_state, "machine_name": machine_name},
        )

    transition_node = unreal.AnimStateTransitionNode()
    transition_node.set_editor_property("node_comment", f"{source_state} -> {target_state}")
    state_machine_graph.add_node(transition_node, False, False)

    if duration is not None:
        crossfade = transition_node.get_editor_property("crossfade_duration")
        if crossfade is not None:
            transition_node.set_editor_property("crossfade_duration", duration)

    unreal.KismetEditorUtilities.compile_blueprint(anim_bp)
    unreal.EditorAssetLibrary.save_asset(blueprint_path)

    log_debug(f"Added transition {source_state} -> {target_state} in '{machine_name}'")

    result: dict[str, Any] = {
        "success": True,
        "blueprintPath": blueprint_path,
        "machineName": machine_name,
        "sourceState": source_state,
        "targetState": target_state,
    }
    if duration is not None:
        result["blendDuration"] = duration
    if transition_rule:
        result["transitionRule"] = transition_rule
        result["ruleNote"] = (
            "Transition rule expression was recorded but programmatic rule graph "
            "editing requires Blueprint node manipulation via blueprint_add_node"
        )
    return result


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "variable_name": [RequiredRule(), TypeRule(str)],
        "variable_type": [RequiredRule(), TypeRule(str)],
        "default_value": [TypeRule((str, int, float, bool), allow_none=True)],
    }
)
@handle_unreal_errors("add_variable")
@safe_operation("animation")
def add_variable(
    blueprint_path: str,
    variable_name: str,
    variable_type: str = "bool",
    default_value: Optional[Any] = None,
) -> dict[str, Any]:
    """Add a typed variable to the Animation Blueprint.

    Args:
        blueprint_path: Path to the Animation Blueprint asset
        variable_name: Name for the new variable
        variable_type: Type of variable (bool, int, float, byte, name)
        default_value: Optional default value for the variable

    Returns:
        Dictionary with variable addition result
    """
    anim_bp = _resolve_anim_blueprint(blueprint_path)

    type_lower = variable_type.lower()
    if type_lower not in _VARIABLE_TYPE_MAP:
        raise ProcessingError(
            f"Unsupported variable type: {variable_type}. Supported: {list(_VARIABLE_TYPE_MAP.keys())}",
            operation="add_variable",
            details={"variable_type": variable_type},
        )

    pin_category = _VARIABLE_TYPE_MAP[type_lower]

    pin_type = unreal.EdGraphPinType()
    pin_type.set_editor_property("pin_category", pin_category)
    pin_type.set_editor_property("container_type", unreal.EPinContainerType.NONE)

    name_field = unreal.Name(variable_name)
    added = unreal.KismetEditorUtilities.add_blueprint_variable(anim_bp, name_field, pin_type)
    if not added:
        log_debug(f"add_blueprint_variable returned falsy for '{variable_name}', attempting save anyway")

    # Compile first so the CDO has the new variable property available
    unreal.KismetEditorUtilities.compile_blueprint(anim_bp)

    if default_value is not None:
        cdo = anim_bp.generated_class().get_default_object()
        if cdo and hasattr(cdo, variable_name):
            cdo.set_editor_property(variable_name, default_value)
            # Re-compile after setting default to persist the CDO change
            unreal.KismetEditorUtilities.compile_blueprint(anim_bp)

    unreal.EditorAssetLibrary.save_asset(blueprint_path, only_if_is_dirty=False)

    log_debug(f"Added variable '{variable_name}' ({variable_type}) to {blueprint_path}")

    result: dict[str, Any] = {
        "success": True,
        "blueprintPath": blueprint_path,
        "variableName": variable_name,
        "variableType": variable_type,
    }
    if default_value is not None:
        result["defaultValue"] = default_value
    return result


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
    }
)
@handle_unreal_errors("get_metadata")
@safe_operation("animation")
def get_metadata(
    blueprint_path: str,
) -> dict[str, Any]:
    """Inspect Animation Blueprint states, variables, and montages.

    Args:
        blueprint_path: Path to the Animation Blueprint asset

    Returns:
        Dictionary with Animation Blueprint metadata
    """
    anim_bp = _resolve_anim_blueprint(blueprint_path)

    bp_name = anim_bp.get_name()

    skeleton = anim_bp.get_editor_property("target_skeleton")
    skeleton_path = skeleton.get_path_name().split(":")[0] if skeleton else None

    variables = []
    new_vars = anim_bp.get_editor_property("new_variables")
    if new_vars:
        for var_desc in new_vars:
            var_name = str(var_desc.get_editor_property("var_name"))
            var_type_info = var_desc.get_editor_property("var_type")
            pin_category = str(var_type_info.get_editor_property("pin_category")) if var_type_info else "unknown"
            variables.append({"name": var_name, "type": pin_category})

    state_machines = []
    anim_graph = _get_anim_graph(anim_bp)
    if anim_graph:
        for node in anim_graph.get_editor_property("nodes"):
            class_name = node.get_class().get_name()
            if "StateMachine" in class_name:
                sm_name = str(node.get_editor_property("node_comment") or class_name)
                states = []
                sm_graph = node.get_editor_property("editor_state_machine_graph")
                if sm_graph:
                    for sm_node in sm_graph.get_editor_property("nodes"):
                        sm_class = sm_node.get_class().get_name()
                        if "AnimState" in sm_class and "Transition" not in sm_class:
                            state_name = str(sm_node.get_editor_property("node_comment") or sm_class)
                            states.append(state_name)
                state_machines.append({"name": sm_name, "states": states})

    parent_class = anim_bp.get_editor_property("parent_class")
    parent_name = parent_class.get_name() if parent_class else None

    log_debug(f"Retrieved metadata for Animation Blueprint: {bp_name}")

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "name": bp_name,
        "parentClass": parent_name,
        "skeletonPath": skeleton_path,
        "variables": variables,
        "stateMachines": state_machines,
    }


@validate_inputs(
    {
        "name": [RequiredRule(), TypeRule(str)],
        "animation_path": [RequiredRule(), AssetPathRule()],
        "target_folder": [RequiredRule(), TypeRule(str)],
        "slot_name": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("create_montage")
@safe_operation("animation")
def create_montage(
    name: str,
    animation_path: str,
    target_folder: str = "/Game/Animations",
    slot_name: Optional[str] = None,
) -> dict[str, Any]:
    """Create an animation montage from an animation sequence.

    Args:
        name: Name for the new montage
        animation_path: Path to the source animation sequence
        target_folder: Destination folder for the montage
        slot_name: Optional montage slot name (e.g. 'DefaultSlot')

    Returns:
        Dictionary with montage creation result
    """
    if not unreal.EditorAssetLibrary.does_directory_exist(target_folder):
        unreal.EditorAssetLibrary.make_directory(target_folder)

    montage_path = f"{target_folder}/{name}"

    if unreal.EditorAssetLibrary.does_asset_exist(montage_path):
        raise ProcessingError(
            f"Montage already exists at {montage_path}",
            operation="create_montage",
            details={"asset_path": montage_path},
        )

    anim_seq = require_asset(animation_path)
    if not isinstance(anim_seq, unreal.AnimSequence):
        raise ProcessingError(
            f"Not an AnimSequence: {animation_path}",
            operation="create_montage",
            details={"animation_path": animation_path},
        )

    skeleton = anim_seq.get_editor_property("skeleton")
    if not skeleton:
        raise ProcessingError(
            f"AnimSequence has no skeleton: {animation_path}",
            operation="create_montage",
            details={"animation_path": animation_path},
        )

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.AnimMontageFactory()
    factory.set_editor_property("target_skeleton", skeleton)

    montage = asset_tools.create_asset(
        asset_name=name,
        package_path=target_folder,
        asset_class=unreal.AnimMontage,
        factory=factory,
    )

    if not montage:
        raise ProcessingError(
            "Failed to create AnimMontage",
            operation="create_montage",
            details={"asset_path": montage_path},
        )

    slot_anim_track = unreal.SlotAnimationTrack()
    anim_segment = unreal.AnimSegment()
    anim_segment.set_editor_property("anim_reference", anim_seq)
    anim_segment.set_editor_property("anim_start_time", 0.0)
    anim_segment.set_editor_property("anim_end_time", anim_seq.get_editor_property("sequence_length"))
    anim_segment.set_editor_property("anim_play_rate", 1.0)

    anim_track = unreal.AnimTrack()
    anim_track.get_editor_property("anim_segments").append(anim_segment)
    slot_anim_track.set_editor_property("anim_track", anim_track)

    if slot_name:
        slot_anim_track.set_editor_property("slot_name", unreal.Name(slot_name))

    montage.get_editor_property("slot_anim_tracks").append(slot_anim_track)

    unreal.EditorAssetLibrary.save_asset(montage_path)

    log_debug(f"Created montage '{name}' from {animation_path}")

    result: dict[str, Any] = {
        "success": True,
        "montagePath": montage_path,
        "animationPath": animation_path,
        "skeletonPath": skeleton.get_path_name().split(":")[0],
    }
    if slot_name:
        result["slotName"] = slot_name
    return result


@validate_inputs(
    {
        "blueprint_path": [RequiredRule(), AssetPathRule()],
        "layer_blueprint_path": [RequiredRule(), AssetPathRule()],
        "layer_name": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("link_layer")
@safe_operation("animation")
def link_layer(
    blueprint_path: str,
    layer_blueprint_path: str,
    layer_name: Optional[str] = None,
) -> dict[str, Any]:
    """Link an animation layer Blueprint to a base Animation Blueprint.

    Args:
        blueprint_path: Path to the base Animation Blueprint
        layer_blueprint_path: Path to the layer Animation Blueprint
        layer_name: Optional friendly name for the layer

    Returns:
        Dictionary with layer linking result
    """
    base_bp = _resolve_anim_blueprint(blueprint_path)
    layer_bp = _resolve_anim_blueprint(layer_blueprint_path)

    layer_class = layer_bp.generated_class()
    if not layer_class:
        raise ProcessingError(
            f"Layer Animation Blueprint has no generated class: {layer_blueprint_path}",
            operation="link_layer",
            details={"layer_blueprint_path": layer_blueprint_path},
        )

    linked_layers = base_bp.get_editor_property("anim_layer_interface_class")
    if linked_layers:
        log_debug(f"Base blueprint already has layer interface: {linked_layers.get_name()}")

    anim_graph = _get_anim_graph(base_bp)
    if not anim_graph:
        raise ProcessingError(
            "Could not find AnimGraph in base Animation Blueprint",
            operation="link_layer",
            details={"blueprint_path": blueprint_path},
        )

    layer_node = unreal.AnimGraphNode_LinkedAnimLayer()
    layer_comment = layer_name or layer_bp.get_name()
    layer_node.set_editor_property("node_comment", layer_comment)
    # Set the interface class so the layer node knows which layer BP to resolve
    inner_node = layer_node.get_editor_property("node")
    if inner_node and hasattr(inner_node, "set_editor_property"):
        inner_node.set_editor_property("interface", layer_class)
    anim_graph.add_node(layer_node, False, False)

    unreal.KismetEditorUtilities.compile_blueprint(base_bp)
    unreal.EditorAssetLibrary.save_asset(blueprint_path)

    log_debug(f"Linked layer '{layer_comment}' to {blueprint_path}")

    return {
        "success": True,
        "blueprintPath": blueprint_path,
        "layerBlueprintPath": layer_blueprint_path,
        "layerName": layer_comment,
    }
