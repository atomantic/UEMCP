"""
UEMCP Asset Operations - All asset and content browser operations

Enhanced with improved error handling framework to eliminate try/catch boilerplate.
"""

import unreal
import os
from typing import Dict, Any, List, Optional

# Enhanced error handling framework
from utils.error_handling import (
    validate_inputs, handle_unreal_errors, safe_operation,
    RequiredRule, TypeRule, AssetPathRule, FileExistsRule,
    require_asset, ValidationError, ProcessingError
)

from utils import load_asset, asset_exists, log_error


class AssetOperations:
    """Handles all asset-related operations."""

    # Tolerance for pivot type detection (in Unreal units)
    PIVOT_TOLERANCE = 0.1

    # Texture compression settings mapping
    COMPRESSION_MAP = {
        "TC_Default": unreal.TextureCompressionSettings.TC_DEFAULT,
        "TC_Normalmap": unreal.TextureCompressionSettings.TC_NORMALMAP,
        "TC_Masks": unreal.TextureCompressionSettings.TC_MASKS,
        "TC_Grayscale": unreal.TextureCompressionSettings.TC_GRAYSCALE,
    }

    def _detect_pivot_type(self, origin, box_extent):
        """Detect the pivot type based on origin position relative to bounds.

        Args:
            origin: The origin point of the asset
            box_extent: The box extent (half-size) of the asset

        Returns:
            str: The detected pivot type ('center', 'bottom-center', or 'corner-bottom')
        """
        tolerance = self.PIVOT_TOLERANCE

        # Check if pivot is at bottom-center
        if abs(origin.z + box_extent.z) < tolerance:
            # Check if also at corner
            if abs(origin.x + box_extent.x) < tolerance and abs(origin.y + box_extent.y) < tolerance:
                return "corner-bottom"
            else:
                return "bottom-center"

        # Default to center
        return "center"

    def _has_simple_collision(self, body_setup):
        """Check if a body setup has simple collision geometry.

        Args:
            body_setup: The body setup to check

        Returns:
            bool: True if simple collision exists, False otherwise
        """
        if not body_setup or not hasattr(body_setup, "aggregate_geom"):
            return False

        aggregate_geom = body_setup.aggregate_geom
        return (
            len(aggregate_geom.box_elems) > 0
            or len(aggregate_geom.sphere_elems) > 0
            or len(aggregate_geom.convex_elems) > 0
        )

    @validate_inputs({
        'path': [RequiredRule(), TypeRule(str)],
        'assetType': [TypeRule((str, type(None)))],
        'limit': [TypeRule(int)]
    })
    @handle_unreal_errors("list_assets")
    @safe_operation("asset")
    def list_assets(self, path: str = "/Game", assetType: Optional[str] = None, limit: int = 20):
        """List assets in a given path.

        Args:
            path: Content browser path to search
            assetType: Optional filter by asset type
            limit: Maximum number of assets to return

        Returns:
            dict: Result with asset list
        """
        asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
        assets = asset_registry.get_assets_by_path(path, recursive=True)

        # Filter by asset type if specified
        if assetType:
            filtered_assets = []
            for asset in assets:
                asset_type_name = (
                    str(asset.asset_class_path.asset_name)
                    if hasattr(asset.asset_class_path, "asset_name")
                    else str(asset.asset_class_path)
                )

                if asset_type_name == assetType:
                    filtered_assets.append(asset)
            assets = filtered_assets

        # Build asset list with limit
        asset_list = []
        for i, asset in enumerate(assets):
            if i >= limit:
                break

            asset_type_name = (
                str(asset.asset_class_path.asset_name)
                if hasattr(asset.asset_class_path, "asset_name")
                else str(asset.asset_class_path)
            )

            asset_list.append(
                {"name": str(asset.asset_name), "type": asset_type_name, "path": str(asset.package_name)}
            )

        return {"assets": asset_list, "totalCount": len(assets), "path": path}

    @validate_inputs({
        'assetPath': [RequiredRule(), AssetPathRule()]
    })
    @handle_unreal_errors("get_asset_info")
    @safe_operation("asset")
    def get_asset_info(self, assetPath: str) -> Dict[str, Any]:
        """Get detailed information about an asset.

        Args:
            assetPath: Path to the asset

        Returns:
            dict: Asset information
        """
        # Load the asset using error handling framework
        asset = require_asset(assetPath)

        info = {"assetPath": assetPath, "assetType": asset.get_class().get_name()}

        # Get bounds for static meshes
        if isinstance(asset, unreal.StaticMesh):
            self._add_static_mesh_info(info, asset)

        # Get info for blueprints
        elif isinstance(asset, unreal.Blueprint):
            self._add_blueprint_info(info, asset, assetPath)

        # Get info for materials
        elif isinstance(asset, unreal.Material) or isinstance(asset, unreal.MaterialInstance):
            self._add_material_info(info, asset)

        # Get info for textures
        elif isinstance(asset, unreal.Texture2D):
            self._add_texture_info(info, asset)

        return info

    def _add_static_mesh_info(self, info: dict, asset: unreal.StaticMesh):
        """Add static mesh information to the info dict.

        Args:
            info: Dictionary to populate
            asset: Static mesh asset
        """
        bounds = asset.get_bounds()
        box_extent = bounds.box_extent
        origin = bounds.origin

        # Calculate bounds
        min_bounds = unreal.Vector(origin.x - box_extent.x, origin.y - box_extent.y, origin.z - box_extent.z)
        max_bounds = unreal.Vector(origin.x + box_extent.x, origin.y + box_extent.y, origin.z + box_extent.z)

        # Add basic mesh info
        info.update(
            {
                "bounds": self._format_bounds(origin, box_extent, min_bounds, max_bounds),
                "pivot": {
                    "type": self._detect_pivot_type(origin, box_extent),
                    "offset": {"x": float(origin.x), "y": float(origin.y), "z": float(origin.z)},
                },
                "numVertices": asset.get_num_vertices(0),
                "numTriangles": asset.get_num_triangles(0),
                "numMaterials": asset.get_num_sections(0),
                "numLODs": asset.get_num_lods(),
            }
        )

        # Add collision info
        info["collision"] = self._get_collision_info(asset)

        # Add sockets info
        info["sockets"] = self._get_socket_info(asset)

        # Add material slots
        info["materialSlots"] = self._get_material_slots(asset)

    def _format_bounds(self, origin, box_extent, min_bounds, max_bounds):
        """Format bounds information.

        Args:
            origin: Origin vector
            box_extent: Box extent vector
            min_bounds: Minimum bounds vector
            max_bounds: Maximum bounds vector

        Returns:
            dict: Formatted bounds
        """
        return {
            "extent": {"x": float(box_extent.x), "y": float(box_extent.y), "z": float(box_extent.z)},
            "origin": {"x": float(origin.x), "y": float(origin.y), "z": float(origin.z)},
            "size": {"x": float(box_extent.x * 2), "y": float(box_extent.y * 2), "z": float(box_extent.z * 2)},
            "min": {"x": float(min_bounds.x), "y": float(min_bounds.y), "z": float(min_bounds.z)},
            "max": {"x": float(max_bounds.x), "y": float(max_bounds.y), "z": float(max_bounds.z)},
        }

    def _get_collision_info(self, asset):
        """Get collision information from a static mesh.

        Args:
            asset: Static mesh asset

        Returns:
            dict: Collision information
        """
        collision_info = {"hasCollision": False, "numCollisionPrimitives": 0}

        # Get collision primitive count
        if hasattr(asset, "get_num_collision_primitives"):
            num_primitives = asset.get_num_collision_primitives()
            if num_primitives is not None:
                collision_info["hasCollision"] = num_primitives > 0
                collision_info["numCollisionPrimitives"] = num_primitives

        # Get body setup details
        body_setup = asset.get_editor_property("body_setup")
        if body_setup:
            if hasattr(body_setup, "collision_trace_flag"):
                collision_info["collisionComplexity"] = str(body_setup.collision_trace_flag)
            else:
                collision_info["collisionComplexity"] = "Unknown"
            collision_info["hasSimpleCollision"] = self._has_simple_collision(body_setup)

        return collision_info

    def _get_socket_info(self, asset):
        """Get socket information from a static mesh.

        Args:
            asset: Static mesh asset

        Returns:
            list: Socket information
        """
        sockets = []
        if hasattr(asset, "get_sockets"):
            mesh_sockets = asset.get_sockets()
            if mesh_sockets:
                for socket in mesh_sockets:
                    # Validate socket has required attributes
                    if (hasattr(socket, 'socket_name') and hasattr(socket, 'relative_location') and
                        hasattr(socket, 'relative_rotation') and hasattr(socket, 'relative_scale')):
                        sockets.append(
                            {
                                "name": str(socket.socket_name),
                                "location": {
                                    "x": float(socket.relative_location.x),
                                    "y": float(socket.relative_location.y),
                                    "z": float(socket.relative_location.z),
                                },
                                "rotation": {
                                    "roll": float(socket.relative_rotation.roll),
                                    "pitch": float(socket.relative_rotation.pitch),
                                    "yaw": float(socket.relative_rotation.yaw),
                                },
                                "scale": {
                                    "x": float(socket.relative_scale.x),
                                    "y": float(socket.relative_scale.y),
                                    "z": float(socket.relative_scale.z),
                                },
                            }
                        )
        return sockets

    def _get_material_slots(self, asset):
        """Get material slot information from a static mesh.

        Args:
            asset: Static mesh asset

        Returns:
            list: Material slot information
        """
        material_slots = []
        static_materials = self._get_static_materials(asset)
        if static_materials:
            for i, mat_slot in enumerate(static_materials):
                if mat_slot:  # Validate slot exists
                    slot_info = {"slotIndex": i, "slotName": f"Slot_{i}"}

                    # Get slot name
                    if hasattr(mat_slot, "material_slot_name") and mat_slot.material_slot_name:
                        slot_info["slotName"] = str(mat_slot.material_slot_name)

                    # Get material path
                    material_path = self._get_material_path(mat_slot)
                    if material_path:
                        slot_info["materialPath"] = material_path
                    
                    material_slots.append(slot_info)
        return material_slots

    def _get_static_materials(self, asset):
        """Get static materials from a mesh asset.

        Args:
            asset: Static mesh asset

        Returns:
            list: Static materials
        """
        if hasattr(asset, "static_materials"):
            return asset.static_materials
        elif hasattr(asset, "get_static_mesh_materials"):
            return asset.get_static_mesh_materials()
        else:
            # Fallback to section materials
            materials = []
            num_sections = asset.get_num_sections(0)
            for i in range(num_sections):
                mat = asset.get_material(i)
                if mat:
                    materials.append({"material_interface": mat})
            return materials

    def _get_material_path(self, mat_slot):
        """Get material path from a material slot.

        Args:
            mat_slot: Material slot object

        Returns:
            str or None: Material path
        """
        if hasattr(mat_slot, "material_interface") and mat_slot.material_interface:
            return str(mat_slot.material_interface.get_path_name())
        elif isinstance(mat_slot, dict) and "material_interface" in mat_slot:
            if mat_slot["material_interface"]:
                return str(mat_slot["material_interface"].get_path_name())
        return None

    def _add_blueprint_info(self, info: dict, asset: unreal.Blueprint, assetPath: str):
        """Add blueprint information to the info dict.

        Args:
            info: Dictionary to populate
            asset: Blueprint asset
            assetPath: Path to the asset
        """
        info["blueprintType"] = "Blueprint"
        info["blueprintClass"] = str(asset.generated_class().get_name()) if asset.generated_class() else None

        # Get blueprint default object information
        if hasattr(asset, 'generated_class') and asset.generated_class():
            default_object = asset.generated_class().get_default_object()
            if default_object:
                # Get bounds
                if hasattr(default_object, "get_actor_bounds"):
                    bounds_result = default_object.get_actor_bounds(False)
                    if bounds_result and len(bounds_result) >= 2:
                        origin, extent = bounds_result[0], bounds_result[1]
                        info["bounds"] = {
                            "extent": {"x": float(extent.x), "y": float(extent.y), "z": float(extent.z)},
                            "origin": {"x": float(origin.x), "y": float(origin.y), "z": float(origin.z)},
                            "size": {"x": float(extent.x * 2), "y": float(extent.y * 2), "z": float(extent.z * 2)},
                        }

                # Get components
                if hasattr(default_object, "get_components"):
                    components = self._get_blueprint_components(default_object)
                    if components:
                        info["components"] = components

    def _get_blueprint_components(self, default_object):
        """Get component information from a blueprint default object.

        Args:
            default_object: Blueprint default object

        Returns:
            list: Component information
        """
        component_info = []
        components = default_object.get_components()
        for comp in components:
            comp_data = {"name": comp.get_name(), "class": comp.get_class().get_name()}
            if hasattr(comp, "static_mesh") and comp.static_mesh:
                comp_data["meshPath"] = str(comp.static_mesh.get_path_name())
            component_info.append(comp_data)
        return component_info

    def _add_material_info(self, info: dict, asset):
        """Add material information to the info dict.

        Args:
            info: Dictionary to populate
            asset: Material asset
        """
        info["materialType"] = asset.get_class().get_name()
        # Could add material parameters, textures, etc.

    def _add_texture_info(self, info: dict, asset: unreal.Texture2D):
        """Add texture information to the info dict.

        Args:
            info: Dictionary to populate
            asset: Texture2D asset
        """
        info.update(
            {
                "width": asset.blueprint_get_size_x(),
                "height": asset.blueprint_get_size_y(),
                "format": str(asset.get_pixel_format()),
            }
        )

    @validate_inputs({
        'paths': [RequiredRule(), TypeRule(list)]
    })
    @handle_unreal_errors("validate_asset_paths")
    @safe_operation("asset")
    def validate_asset_paths(self, paths: List[str]):
        """Validate multiple asset paths exist.

        Args:
            paths: List of asset paths to validate

        Returns:
            dict: Validation results for each path
        """
        results = {}
        for path in paths:
            results[path] = asset_exists(path)

        return {
            "results": results,
            "validCount": sum(1 for v in results.values() if v),
            "invalidCount": sum(1 for v in results.values() if not v),
        }

    @validate_inputs({
        'assetType': [RequiredRule(), TypeRule(str)],
        'searchPath': [RequiredRule(), TypeRule(str)],
        'limit': [TypeRule(int)]
    })
    @handle_unreal_errors("find_assets_by_type")
    @safe_operation("asset")
    def find_assets_by_type(self, assetType: str, searchPath: str = "/Game", limit: int = 50):
        """Find all assets of a specific type.

        Args:
            assetType: Type of asset to find (e.g., 'StaticMesh', 'Material')
            searchPath: Path to search in
            limit: Maximum results

        Returns:
            dict: List of matching assets
        """
        asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()

        # Build filter
        filter = unreal.ARFilter()
        filter.package_paths = [searchPath]
        filter.recursive_paths = True

        if assetType == "StaticMesh":
            filter.class_names = ["StaticMesh"]
        elif assetType == "Material":
            filter.class_names = ["Material", "MaterialInstance"]
        elif assetType == "Blueprint":
            filter.class_names = ["Blueprint"]
        elif assetType == "Texture":
            filter.class_names = ["Texture2D"]
        else:
            # Generic class filter
            filter.class_names = [assetType]

        # Get assets
        assets = asset_registry.get_assets(filter)

        # Build result list
        asset_list = []
        for i, asset in enumerate(assets):
            if i >= limit:
                break

            asset_list.append(
                {
                    "name": str(asset.asset_name),
                    "path": str(asset.package_name),
                    "type": (
                        str(asset.asset_class_path.asset_name)
                        if hasattr(asset.asset_class_path, "asset_name")
                        else str(asset.asset_class_path)
                    ),
                }
            )

        return {
            "assets": asset_list,
            "totalCount": len(assets),
            "assetType": assetType,
            "searchPath": searchPath,
        }

    @validate_inputs({
        'sourcePath': [RequiredRule(), TypeRule(str), FileExistsRule()],
        'targetFolder': [RequiredRule(), TypeRule(str)],
        'assetType': [TypeRule(str)],
        'batchImport': [TypeRule(bool)],
        'importSettings': [TypeRule(dict, allow_none=True)]
    })
    @handle_unreal_errors("import_assets")
    @safe_operation("asset")
    def import_assets(
        self,
        sourcePath: str,
        targetFolder: str = "/Game/ImportedAssets",
        importSettings: dict = None,
        assetType: str = "auto",
        batchImport: bool = False,
    ) -> dict:
        """Import assets from FAB marketplace or file system into UE project.

        Args:
            sourcePath: Path to source asset file or folder
            targetFolder: Destination folder in UE project
            importSettings: Import configuration settings
            assetType: Type of asset to import ('auto', 'staticMesh', 'material', 'texture', 'blueprint')
            batchImport: Import entire folder with all compatible assets

        Returns:
            dict: Import results with statistics and asset information
        """
        import time

        start_time = time.time()

        # Prepare import settings
        settings = self._prepare_import_settings(importSettings)

        # Ensure target folder exists in content browser
        self._ensure_content_folder_exists(targetFolder)

        # Collect files to import
        files_to_import = self._collect_import_files(sourcePath, assetType, batchImport)

        if not files_to_import:
            raise ValidationError("No compatible files found for import")

        # Process imports
        import_results = self._process_imports(files_to_import, targetFolder, settings, assetType)

        # Build final result
        processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        return self._build_import_result(import_results, targetFolder, files_to_import, processing_time)

    def _prepare_import_settings(self, importSettings):
        """Prepare import settings by merging with defaults.

        Args:
            importSettings: User-provided import settings

        Returns:
            dict: Complete import settings
        """
        default_settings = {
            "generateCollision": True,
            "generateLODs": False,
            "importMaterials": True,
            "importTextures": True,
            "combineMeshes": False,
            "createMaterialInstances": False,
            "sRGB": True,
            "compressionSettings": "TC_Default",
            "autoGenerateLODs": False,
            "lodLevels": 3,
            "overwriteExisting": False,
            "preserveHierarchy": True,
        }

        settings = default_settings.copy()
        if importSettings:
            settings.update(importSettings)
        return settings

    def _process_imports(self, files_to_import, targetFolder, settings, assetType):
        """Process the import of multiple files.

        Args:
            files_to_import: List of files to import
            targetFolder: Target content folder
            settings: Import settings
            assetType: Asset type

        Returns:
            dict: Categorized import results
        """
        imported_assets = []
        failed_assets = []
        skipped_assets = []
        total_size = 0

        for file_path in files_to_import:
            # Import single asset - errors are handled internally
            result = self._import_single_asset(file_path, targetFolder, settings, assetType)

            if result["status"] == "success":
                imported_assets.append(result)
                if result.get("size"):
                    total_size += result["size"]
            elif result["status"] == "failed":
                failed_assets.append(result)
            elif result["status"] == "skipped":
                skipped_assets.append(result)

        return {
            "imported": imported_assets,
            "failed": failed_assets,
            "skipped": skipped_assets,
            "totalSize": total_size,
        }

    def _build_import_result(self, import_results, targetFolder, files_to_import, processing_time):
        """Build the final import result dictionary.

        Args:
            import_results: Categorized import results
            targetFolder: Target content folder
            files_to_import: List of files that were processed
            processing_time: Time taken in milliseconds

        Returns:
            dict: Final formatted result
        """
        return {
            "success": True,
            "importedAssets": import_results["imported"],
            "failedAssets": import_results["failed"],
            "skippedAssets": import_results["skipped"],
            "statistics": {
                "totalProcessed": len(files_to_import),
                "successCount": len(import_results["imported"]),
                "failedCount": len(import_results["failed"]),
                "skippedCount": len(import_results["skipped"]),
                "totalSize": import_results["totalSize"] if import_results["totalSize"] > 0 else None,
            },
            "targetFolder": targetFolder,
            "processingTime": processing_time,
        }

    def _ensure_content_folder_exists(self, folder_path: str):
        """Ensure a content browser folder exists.

        Args:
            folder_path: Content browser path (e.g., '/Game/ImportedAssets')
        """
        # Convert to content browser path format
        if not folder_path.startswith("/Game"):
            folder_path = f'/Game/{folder_path.lstrip("/")}'

        # Note: UE will auto-create folders when we import assets
        # No additional action needed

    def _collect_import_files(self, source_path: str, asset_type: str, batch_import: bool) -> list:
        """Collect files to import based on source path and settings.

        Args:
            source_path: Source file or folder path
            asset_type: Type filter for assets
            batch_import: Whether to import entire folder

        Returns:
            list: List of file paths to import
        """
        import os

        # Supported file extensions by type
        SUPPORTED_EXTENSIONS = {
            "staticMesh": [".fbx", ".obj", ".dae", ".3ds", ".ase", ".ply"],
            "material": [".mat"],  # UE material files
            "texture": [".png", ".jpg", ".jpeg", ".tga", ".bmp", ".tiff", ".exr", ".hdr"],
            "blueprint": [".uasset"],  # Blueprint files
            "auto": [
                ".fbx",
                ".obj",
                ".dae",
                ".3ds",
                ".ase",
                ".ply",
                ".png",
                ".jpg",
                ".jpeg",
                ".tga",
                ".bmp",
                ".tiff",
                ".exr",
                ".hdr",
                ".uasset",
            ],
        }

        extensions = SUPPORTED_EXTENSIONS.get(asset_type, SUPPORTED_EXTENSIONS["auto"])
        files_to_import = []

        if os.path.isfile(source_path):
            # Single file import
            if any(source_path.lower().endswith(ext) for ext in extensions):
                files_to_import.append(source_path)
        elif os.path.isdir(source_path) and batch_import:
            # Batch import from folder
            for root, dirs, files in os.walk(source_path):
                for file in files:
                    if any(file.lower().endswith(ext) for ext in extensions):
                        files_to_import.append(os.path.join(root, file))
        elif os.path.isdir(source_path):
            # Single folder - only direct files
            for file in os.listdir(source_path):
                file_path = os.path.join(source_path, file)
                if os.path.isfile(file_path) and any(file.lower().endswith(ext) for ext in extensions):
                    files_to_import.append(file_path)

        return files_to_import

    def _import_single_asset(self, file_path: str, target_folder: str, settings: dict, asset_type: str) -> dict:
        """Import a single asset file.

        Args:
            file_path: Path to source file
            target_folder: Target content browser folder
            settings: Import settings
            asset_type: Asset type hint

        Returns:
            dict: Import result for this asset
        """
        from pathlib import Path

        # Validate file path exists
        if not os.path.exists(file_path):
            return {
                "originalPath": file_path,
                "targetPath": "",
                "assetType": "unknown",
                "status": "failed",
                "error": f"Source file does not exist: {file_path}",
            }

        file_name = Path(file_path).stem
        file_ext = Path(file_path).suffix.lower()

        # Determine target path
        target_path = f"{target_folder}/{file_name}"

        # Check if asset already exists and handle accordingly
        if not settings.get("overwriteExisting", False):
            if asset_exists(target_path):
                return {
                    "originalPath": file_path,
                    "targetPath": target_path,
                    "assetType": self._detect_asset_type_from_extension(file_ext),
                    "status": "skipped",
                    "error": "Asset already exists",
                }

        # Setup import task based on file type
        import_task = self._create_import_task(file_path, target_folder, settings, file_ext)

        if not import_task:
            return {
                "originalPath": file_path,
                "targetPath": target_path,
                "assetType": self._detect_asset_type_from_extension(file_ext),
                "status": "failed",
                "error": "Unsupported file type or failed to create import task",
            }

        # Execute import
        asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
        imported_assets = asset_tools.import_asset_tasks([import_task])

        if imported_assets and len(imported_assets) > 0:
            imported_asset = imported_assets[0]

            # Get asset information
            asset_info = self._get_imported_asset_info(imported_asset, file_path)

            return {
                "originalPath": file_path,
                "targetPath": imported_asset.get_path_name(),
                "assetType": imported_asset.get_class().get_name(),
                "status": "success",
                "size": asset_info.get("size", 0),
                "vertexCount": asset_info.get("vertexCount"),
                "materialCount": asset_info.get("materialCount"),
            }
        else:
            return {
                "originalPath": file_path,
                "targetPath": target_path,
                "assetType": self._detect_asset_type_from_extension(file_ext),
                "status": "failed",
                "error": "Import task completed but no assets were created",
            }

    def _detect_asset_type_from_extension(self, file_ext: str) -> str:
        """Detect asset type from file extension.

        Args:
            file_ext: File extension (with dot)

        Returns:
            str: Asset type
        """
        ext = file_ext.lower()

        if ext in [".fbx", ".obj", ".dae", ".3ds", ".ase", ".ply"]:
            return "StaticMesh"
        elif ext in [".png", ".jpg", ".jpeg", ".tga", ".bmp", ".tiff", ".exr", ".hdr"]:
            return "Texture2D"
        elif ext in [".mat"]:
            return "Material"
        elif ext in [".uasset"]:
            return "Blueprint"
        else:
            return "Unknown"

    def _create_import_task(
        self, file_path: str, target_folder: str, settings: dict, file_ext: str
    ) -> unreal.AssetImportTask:
        """Create an import task for the given file.

        Args:
            file_path: Source file path
            target_folder: Target content folder
            settings: Import settings
            file_ext: File extension

        Returns:
            AssetImportTask or None if unsupported
        """
        # Validate file path exists before creating task
        if not os.path.exists(file_path):
            log_error(f"Cannot create import task - file does not exist: {file_path}")
            return None

        task = self._create_base_import_task(file_path, target_folder, settings)
        if not task:
            log_error(f"Failed to create base import task for: {file_path}")
            return None

        # Configure options based on file type
        if file_ext in [".fbx", ".obj", ".dae", ".3ds", ".ase", ".ply"]:
            self._configure_mesh_import(task, settings)
        elif file_ext in [".png", ".jpg", ".jpeg", ".tga", ".bmp", ".tiff", ".exr", ".hdr"]:
            self._configure_texture_import(task, settings)

        return task

    def _create_base_import_task(self, file_path: str, target_folder: str, settings: dict) -> unreal.AssetImportTask:
        """Create a base import task with common settings.

        Args:
            file_path: Source file path
            target_folder: Target content folder
            settings: Import settings

        Returns:
            AssetImportTask with base configuration
        """
        task = unreal.AssetImportTask()
        task.filename = file_path
        task.destination_path = target_folder
        task.replace_existing = settings.get("overwriteExisting", False)
        task.automated = True
        task.save = True
        return task

    def _configure_mesh_import(self, task: unreal.AssetImportTask, settings: dict):
        """Configure import task for mesh files.

        Args:
            task: Import task to configure
            settings: Import settings
        """
        options = unreal.FbxImportUI()

        # Mesh settings
        options.import_mesh = True
        options.import_materials = settings.get("importMaterials", True)
        options.import_textures = settings.get("importTextures", True)
        options.import_as_skeletal = False

        # Static mesh specific settings
        mesh_options = options.static_mesh_import_data
        mesh_options.combine_meshes = settings.get("combineMeshes", False)
        mesh_options.generate_lightmap_u_vs = True
        mesh_options.auto_generate_collision = settings.get("generateCollision", True)

        # LOD settings
        if settings.get("generateLODs", False):
            mesh_options.auto_generate_collision = True

        task.options = options

    def _configure_texture_import(self, task: unreal.AssetImportTask, settings: dict):
        """Configure import task for texture files.

        Args:
            task: Import task to configure
            settings: Import settings
        """
        factory = unreal.TextureFactory()
        factory.s_rgb = settings.get("sRGB", True)

        # Set compression based on settings
        compression = settings.get("compressionSettings", "TC_Default")
        if compression in self.COMPRESSION_MAP:
            factory.compression_settings = self.COMPRESSION_MAP[compression]

        task.factory = factory

    def _get_imported_asset_info(self, asset, original_file_path: str) -> dict:
        """Get information about an imported asset.

        Args:
            asset: The imported asset
            original_file_path: Original source file path

        Returns:
            dict: Asset information
        """
        import os

        info = {}

        # Get file size if original file exists
        if os.path.exists(original_file_path):
            info["size"] = os.path.getsize(original_file_path)

        # Get mesh-specific info with validation
        if isinstance(asset, unreal.StaticMesh):
            # Check if the asset has any LODs before accessing LOD 0
            if asset.get_num_lods() > 0:
                info["vertexCount"] = asset.get_num_vertices(0)
                info["materialCount"] = asset.get_num_sections(0)
            else:
                info["vertexCount"] = 0
                info["materialCount"] = 0

        return info
