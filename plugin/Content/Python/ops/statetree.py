"""
StateTree AI operations for creating and managing StateTree assets,
states, transitions, tasks, evaluators, and bindings.
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
from utils.general import log_debug

_SCHEMA_TYPES = {
    "AIController": "StateTreeAIComponentSchema",
    "SmartObject": "StateTreeSmartObjectSchema",
    "Component": "StateTreeComponentSchema",
    "Actor": "StateTreeActorComponentSchema",
}

_TASK_TYPES = {
    "MoveTo": "StateTreeMoveToTask",
    "Wait": "StateTreeWaitTask",
    "RunBehaviorTree": "StateTreeRunBehaviorTreeTask",
    "PlayAnimation": "StateTreePlayAnimationTask",
    "FindRandomLocation": "StateTreeFindRandomLocationTask",
    "ActivateGameplayAbility": "StateTreeActivateGameplayAbilityTask",
    "SetSmartObjectSlotEnabled": "StateTreeSetSmartObjectSlotEnabledTask",
}

_EVALUATOR_TYPES = {
    "AIController": "StateTreeAIControllerEvaluator",
    "ActorComponent": "StateTreeActorComponentEvaluator",
    "SmartObjectSlot": "StateTreeSmartObjectSlotEvaluator",
}

_TRANSITION_TRIGGERS = {"OnCompleted", "OnFailed", "OnCondition"}
_TRANSITION_TARGETS = {"NextState", "ParentState", "TreeSucceeded", "TreeFailed"}


def _resolve_statetree(asset_path: str):
    """Load and validate a StateTree asset."""
    asset = require_asset(asset_path)
    if not hasattr(unreal, "StateTree") or not isinstance(asset, unreal.StateTree):
        raise ProcessingError(
            f"Asset is not a StateTree: {asset_path}",
            operation="statetree",
            details={"asset_path": asset_path, "actual_type": asset.get_class().get_name()},
        )
    return asset


def _get_statetree_editor():
    """Get the StateTree editor subsystem instance if available."""
    subsystem_class = getattr(unreal, "StateTreeEditorSubsystem", None)
    if subsystem_class is not None:
        return unreal.get_editor_subsystem(subsystem_class)
    # Fallback to library class (static methods)
    return getattr(unreal, "StateTreeEditorLibrary", None)


def _resolve_task_class(task_type: str):
    """Resolve a task type name to its UE class."""
    class_name = _TASK_TYPES.get(task_type, task_type)
    cls = getattr(unreal, class_name, None)
    if cls is None:
        cls = getattr(unreal, f"StateTree{task_type}Task", None)
    return cls


def _resolve_evaluator_class(evaluator_type: str):
    """Resolve an evaluator type name to its UE class."""
    class_name = _EVALUATOR_TYPES.get(evaluator_type, evaluator_type)
    cls = getattr(unreal, class_name, None)
    if cls is None:
        cls = getattr(unreal, f"StateTree{evaluator_type}Evaluator", None)
    return cls


@validate_inputs(
    {
        "asset_name": [RequiredRule(), TypeRule(str)],
        "target_folder": [RequiredRule(), TypeRule(str)],
        "schema": [TypeRule(str, allow_none=True)],
        "description": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("statetree_create")
@safe_operation("statetree")
def create(
    asset_name: str,
    target_folder: str = "/Game/AI/StateTrees",
    schema: Optional[str] = None,
    description: Optional[str] = None,
) -> dict[str, Any]:
    """Create a new StateTree asset with an optional schema type.

    Args:
        asset_name: Name for the new StateTree asset
        target_folder: Destination folder in content browser
        schema: Optional schema type (AIController, SmartObject, Component, Actor)
        description: Optional description metadata

    Returns:
        Dictionary with created StateTree path and details
    """
    if schema and schema not in _SCHEMA_TYPES:
        raise ProcessingError(
            f"Unknown schema type '{schema}'",
            operation="statetree_create",
            details={"schema": schema, "available": list(_SCHEMA_TYPES.keys())},
        )

    asset_path = f"{target_folder}/{asset_name}"

    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        raise ProcessingError(
            f"StateTree already exists at {asset_path}",
            operation="statetree_create",
            details={"asset_path": asset_path},
        )

    if not unreal.EditorAssetLibrary.does_directory_exist(target_folder):
        unreal.EditorAssetLibrary.make_directory(target_folder)

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.StateTreeFactory()
    statetree = asset_tools.create_asset(
        asset_name=asset_name,
        package_path=target_folder,
        asset_class=unreal.StateTree,
        factory=factory,
    )

    if not statetree:
        raise ProcessingError(
            "Failed to create StateTree asset",
            operation="statetree_create",
            details={"asset_path": asset_path},
        )

    if schema:
        schema_class_name = _SCHEMA_TYPES[schema]
        schema_class = getattr(unreal, schema_class_name, None)
        if schema_class:
            statetree.set_editor_property("schema", schema_class())

    unreal.EditorAssetLibrary.save_asset(asset_path)
    log_debug(f"Created StateTree: {asset_path} (schema={schema})")

    result: dict[str, Any] = {
        "success": True,
        "stateTreePath": asset_path,
        "assetName": asset_name,
    }
    if schema:
        result["schema"] = schema
        result["schemaClass"] = _SCHEMA_TYPES[schema]
    if description:
        result["description"] = description

    return result


@validate_inputs(
    {
        "statetree_path": [RequiredRule(), AssetPathRule()],
        "state_name": [RequiredRule(), TypeRule(str)],
        "state_type": [TypeRule(str, allow_none=True)],
        "parent_state": [TypeRule(str, allow_none=True)],
        "selection_behavior": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("statetree_add_state")
@safe_operation("statetree")
def add_state(
    statetree_path: str,
    state_name: str,
    state_type: Optional[str] = None,
    parent_state: Optional[str] = None,
    selection_behavior: Optional[str] = None,
) -> dict[str, Any]:
    """Add an execution state to a StateTree.

    Args:
        statetree_path: Path to the StateTree asset
        state_name: Name for the new state
        state_type: Optional state type (State, Group, Linked). Defaults to State.
        parent_state: Optional parent state name for nesting
        selection_behavior: Optional child selection behavior
                           (Sequential, Random, Priority)

    Returns:
        Dictionary with created state details
    """
    statetree = _resolve_statetree(statetree_path)

    editor = _get_statetree_editor()

    if editor and hasattr(editor, "add_state"):
        editor.add_state(statetree, state_name, parent_state)
    else:
        statetree.add_state(state_name)

    if state_type:
        valid_types = {"State", "Group", "Linked"}
        if state_type not in valid_types:
            raise ProcessingError(
                f"Invalid state_type '{state_type}'",
                operation="statetree_add_state",
                details={"state_type": state_type, "valid": list(valid_types)},
            )

    unreal.EditorAssetLibrary.save_asset(statetree_path)
    log_debug(f"Added state '{state_name}' to {statetree_path}")

    result: dict[str, Any] = {
        "success": True,
        "stateTreePath": statetree_path,
        "stateName": state_name,
    }
    if state_type:
        result["stateType"] = state_type
    if parent_state:
        result["parentState"] = parent_state
    if selection_behavior:
        result["selectionBehavior"] = selection_behavior

    return result


@validate_inputs(
    {
        "statetree_path": [RequiredRule(), AssetPathRule()],
        "source_state": [RequiredRule(), TypeRule(str)],
        "trigger": [RequiredRule(), TypeRule(str)],
        "target": [RequiredRule(), TypeRule(str)],
        "target_state": [TypeRule(str, allow_none=True)],
        "priority": [TypeRule(int, allow_none=True)],
        "condition": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("statetree_add_transition")
@safe_operation("statetree")
def add_transition(
    statetree_path: str,
    source_state: str,
    trigger: str,
    target: str,
    target_state: Optional[str] = None,
    priority: Optional[int] = None,
    condition: Optional[str] = None,
) -> dict[str, Any]:
    """Add a transition between states in a StateTree.

    Args:
        statetree_path: Path to the StateTree asset
        source_state: Name of the source state
        trigger: Transition trigger (OnCompleted, OnFailed, OnCondition)
        target: Transition target type (NextState, ParentState,
                TreeSucceeded, TreeFailed)
        target_state: Target state name when using NextState
        priority: Optional transition priority (lower = higher priority)
        condition: Optional condition expression

    Returns:
        Dictionary with transition details
    """
    if trigger not in _TRANSITION_TRIGGERS:
        raise ProcessingError(
            f"Invalid trigger '{trigger}'",
            operation="statetree_add_transition",
            details={"trigger": trigger, "valid": list(_TRANSITION_TRIGGERS)},
        )

    if target not in _TRANSITION_TARGETS:
        raise ProcessingError(
            f"Invalid target '{target}'",
            operation="statetree_add_transition",
            details={"target": target, "valid": list(_TRANSITION_TARGETS)},
        )

    statetree = _resolve_statetree(statetree_path)

    editor = _get_statetree_editor()
    if editor and hasattr(editor, "add_transition"):
        editor.add_transition(statetree, source_state, trigger, target, target_state)
    else:
        statetree.add_transition(source_state, trigger, target)

    unreal.EditorAssetLibrary.save_asset(statetree_path)
    log_debug(f"Added transition from '{source_state}' ({trigger} -> {target}) in {statetree_path}")

    result: dict[str, Any] = {
        "success": True,
        "stateTreePath": statetree_path,
        "sourceState": source_state,
        "trigger": trigger,
        "target": target,
    }
    if target_state:
        result["targetState"] = target_state
    if priority is not None:
        result["priority"] = priority
    if condition:
        result["condition"] = condition

    return result


@validate_inputs(
    {
        "statetree_path": [RequiredRule(), AssetPathRule()],
        "state_name": [RequiredRule(), TypeRule(str)],
        "task_type": [RequiredRule(), TypeRule(str)],
        "properties": [TypeRule(dict, allow_none=True)],
    }
)
@handle_unreal_errors("statetree_add_task")
@safe_operation("statetree")
def add_task(
    statetree_path: str,
    state_name: str,
    task_type: str,
    properties: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Add a task execution node to a state.

    Args:
        statetree_path: Path to the StateTree asset
        state_name: Name of the state to add the task to
        task_type: Task type name (MoveTo, Wait, RunBehaviorTree,
                   PlayAnimation, FindRandomLocation,
                   ActivateGameplayAbility, SetSmartObjectSlotEnabled)
        properties: Optional dictionary of task property overrides

    Returns:
        Dictionary with task details
    """
    task_class = _resolve_task_class(task_type)
    if not task_class:
        raise ProcessingError(
            f"Unknown task type '{task_type}'",
            operation="statetree_add_task",
            details={
                "task_type": task_type,
                "known_types": list(_TASK_TYPES.keys()),
            },
        )

    statetree = _resolve_statetree(statetree_path)

    editor = _get_statetree_editor()
    if editor and hasattr(editor, "add_task"):
        editor.add_task(statetree, state_name, task_class)
    else:
        statetree.add_task(state_name, task_class)

    if properties:
        log_debug(f"Task properties requested for '{task_type}': {list(properties.keys())}")

    unreal.EditorAssetLibrary.save_asset(statetree_path)
    log_debug(f"Added task '{task_type}' to state '{state_name}' in {statetree_path}")

    result: dict[str, Any] = {
        "success": True,
        "stateTreePath": statetree_path,
        "stateName": state_name,
        "taskType": task_type,
        "taskClass": task_class.__name__,
    }
    if properties:
        result["propertiesSet"] = list(properties.keys())

    return result


