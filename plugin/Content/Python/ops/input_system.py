"""
Enhanced Input System operations for managing input mapping contexts and actions.
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

TRIGGER_TYPE_MAP: dict[str, str] = {
    "pressed": "InputTriggerPressed",
    "released": "InputTriggerReleased",
    "down": "InputTriggerDown",
    "hold": "InputTriggerHold",
    "tap": "InputTriggerTap",
    "pulse": "InputTriggerTimedBase",
}

MODIFIER_TYPE_MAP: dict[str, str] = {
    "negate": "InputModifierNegate",
    "swizzle": "InputModifierSwizzleAxis",
    "scalar": "InputModifierScalar",
    "deadzone": "InputModifierDeadZone",
    "smooth": "InputModifierSmooth",
    "response_curve": "InputModifierResponseCurveExponential",
}


def _ensure_directory(folder: str) -> None:
    """Create directory if it doesn't exist."""
    if not unreal.EditorAssetLibrary.does_directory_exist(folder):
        unreal.EditorAssetLibrary.make_directory(folder)


def _resolve_input_action(action_path: str) -> unreal.InputAction:
    """Load and validate an InputAction asset."""
    asset = unreal.EditorAssetLibrary.load_asset(action_path)
    if not asset or not isinstance(asset, unreal.InputAction):
        raise ProcessingError(
            f"InputAction not found: {action_path}",
            operation="resolve_input_action",
            details={"action_path": action_path},
        )
    return asset


@validate_inputs(
    {
        "name": [RequiredRule(), TypeRule(str)],
        "mappings": [RequiredRule(), TypeRule(list)],
        "target_folder": [RequiredRule(), TypeRule(str), AssetPathRule()],
    }
)
@handle_unreal_errors("input_create_mapping")
@safe_operation("input")
def create_mapping(
    name: str,
    mappings: list[dict[str, Any]],
    target_folder: str = "/Game/Input",
) -> dict[str, Any]:
    """Create an Enhanced Input mapping context with action bindings.

    Args:
        name: Name for the new mapping context
        mappings: List of mapping dicts, each with 'action_path', 'key',
                  and optional 'triggers' and 'modifiers' lists
        target_folder: Destination folder for the mapping context asset

    Returns:
        Dictionary with creation result
    """
    _ensure_directory(target_folder)

    asset_path = f"{target_folder}/{name}"

    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        raise ProcessingError(
            f"Mapping context already exists at {asset_path}",
            operation="input_create_mapping",
            details={"asset_path": asset_path},
        )

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.InputMappingContextFactory()

    mapping_ctx = asset_tools.create_asset(
        asset_name=name,
        package_path=target_folder,
        asset_class=unreal.InputMappingContext,
        factory=factory,
    )

    if not mapping_ctx:
        raise ProcessingError(
            "Failed to create InputMappingContext",
            operation="input_create_mapping",
            details={"asset_path": asset_path},
        )

    bound_actions = []

    for mapping_def in mappings:
        action_path = mapping_def.get("action_path")
        key_name = mapping_def.get("key")
        trigger_types = mapping_def.get("triggers", [])
        modifier_types = mapping_def.get("modifiers", [])

        if not action_path or not key_name:
            raise ProcessingError(
                "Each mapping must have 'action_path' and 'key'",
                operation="input_create_mapping",
                details={"mapping": str(mapping_def)},
            )

        input_action = _resolve_input_action(action_path)

        # Create key mapping
        key = unreal.Key(key_name)
        mapping_handle = mapping_ctx.map_key(input_action, key)

        # Add triggers
        for trigger_name in trigger_types:
            trigger_class_name = TRIGGER_TYPE_MAP.get(trigger_name.lower())
            if trigger_class_name:
                trigger_class = getattr(unreal, trigger_class_name, None)
                if trigger_class:
                    trigger = trigger_class()
                    mapping_handle.add_trigger(trigger)

        # Add modifiers
        for modifier_name in modifier_types:
            modifier_class_name = MODIFIER_TYPE_MAP.get(modifier_name.lower())
            if modifier_class_name:
                modifier_class = getattr(unreal, modifier_class_name, None)
                if modifier_class:
                    modifier = modifier_class()
                    mapping_handle.add_modifier(modifier)

        bound_actions.append(
            {
                "actionPath": action_path,
                "key": key_name,
                "triggers": trigger_types,
                "modifiers": modifier_types,
            }
        )

    unreal.EditorAssetLibrary.save_asset(asset_path)
    log_debug(f"Created mapping context: {asset_path} with {len(bound_actions)} bindings")

    return {
        "success": True,
        "mappingContextPath": asset_path,
        "boundActions": bound_actions,
    }


