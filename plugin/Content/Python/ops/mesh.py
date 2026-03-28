"""
Mesh and LOD management operations for inspecting, importing,
and configuring static mesh LODs.
"""

from typing import Any, Optional

import unreal

from utils.error_handling import (
    AssetPathRule,
    NumericRangeRule,
    ProcessingError,
    RequiredRule,
    TypeRule,
    handle_unreal_errors,
    require_asset,
    safe_operation,
    validate_inputs,
)
from utils.general import get_actor_subsystem, log_debug


def _get_static_mesh(asset_path: str) -> unreal.StaticMesh:
    """Load and validate a StaticMesh asset."""
    asset = require_asset(asset_path)
    if not isinstance(asset, unreal.StaticMesh):
        raise ProcessingError(
            f"Asset is not a StaticMesh: {asset_path}",
            operation="mesh",
            details={"asset_path": asset_path, "actual_type": asset.get_class().get_name()},
        )
    return asset


def _get_bounds_dict(mesh: unreal.StaticMesh) -> dict[str, Any]:
    """Extract bounding box from a static mesh."""
    bounds = mesh.get_bounds()
    origin = bounds.origin
    extent = bounds.box_extent
    return {
        "origin": {"x": float(origin.x), "y": float(origin.y), "z": float(origin.z)},
        "extent": {"x": float(extent.x), "y": float(extent.y), "z": float(extent.z)},
    }


@validate_inputs({"asset_path": [RequiredRule(), AssetPathRule()]})
@handle_unreal_errors("mesh_get_metadata")
@safe_operation("mesh")
def get_metadata(asset_path: str) -> dict[str, Any]:
    """Get mesh metadata including LOD count, vertex/triangle counts, bounds, materials, and Nanite status.

    Args:
        asset_path: Path to the StaticMesh asset (e.g., /Game/Meshes/SM_Wall01)

    Returns:
        Dictionary with mesh metadata
    """
    mesh = _get_static_mesh(asset_path)

    num_lods = mesh.get_num_lods()

    lods = []
    for lod_index in range(num_lods):
        lod_info = {
            "lodIndex": lod_index,
            "numVertices": mesh.get_num_vertices(lod_index),
            "numTriangles": mesh.get_num_triangles(lod_index),
            "numSections": mesh.get_num_sections(lod_index),
        }

        screen_size = mesh.get_editor_property("source_models")
        if screen_size and lod_index < len(screen_size):
            model = screen_size[lod_index]
            reduction = model.get_editor_property("reduction_settings")
            lod_info["screenSize"] = float(reduction.get_editor_property("percent_triangles"))

        lods.append(lod_info)

    materials = []
    static_materials = mesh.get_editor_property("static_materials")
    if static_materials:
        for i, slot in enumerate(static_materials):
            mat_interface = slot.get_editor_property("material_interface")
            mat_name = mat_interface.get_name() if mat_interface else None
            mat_path = mat_interface.get_path_name().split(":")[0] if mat_interface else None
            materials.append(
                {
                    "slotIndex": i,
                    "slotName": str(slot.get_editor_property("material_slot_name")),
                    "materialName": mat_name,
                    "materialPath": mat_path,
                }
            )

    nanite_enabled = False
    nanite_settings = mesh.get_editor_property("nanite_settings")
    if nanite_settings:
        nanite_enabled = bool(nanite_settings.get_editor_property("enabled"))

    bounds = _get_bounds_dict(mesh)

    log_debug(f"mesh_get_metadata {asset_path}: {num_lods} LODs, nanite={nanite_enabled}")

    return {
        "success": True,
        "assetPath": asset_path,
        "meshName": mesh.get_name(),
        "numLods": num_lods,
        "lods": lods,
        "materials": materials,
        "naniteEnabled": nanite_enabled,
        "bounds": bounds,
    }


