"""
DataTable operations for creating and managing Unreal Engine DataTables.
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


def _ensure_directory(folder: str) -> None:
    """Create directory if it doesn't exist."""
    if not unreal.EditorAssetLibrary.does_directory_exist(folder):
        unreal.EditorAssetLibrary.make_directory(folder)


def _resolve_struct(struct_path: str):
    """Load and validate a struct asset."""
    asset = unreal.EditorAssetLibrary.load_asset(struct_path)
    if not asset:
        raise ProcessingError(
            f"Struct not found: {struct_path}",
            operation="resolve_struct",
            details={"struct_path": struct_path},
        )
    return asset


def _get_datatable(asset_path: str) -> unreal.DataTable:
    """Load and validate a DataTable asset."""
    asset = require_asset(asset_path)
    if not isinstance(asset, unreal.DataTable):
        raise ProcessingError(
            f"Not a DataTable asset: {asset_path}",
            operation="get_datatable",
            details={"asset_path": asset_path},
        )
    return asset


def _row_names_list(datatable: unreal.DataTable) -> list[str]:
    """Get all row names from a DataTable."""
    return [str(name) for name in datatable.get_editor_property("row_map").keys()]


@validate_inputs(
    {
        "name": [RequiredRule(), TypeRule(str)],
        "struct_path": [RequiredRule(), TypeRule(str)],
        "target_folder": [RequiredRule(), TypeRule(str), AssetPathRule()],
    }
)
@handle_unreal_errors("datatable_create")
@safe_operation("datatable")
def create(
    name: str,
    struct_path: str,
    target_folder: str = "/Game/Data",
) -> dict[str, Any]:
    """Create a new DataTable with the specified struct type.

    Args:
        name: Name for the new DataTable asset
        struct_path: Path to the row struct (e.g., /Script/Engine.DataTableRowHandle)
        target_folder: Destination folder for the DataTable

    Returns:
        Dictionary with creation result
    """
    _ensure_directory(target_folder)

    asset_path = f"{target_folder}/{name}"

    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        raise ProcessingError(
            f"DataTable already exists at {asset_path}",
            operation="datatable_create",
            details={"asset_path": asset_path},
        )

    row_struct = _resolve_struct(struct_path)

    asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
    factory = unreal.DataTableFactory()
    factory.set_editor_property("struct", row_struct)

    datatable = asset_tools.create_asset(
        asset_name=name,
        package_path=target_folder,
        asset_class=unreal.DataTable,
        factory=factory,
    )

    if not datatable:
        raise ProcessingError(
            "Failed to create DataTable",
            operation="datatable_create",
            details={"asset_path": asset_path},
        )

    unreal.EditorAssetLibrary.save_asset(asset_path)
    log_debug(f"Created DataTable: {asset_path}")

    return {
        "success": True,
        "dataTablePath": asset_path,
        "structPath": struct_path,
    }


@validate_inputs(
    {
        "asset_path": [RequiredRule(), AssetPathRule()],
        "rows": [RequiredRule(), TypeRule(list)],
    }
)
@handle_unreal_errors("datatable_add_rows")
@safe_operation("datatable")
def add_rows(
    asset_path: str,
    rows: list[dict[str, Any]],
) -> dict[str, Any]:
    """Add rows to an existing DataTable.

    Args:
        asset_path: Path to the DataTable asset
        rows: List of row dicts, each with 'row_name' and property key/value pairs

    Returns:
        Dictionary with added row names
    """
    datatable = _get_datatable(asset_path)
    added = []

    for row_def in rows:
        row_name = row_def.get("row_name")
        if not row_name:
            raise ProcessingError(
                "Each row must have a 'row_name' key",
                operation="datatable_add_rows",
                details={"row": str(row_def)},
            )

        properties = {k: v for k, v in row_def.items() if k != "row_name"}

        # Use the DataTable editing library to add the row
        unreal.DataTableFunctionLibrary.add_row(datatable, row_name)

        # Set properties via the generic property system
        for prop_name, prop_value in properties.items():
            unreal.DataTableFunctionLibrary.set_data_table_row_property(datatable, row_name, prop_name, str(prop_value))

        added.append(row_name)

    unreal.EditorAssetLibrary.save_asset(asset_path)
    log_debug(f"Added {len(added)} rows to {asset_path}")

    return {
        "success": True,
        "dataTablePath": asset_path,
        "addedRows": added,
        "totalRows": len(_row_names_list(datatable)),
    }


