"""
Struct and Enum operations for creating and managing UE user-defined structs and enums.
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

PROPERTY_TYPE_MAP: dict[str, str] = {
    "bool": "BoolProperty",
    "byte": "ByteProperty",
    "int": "IntProperty",
    "int64": "Int64Property",
    "float": "FloatProperty",
    "double": "DoubleProperty",
    "string": "StrProperty",
    "name": "NameProperty",
    "text": "TextProperty",
    "vector": "StructProperty",
    "rotator": "StructProperty",
    "transform": "StructProperty",
    "color": "StructProperty",
    "object": "ObjectProperty",
    "softobject": "SoftObjectProperty",
    "class": "ClassProperty",
}


def _ensure_directory(folder: str) -> None:
    """Create directory if it doesn't exist."""
    if not unreal.EditorAssetLibrary.does_directory_exist(folder):
        unreal.EditorAssetLibrary.make_directory(folder)


@validate_inputs(
    {
        "name": [RequiredRule(), TypeRule(str)],
        "properties": [RequiredRule(), TypeRule(list)],
        "target_folder": [RequiredRule(), TypeRule(str), AssetPathRule()],
    }
)
@handle_unreal_errors("struct_create")
@safe_operation("struct")
def create_struct(
    name: str,
    properties: list[dict[str, Any]],
    target_folder: str = "/Game/Data/Structs",
) -> dict[str, Any]:
    """Create a custom UE struct with typed properties.

    Args:
        name: Name for the new struct
        properties: List of dicts with 'name' and 'type' keys (e.g., [{"name": "Health", "type": "float"}])
        target_folder: Destination folder for the struct asset

    Returns:
        Dictionary with creation result
    """
    _ensure_directory(target_folder)

    asset_path = f"{target_folder}/{name}"

    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        raise ProcessingError(
            f"Struct already exists at {asset_path}",
            operation="struct_create",
            details={"asset_path": asset_path},
        )

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.StructureFactory()

    struct_asset = asset_tools.create_asset(
        asset_name=name,
        package_path=target_folder,
        asset_class=unreal.UserDefinedStruct,
        factory=factory,
    )

    if not struct_asset:
        raise ProcessingError(
            "Failed to create struct asset",
            operation="struct_create",
            details={"asset_path": asset_path},
        )

    added_props = []
    for prop_def in properties:
        prop_name = prop_def.get("name")
        prop_type = prop_def.get("type", "string")

        if not prop_name:
            raise ProcessingError(
                "Each property must have a 'name' key",
                operation="struct_create",
                details={"property": str(prop_def)},
            )

        ue_type = PROPERTY_TYPE_MAP.get(prop_type.lower())
        if not ue_type:
            raise ProcessingError(
                f"Unsupported property type: {prop_type}",
                operation="struct_create",
                details={"property": prop_name, "type": prop_type, "supported": list(PROPERTY_TYPE_MAP.keys())},
            )

        # Add variable to the user-defined struct
        pin_type = unreal.EdGraphPinType()
        pin_type.set_editor_property("pin_category", unreal.Name(ue_type))

        success = unreal.UserDefinedStructEditorData.add_variable(struct_asset, pin_type, prop_name)
        if success:
            added_props.append({"name": prop_name, "type": prop_type})

    unreal.EditorAssetLibrary.save_asset(asset_path)
    log_debug(f"Created struct: {asset_path} with {len(added_props)} properties")

    return {
        "success": True,
        "structPath": asset_path,
        "properties": added_props,
    }


@validate_inputs(
    {
        "asset_path": [RequiredRule(), AssetPathRule()],
        "add_properties": [TypeRule(list, allow_none=True)],
        "remove_properties": [TypeRule(list, allow_none=True)],
    }
)
@handle_unreal_errors("struct_update")
@safe_operation("struct")
def update_struct(
    asset_path: str,
    add_properties: Optional[list[dict[str, Any]]] = None,
    remove_properties: Optional[list[str]] = None,
) -> dict[str, Any]:
    """Modify an existing struct by adding or removing properties.

    Args:
        asset_path: Path to the struct asset
        add_properties: List of property dicts to add (each with 'name' and 'type')
        remove_properties: List of property names to remove

    Returns:
        Dictionary with update result
    """
    struct_asset = require_asset(asset_path)
    if not isinstance(struct_asset, unreal.UserDefinedStruct):
        raise ProcessingError(
            f"Not a UserDefinedStruct: {asset_path}",
            operation="struct_update",
            details={"asset_path": asset_path},
        )

    added = []
    removed = []

    if remove_properties:
        for prop_name in remove_properties:
            success = unreal.UserDefinedStructEditorData.remove_variable(struct_asset, prop_name)
            if success:
                removed.append(prop_name)

    if add_properties:
        for prop_def in add_properties:
            prop_name = prop_def.get("name")
            prop_type = prop_def.get("type", "string")

            if not prop_name:
                continue

            ue_type = PROPERTY_TYPE_MAP.get(prop_type.lower())
            if not ue_type:
                continue

            pin_type = unreal.EdGraphPinType()
            pin_type.set_editor_property("pin_category", unreal.Name(ue_type))

            success = unreal.UserDefinedStructEditorData.add_variable(struct_asset, pin_type, prop_name)
            if success:
                added.append({"name": prop_name, "type": prop_type})

    unreal.EditorAssetLibrary.save_asset(asset_path)
    log_debug(f"Updated struct: {asset_path} (+{len(added)}, -{len(removed)})")

    return {
        "success": True,
        "structPath": asset_path,
        "addedProperties": added,
        "removedProperties": removed,
    }