@validate_inputs(
    {
        "asset_path": [RequiredRule(), AssetPathRule()],
        "source_file": [RequiredRule(), TypeRule(str)],
        "lod_index": [RequiredRule(), TypeRule(int), NumericRangeRule(min_val=0, max_val=7)],
    }
)
@handle_unreal_errors("mesh_import_lod")
@safe_operation("mesh")
def import_lod(
    asset_path: str,
    source_file: str,
    lod_index: int,
) -> dict[str, Any]:
    """Import an FBX or OBJ file into a specific LOD slot of a StaticMesh.

    Args:
        asset_path: Path to the target StaticMesh asset
        source_file: Absolute filesystem path to the FBX/OBJ file
        lod_index: LOD slot to import into (0-7)

    Returns:
        Dictionary with import result
    """
    import os

    if not os.path.isfile(source_file):
        raise ProcessingError(
            f"Source file does not exist: {source_file}",
            operation="mesh_import_lod",
            details={"source_file": source_file},
        )

    ext = os.path.splitext(source_file)[1].lower()
    if ext not in (".fbx", ".obj"):
        raise ProcessingError(
            f"Unsupported file format '{ext}'. Must be .fbx or .obj",
            operation="mesh_import_lod",
            details={"source_file": source_file, "extension": ext},
        )

    mesh = _get_static_mesh(asset_path)

    success = mesh.import_lod(lod_index, source_file)
    if not success:
        raise ProcessingError(
            f"Failed to import LOD {lod_index} from {source_file}",
            operation="mesh_import_lod",
            details={"asset_path": asset_path, "source_file": source_file, "lod_index": lod_index},
        )

    unreal.EditorAssetLibrary.save_asset(asset_path)

    log_debug(f"mesh_import_lod {asset_path} LOD{lod_index} from {source_file}")

    return {
        "success": True,
        "assetPath": asset_path,
        "lodIndex": lod_index,
        "sourceFile": source_file,
        "numLods": mesh.get_num_lods(),
    }


@validate_inputs(
    {
        "asset_path": [RequiredRule(), AssetPathRule()],
        "lod_index": [RequiredRule(), TypeRule(int), NumericRangeRule(min_val=0, max_val=7)],
        "screen_size": [RequiredRule(), TypeRule((int, float)), NumericRangeRule(min_val=0.0, max_val=1.0)],
    }
)
@handle_unreal_errors("mesh_set_lod_screen_size")
@safe_operation("mesh")
def set_lod_screen_size(
    asset_path: str,
    lod_index: int,
    screen_size: float,
) -> dict[str, Any]:
    """Set the screen size threshold for an LOD transition.

    Args:
        asset_path: Path to the StaticMesh asset
        lod_index: LOD index to set the screen size for (0-7)
        screen_size: Screen size threshold (0.0 to 1.0, where 1.0 = full screen)

    Returns:
        Dictionary with the updated screen size info
    """
    mesh = _get_static_mesh(asset_path)

    num_lods = mesh.get_num_lods()
    if lod_index >= num_lods:
        raise ProcessingError(
            f"LOD index {lod_index} out of range (mesh has {num_lods} LODs)",
            operation="mesh_set_lod_screen_size",
            details={"asset_path": asset_path, "lod_index": lod_index, "num_lods": num_lods},
        )

    source_models = mesh.get_editor_property("source_models")
    if source_models and lod_index < len(source_models):
        model = source_models[lod_index]
        reduction = model.get_editor_property("reduction_settings")
        reduction.set_editor_property("percent_triangles", float(screen_size))
        model.set_editor_property("screen_size", float(screen_size))

    unreal.EditorAssetLibrary.save_asset(asset_path)

    log_debug(f"mesh_set_lod_screen_size {asset_path} LOD{lod_index} -> {screen_size}")

    return {
        "success": True,
        "assetPath": asset_path,
        "lodIndex": lod_index,
        "screenSize": float(screen_size),
    }