@validate_inputs(
    {
        "asset_path": [RequiredRule(), AssetPathRule()],
        "row_names": [TypeRule(list, allow_none=True)],
    }
)
@handle_unreal_errors("datatable_get_rows")
@safe_operation("datatable")
def get_rows(
    asset_path: str,
    row_names: Optional[list[str]] = None,
) -> dict[str, Any]:
    """Query rows from a DataTable by name or get all rows.

    Args:
        asset_path: Path to the DataTable asset
        row_names: Optional list of row names to fetch; returns all if omitted

    Returns:
        Dictionary with row data
    """
    datatable = _get_datatable(asset_path)
    all_names = _row_names_list(datatable)

    target_names = row_names if row_names is not None else all_names
    rows = []
    missing = []

    for name in target_names:
        if name not in all_names:
            missing.append(name)
            continue
        row_data = {"row_name": name}
        json_str = unreal.DataTableFunctionLibrary.get_data_table_row_from_name(datatable, name)
        if json_str is not None:
            row_data["data"] = str(json_str)
        rows.append(row_data)

    log_debug(f"Retrieved {len(rows)} rows from {asset_path}")

    result: dict[str, Any] = {
        "success": True,
        "dataTablePath": asset_path,
        "rows": rows,
        "totalRows": len(all_names),
    }
    if missing:
        result["missingRows"] = missing
    return result


@validate_inputs(
    {
        "asset_path": [RequiredRule(), AssetPathRule()],
        "row_name": [RequiredRule(), TypeRule(str)],
        "properties": [RequiredRule(), TypeRule(dict)],
    }
)
@handle_unreal_errors("datatable_update_row")
@safe_operation("datatable")
def update_row(
    asset_path: str,
    row_name: str,
    properties: dict[str, Any],
) -> dict[str, Any]:
    """Modify properties of an existing DataTable row.

    Args:
        asset_path: Path to the DataTable asset
        row_name: Name of the row to update
        properties: Dict of property names and new values

    Returns:
        Dictionary with update result
    """
    datatable = _get_datatable(asset_path)
    all_names = _row_names_list(datatable)

    if row_name not in all_names:
        raise ProcessingError(
            f"Row '{row_name}' not found in DataTable",
            operation="datatable_update_row",
            details={"asset_path": asset_path, "row_name": row_name, "available": all_names},
        )

    for prop_name, prop_value in properties.items():
        unreal.DataTableFunctionLibrary.set_data_table_row_property(datatable, row_name, prop_name, str(prop_value))

    unreal.EditorAssetLibrary.save_asset(asset_path)
    log_debug(f"Updated row '{row_name}' in {asset_path}")

    return {
        "success": True,
        "dataTablePath": asset_path,
        "updatedRow": row_name,
        "updatedProperties": list(properties.keys()),
    }


@validate_inputs(
    {
        "asset_path": [RequiredRule(), AssetPathRule()],
        "row_name": [RequiredRule(), TypeRule(str)],
    }
)
@handle_unreal_errors("datatable_delete_row")
@safe_operation("datatable")
def delete_row(
    asset_path: str,
    row_name: str,
) -> dict[str, Any]:
    """Remove a row from a DataTable.

    Args:
        asset_path: Path to the DataTable asset
        row_name: Name of the row to delete

    Returns:
        Dictionary with deletion result
    """
    datatable = _get_datatable(asset_path)
    all_names = _row_names_list(datatable)

    if row_name not in all_names:
        raise ProcessingError(
            f"Row '{row_name}' not found in DataTable",
            operation="datatable_delete_row",
            details={"asset_path": asset_path, "row_name": row_name, "available": all_names},
        )

    unreal.DataTableFunctionLibrary.remove_row(datatable, row_name)
    unreal.EditorAssetLibrary.save_asset(asset_path)

    remaining = _row_names_list(datatable)
    log_debug(f"Deleted row '{row_name}' from {asset_path}")

    return {
        "success": True,
        "dataTablePath": asset_path,
        "deletedRow": row_name,
        "remainingRows": len(remaining),
    }