@validate_inputs(
    {
        "name": [RequiredRule(), TypeRule(str)],
        "values": [RequiredRule(), TypeRule(list)],
        "target_folder": [RequiredRule(), TypeRule(str), AssetPathRule()],
    }
)
@handle_unreal_errors("enum_create")
@safe_operation("enum")
def create_enum(
    name: str,
    values: list[dict[str, Any]],
    target_folder: str = "/Game/Data/Enums",
) -> dict[str, Any]:
    """Create an enum definition with display names.

    Args:
        name: Name for the new enum
        values: List of dicts with 'name' and optional 'display_name' keys
        target_folder: Destination folder for the enum asset

    Returns:
        Dictionary with creation result
    """
    _ensure_directory(target_folder)

    asset_path = f"{target_folder}/{name}"

    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        raise ProcessingError(
            f"Enum already exists at {asset_path}",
            operation="enum_create",
            details={"asset_path": asset_path},
        )

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.EnumFactory()

    enum_asset = asset_tools.create_asset(
        asset_name=name,
        package_path=target_folder,
        asset_class=unreal.UserDefinedEnum,
        factory=factory,
    )

    if not enum_asset:
        raise ProcessingError(
            "Failed to create enum asset",
            operation="enum_create",
            details={"asset_path": asset_path},
        )

    added_values = []
    for val_def in values:
        val_name = val_def.get("name")
        display_name = val_def.get("display_name", val_name)

        if not val_name:
            raise ProcessingError(
                "Each enum value must have a 'name' key",
                operation="enum_create",
                details={"value": str(val_def)},
            )

        # Add enumerator to the user-defined enum
        idx = unreal.UserDefinedEnumEditorData.add_enumerator(enum_asset, val_name)
        if display_name and display_name != val_name:
            unreal.UserDefinedEnumEditorData.set_display_name(enum_asset, idx, display_name)

        added_values.append({"name": val_name, "displayName": display_name, "index": idx})

    unreal.EditorAssetLibrary.save_asset(asset_path)
    log_debug(f"Created enum: {asset_path} with {len(added_values)} values")

    return {
        "success": True,
        "enumPath": asset_path,
        "values": added_values,
    }


@validate_inputs(
    {
        "asset_path": [RequiredRule(), AssetPathRule()],
    }
)
@handle_unreal_errors("enum_get_values")
@safe_operation("enum")
def get_enum_values(
    asset_path: str,
) -> dict[str, Any]:
    """List enum values and metadata.

    Args:
        asset_path: Path to the enum asset

    Returns:
        Dictionary with enum values and display names
    """
    enum_asset = require_asset(asset_path)
    if not isinstance(enum_asset, unreal.UserDefinedEnum):
        raise ProcessingError(
            f"Not a UserDefinedEnum: {asset_path}",
            operation="enum_get_values",
            details={"asset_path": asset_path},
        )

    num_entries = enum_asset.num_enums()
    values = []

    # Iterate through enum entries (last entry is typically the _MAX hidden value)
    for i in range(num_entries - 1):
        entry_name = str(enum_asset.get_name_by_value(i))
        display_name = str(enum_asset.get_display_name_text_by_value(i))
        values.append(
            {
                "index": i,
                "name": entry_name,
                "displayName": display_name,
            }
        )

    log_debug(f"Retrieved {len(values)} values from enum {asset_path}")

    return {
        "success": True,
        "enumPath": asset_path,
        "enumName": enum_asset.get_name(),
        "values": values,
        "count": len(values),
    }