@validate_inputs(
    {
        "asset_path": [RequiredRule(), AssetPathRule()],
        "num_lods": [RequiredRule(), TypeRule(int), NumericRangeRule(min_val=1, max_val=8)],
        "reduction_percent": [TypeRule((int, float), allow_none=True), NumericRangeRule(min_val=0.0, max_val=100.0)],
    }
)
@handle_unreal_errors("mesh_auto_generate_lods")
@safe_operation("mesh")
def auto_generate_lods(
    asset_path: str,
    num_lods: int,
    reduction_percent: Optional[float] = 50.0,
) -> dict[str, Any]:
    """Auto-generate LODs using Unreal's built-in mesh reduction.

    Args:
        asset_path: Path to the StaticMesh asset
        num_lods: Total number of LODs to generate (including LOD0)
        reduction_percent: Triangle reduction per LOD step (0-100). Default 50%

    Returns:
        Dictionary with generated LOD details
    """
    mesh = _get_static_mesh(asset_path)

    editor_mesh_lib = unreal.EditorStaticMeshLibrary
    editor_mesh_lib.set_lod_count(mesh, num_lods)

    reduction_factor = (reduction_percent or 50.0) / 100.0

    source_models = mesh.get_editor_property("source_models")
    if source_models:
        for lod_index in range(1, min(num_lods, len(source_models))):
            model = source_models[lod_index]
            reduction = model.get_editor_property("reduction_settings")
            target_pct = max(0.01, 1.0 - (reduction_factor * lod_index))
            reduction.set_editor_property("percent_triangles", target_pct)
            auto_screen = max(0.01, 1.0 / (2**lod_index))
            model.set_editor_property("screen_size", auto_screen)

    mesh.build()
    unreal.EditorAssetLibrary.save_asset(asset_path)

    generated_lods = []
    for lod_index in range(mesh.get_num_lods()):
        generated_lods.append(
            {
                "lodIndex": lod_index,
                "numVertices": mesh.get_num_vertices(lod_index),
                "numTriangles": mesh.get_num_triangles(lod_index),
            }
        )

    log_debug(f"mesh_auto_generate_lods {asset_path}: generated {num_lods} LODs")

    return {
        "success": True,
        "assetPath": asset_path,
        "numLods": mesh.get_num_lods(),
        "reductionPercent": reduction_percent,
        "lods": generated_lods,
    }


@validate_inputs({"asset_path": [RequiredRule(), AssetPathRule()]})
@handle_unreal_errors("mesh_get_instance_breakdown")
@safe_operation("mesh")
def get_instance_breakdown(asset_path: str) -> dict[str, Any]:
    """Get per-LOD rendering cost breakdown and world instance count for a mesh.

    Args:
        asset_path: Path to the StaticMesh asset

    Returns:
        Dictionary with per-LOD triangle counts, material sections, and instance count
    """
    mesh = _get_static_mesh(asset_path)

    num_lods = mesh.get_num_lods()
    lods = []
    total_triangles = 0

    for lod_index in range(num_lods):
        tri_count = mesh.get_num_triangles(lod_index)
        section_count = mesh.get_num_sections(lod_index)
        total_triangles += tri_count
        lods.append(
            {
                "lodIndex": lod_index,
                "numTriangles": tri_count,
                "numSections": section_count,
            }
        )

    instance_count = 0
    all_actors = get_actor_subsystem().get_all_level_actors()
    mesh_path = mesh.get_path_name()

    for actor in all_actors:
        if not actor:
            continue
        components = actor.get_components_by_class(unreal.StaticMeshComponent)
        for comp in components:
            comp_mesh = comp.get_editor_property("static_mesh")
            if comp_mesh and comp_mesh.get_path_name() == mesh_path:
                instance_count += 1

    materials = []
    static_materials = mesh.get_editor_property("static_materials")
    if static_materials:
        for i, slot in enumerate(static_materials):
            mat_interface = slot.get_editor_property("material_interface")
            materials.append(
                {
                    "slotIndex": i,
                    "materialName": mat_interface.get_name() if mat_interface else None,
                }
            )

    log_debug(
        f"mesh_get_instance_breakdown {asset_path}: "
        f"{num_lods} LODs, {instance_count} instances, {total_triangles} total tris"
    )

    return {
        "success": True,
        "assetPath": asset_path,
        "meshName": mesh.get_name(),
        "numLods": num_lods,
        "lods": lods,
        "totalTriangles": total_triangles,
        "instanceCount": instance_count,
        "materials": materials,
    }