@validate_inputs(
    {
        "path": [RequiredRule(), TypeRule(str)],
        "filter": [TypeRule(str, allow_none=True)],
        "limit": [TypeRule(int, allow_none=True)],
    }
)
@handle_unreal_errors("input_list_actions")
@safe_operation("input")
def list_actions(
    path: str = "/Game",
    filter: Optional[str] = None,
    limit: Optional[int] = 50,
) -> dict[str, Any]:
    """List available Enhanced Input actions.

    Args:
        path: Content path to search for InputAction assets
        filter: Optional name filter (case-insensitive)
        limit: Maximum number of results

    Returns:
        Dictionary with list of input actions
    """
    all_assets = unreal.EditorAssetLibrary.list_assets(path, recursive=True, include_folder=False)

    actions = []
    for asset_path in all_assets:
        asset = unreal.EditorAssetLibrary.load_asset(asset_path)
        if not asset or not isinstance(asset, unreal.InputAction):
            continue

        action_name = asset.get_name()
        if filter and filter.lower() not in action_name.lower():
            continue

        value_type = str(asset.get_editor_property("value_type"))

        actions.append(
            {
                "name": action_name,
                "path": asset_path,
                "valueType": value_type,
            }
        )

        if limit and len(actions) >= limit:
            break

    log_debug(f"Found {len(actions)} input actions in {path}")

    return {
        "success": True,
        "actions": actions,
        "count": len(actions),
    }


@validate_inputs(
    {
        "asset_path": [TypeRule(str, allow_none=True)],
    }
)
@handle_unreal_errors("input_get_metadata")
@safe_operation("input")
def get_metadata(
    asset_path: Optional[str] = None,
) -> dict[str, Any]:
    """Enhanced Input system introspection.

    When asset_path is provided, returns metadata for that specific mapping context
    or input action. Otherwise returns general Enhanced Input system info.

    Args:
        asset_path: Optional path to a specific InputAction or InputMappingContext

    Returns:
        Dictionary with input system metadata
    """
    if asset_path:
        asset = require_asset(asset_path)

        if isinstance(asset, unreal.InputAction):
            value_type = str(asset.get_editor_property("value_type"))
            consumes_input = asset.get_editor_property("consumes_input")

            return {
                "success": True,
                "type": "InputAction",
                "path": asset_path,
                "name": asset.get_name(),
                "valueType": value_type,
                "consumesInput": bool(consumes_input),
            }

        if isinstance(asset, unreal.InputMappingContext):
            # Get all mapped actions from the context
            mapped = []
            action_mappings = asset.get_mappings()
            for mapping in action_mappings:
                action = mapping.get_action()
                if action:
                    mapped.append(
                        {
                            "actionName": action.get_name(),
                            "actionPath": action.get_path_name().split(":")[0],
                        }
                    )

            return {
                "success": True,
                "type": "InputMappingContext",
                "path": asset_path,
                "name": asset.get_name(),
                "mappedActions": mapped,
                "totalMappings": len(mapped),
            }

        raise ProcessingError(
            f"Asset is not an InputAction or InputMappingContext: {asset_path}",
            operation="input_get_metadata",
            details={"asset_path": asset_path, "actual_type": type(asset).__name__},
        )

    # General system info
    return {
        "success": True,
        "type": "SystemInfo",
        "supportedTriggers": list(TRIGGER_TYPE_MAP.keys()),
        "supportedModifiers": list(MODIFIER_TYPE_MAP.keys()),
        "description": "Unreal Engine Enhanced Input System — use input_create_mapping to create "
        "mapping contexts and input_list_actions to discover available actions.",
    }