@validate_inputs(
    {
        "statetree_path": [RequiredRule(), AssetPathRule()],
        "evaluator_type": [RequiredRule(), TypeRule(str)],
        "evaluator_name": [TypeRule(str, allow_none=True)],
        "properties": [TypeRule(dict, allow_none=True)],
    }
)
@handle_unreal_errors("statetree_add_evaluator")
@safe_operation("statetree")
def add_evaluator(
    statetree_path: str,
    evaluator_type: str,
    evaluator_name: Optional[str] = None,
    properties: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Add a global evaluator to a StateTree.

    Args:
        statetree_path: Path to the StateTree asset
        evaluator_type: Evaluator type name (AIController, ActorComponent,
                        SmartObjectSlot)
        evaluator_name: Optional display name for the evaluator
        properties: Optional dictionary of evaluator property overrides

    Returns:
        Dictionary with evaluator details
    """
    evaluator_class = _resolve_evaluator_class(evaluator_type)
    if not evaluator_class:
        raise ProcessingError(
            f"Unknown evaluator type '{evaluator_type}'",
            operation="statetree_add_evaluator",
            details={
                "evaluator_type": evaluator_type,
                "known_types": list(_EVALUATOR_TYPES.keys()),
            },
        )

    statetree = _resolve_statetree(statetree_path)

    editor = _get_statetree_editor()
    if editor and hasattr(editor, "add_evaluator"):
        editor.add_evaluator(statetree, evaluator_class)
    else:
        statetree.add_evaluator(evaluator_class)

    unreal.EditorAssetLibrary.save_asset(statetree_path)
    log_debug(f"Added evaluator '{evaluator_type}' to {statetree_path}")

    result: dict[str, Any] = {
        "success": True,
        "stateTreePath": statetree_path,
        "evaluatorType": evaluator_type,
        "evaluatorClass": evaluator_class.__name__,
    }
    if evaluator_name:
        result["evaluatorName"] = evaluator_name
    if properties:
        result["propertiesSet"] = list(properties.keys())

    return result


@validate_inputs(
    {
        "statetree_path": [RequiredRule(), AssetPathRule()],
        "source_path": [RequiredRule(), TypeRule(str)],
        "target_path": [RequiredRule(), TypeRule(str)],
        "binding_type": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("statetree_add_binding")
@safe_operation("statetree")
def add_binding(
    statetree_path: str,
    source_path: str,
    target_path: str,
    binding_type: Optional[str] = None,
) -> dict[str, Any]:
    """Add a property or target binding in a StateTree.

    Args:
        statetree_path: Path to the StateTree asset
        source_path: Source property path (e.g. Evaluator.AIController)
        target_path: Target property path (e.g. Task.TargetActor)
        binding_type: Optional binding type (Property, Object, ExternalData)

    Returns:
        Dictionary with binding details
    """
    statetree = _resolve_statetree(statetree_path)

    editor = _get_statetree_editor()
    if editor and hasattr(editor, "add_binding"):
        editor.add_binding(statetree, source_path, target_path)
    else:
        statetree.add_property_binding(source_path, target_path)

    unreal.EditorAssetLibrary.save_asset(statetree_path)
    log_debug(f"Added binding {source_path} -> {target_path} in {statetree_path}")

    result: dict[str, Any] = {
        "success": True,
        "stateTreePath": statetree_path,
        "sourcePath": source_path,
        "targetPath": target_path,
    }
    if binding_type:
        result["bindingType"] = binding_type

    return result


@validate_inputs(
    {
        "statetree_path": [RequiredRule(), AssetPathRule()],
        "include_bindings": [TypeRule(bool, allow_none=True)],
        "include_transitions": [TypeRule(bool, allow_none=True)],
    }
)
@handle_unreal_errors("statetree_get_metadata")
@safe_operation("statetree")
def get_metadata(
    statetree_path: str,
    include_bindings: bool = True,
    include_transitions: bool = True,
) -> dict[str, Any]:
    """Get full structure and metadata of a StateTree asset.

    Args:
        statetree_path: Path to the StateTree asset
        include_bindings: Whether to include property binding details
        include_transitions: Whether to include transition details

    Returns:
        Dictionary with complete StateTree structure
    """
    statetree = _resolve_statetree(statetree_path)

    schema_info = None
    schema_obj = statetree.get_editor_property("schema") if hasattr(statetree, "get_editor_property") else None
    if schema_obj:
        schema_info = schema_obj.get_class().get_name()

    states = []
    evaluators = []
    transitions = []
    bindings = []

    if hasattr(statetree, "get_states"):
        for state in statetree.get_states():
            state_info: dict[str, Any] = {
                "name": state.get_name() if hasattr(state, "get_name") else str(state),
            }
            if hasattr(state, "get_tasks"):
                state_info["tasks"] = [task.get_class().get_name() for task in state.get_tasks()]
            states.append(state_info)

    if hasattr(statetree, "get_evaluators"):
        for evaluator in statetree.get_evaluators():
            evaluators.append(
                {
                    "type": evaluator.get_class().get_name() if hasattr(evaluator, "get_class") else str(evaluator),
                }
            )

    if include_transitions and hasattr(statetree, "get_transitions"):
        for transition in statetree.get_transitions():
            transitions.append(
                {
                    "source": str(getattr(transition, "source_state", "unknown")),
                    "trigger": str(getattr(transition, "trigger", "unknown")),
                    "target": str(getattr(transition, "target", "unknown")),
                }
            )

    if include_bindings and hasattr(statetree, "get_property_bindings"):
        for binding in statetree.get_property_bindings():
            bindings.append(
                {
                    "source": str(getattr(binding, "source_path", "")),
                    "target": str(getattr(binding, "target_path", "")),
                }
            )

    log_debug(f"Retrieved metadata for {statetree_path}")

    result: dict[str, Any] = {
        "success": True,
        "stateTreePath": statetree_path,
        "assetName": statetree.get_name(),
        "schema": schema_info,
        "states": states,
        "stateCount": len(states),
        "evaluators": evaluators,
        "evaluatorCount": len(evaluators),
        "availableSchemas": _SCHEMA_TYPES,
        "availableTaskTypes": _TASK_TYPES,
        "availableEvaluatorTypes": _EVALUATOR_TYPES,
    }

    if include_transitions:
        result["transitions"] = transitions
        result["transitionCount"] = len(transitions)

    if include_bindings:
        result["bindings"] = bindings
        result["bindingCount"] = len(bindings)

    return result
