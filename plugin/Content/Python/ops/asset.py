"""
UEMCP Asset Operations - All asset and content browser operations
"""

import unreal
from typing import Dict, Any, List, Optional
from utils import load_asset, asset_exists, log_error


class AssetOperations:
    """Handles all asset-related operations."""
    
    # Tolerance for pivot type detection (in Unreal units)
    PIVOT_TOLERANCE = 0.1
    
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
                return 'corner-bottom'
            else:
                return 'bottom-center'
        
        # Default to center
        return 'center'
    
    def _has_simple_collision(self, body_setup):
        """Check if a body setup has simple collision geometry.
        
        Args:
            body_setup: The body setup to check
            
        Returns:
            bool: True if simple collision exists, False otherwise
        """
        if not body_setup or not hasattr(body_setup, 'aggregate_geom'):
            return False
            
        aggregate_geom = body_setup.aggregate_geom
        return (
            len(aggregate_geom.box_elems) > 0 or
            len(aggregate_geom.sphere_elems) > 0 or
            len(aggregate_geom.convex_elems) > 0
        )
    
    def list_assets(self, path='/Game', assetType=None, limit=20):
        """List assets in a given path.
        
        Args:
            path: Content browser path to search
            assetType: Optional filter by asset type
            limit: Maximum number of assets to return
            
        Returns:
            dict: Result with asset list
        """
        try:
            asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
            assets = asset_registry.get_assets_by_path(path, recursive=True)
            
            # Filter by asset type if specified
            if assetType:
                filtered_assets = []
                for asset in assets:
                    asset_type_name = str(asset.asset_class_path.asset_name) if hasattr(
                        asset.asset_class_path, 'asset_name'
                    ) else str(asset.asset_class_path)
                    
                    if asset_type_name == assetType:
                        filtered_assets.append(asset)
                assets = filtered_assets
            
            # Build asset list with limit
            asset_list = []
            for i, asset in enumerate(assets):
                if i >= limit:
                    break
                    
                asset_type_name = str(asset.asset_class_path.asset_name) if hasattr(
                    asset.asset_class_path, 'asset_name'
                ) else str(asset.asset_class_path)
                
                asset_list.append({
                    'name': str(asset.asset_name),
                    'type': asset_type_name,
                    'path': str(asset.package_name)
                })
            
            return {
                'success': True,
                'assets': asset_list,
                'totalCount': len(assets),
                'path': path
            }
            
        except Exception as e:
            log_error(f"Failed to list assets: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_asset_info(self, assetPath: str) -> Dict[str, Any]:
        """Get detailed information about an asset.
        
        Args:
            assetPath: Path to the asset
            
        Returns:
            dict: Asset information
        """
        try:
            # Load the asset
            asset = load_asset(assetPath)
            if not asset:
                return {'success': False, 'error': f'Could not load asset: {assetPath}'}
            
            info = {
                'success': True,
                'assetPath': assetPath,
                'assetType': asset.get_class().get_name()
            }
            
            # Get bounds for static meshes
            if isinstance(asset, unreal.StaticMesh):
                bounds = asset.get_bounds()
                box_extent = bounds.box_extent
                origin = bounds.origin
                
                # Calculate more detailed bounds information
                min_bounds = unreal.Vector(
                    origin.x - box_extent.x,
                    origin.y - box_extent.y,
                    origin.z - box_extent.z
                )
                max_bounds = unreal.Vector(
                    origin.x + box_extent.x,
                    origin.y + box_extent.y,
                    origin.z + box_extent.z
                )
                
                # Determine pivot type based on origin position
                pivot_type = self._detect_pivot_type(origin, box_extent)
                
                info.update({
                    'bounds': {
                        'extent': {
                            'x': float(box_extent.x),
                            'y': float(box_extent.y),
                            'z': float(box_extent.z)
                        },
                        'origin': {
                            'x': float(origin.x),
                            'y': float(origin.y),
                            'z': float(origin.z)
                        },
                        'size': {
                            'x': float(box_extent.x * 2),
                            'y': float(box_extent.y * 2),
                            'z': float(box_extent.z * 2)
                        },
                        'min': {
                            'x': float(min_bounds.x),
                            'y': float(min_bounds.y),
                            'z': float(min_bounds.z)
                        },
                        'max': {
                            'x': float(max_bounds.x),
                            'y': float(max_bounds.y),
                            'z': float(max_bounds.z)
                        }
                    },
                    'pivot': {
                        'type': pivot_type,
                        'offset': {
                            'x': float(origin.x),
                            'y': float(origin.y),
                            'z': float(origin.z)
                        }
                    },
                    'numVertices': asset.get_num_vertices(0),
                    'numTriangles': asset.get_num_triangles(0),
                    'numMaterials': asset.get_num_sections(0),
                    'numLODs': asset.get_num_lods()
                })
                
                # Get collision info
                collision_info = {
                    'hasCollision': asset.get_num_collision_primitives() > 0,
                    'numCollisionPrimitives': asset.get_num_collision_primitives()
                }
                
                # Try to get more collision details
                body_setup = asset.get_editor_property('body_setup')
                if body_setup:
                    if hasattr(body_setup, 'collision_trace_flag'):
                        collision_info['collisionComplexity'] = str(body_setup.collision_trace_flag)
                    else:
                        collision_info['collisionComplexity'] = 'Unknown'
                    
                    # Check for simple collision
                    collision_info['hasSimpleCollision'] = self._has_simple_collision(body_setup)
                
                info['collision'] = collision_info
                
                # Get sockets if any
                sockets = asset.get_sockets()
                if sockets:
                    socket_info = []
                    for socket in sockets:
                        socket_info.append({
                            'name': str(socket.socket_name),
                            'location': {
                                'x': float(socket.relative_location.x),
                                'y': float(socket.relative_location.y),
                                'z': float(socket.relative_location.z)
                            },
                            'rotation': {
                                'roll': float(socket.relative_rotation.roll),
                                'pitch': float(socket.relative_rotation.pitch),
                                'yaw': float(socket.relative_rotation.yaw)
                            },
                            'scale': {
                                'x': float(socket.relative_scale.x),
                                'y': float(socket.relative_scale.y),
                                'z': float(socket.relative_scale.z)
                            }
                        })
                    info['sockets'] = socket_info
                else:
                    info['sockets'] = []
                
                # Get material slots
                material_slots = []
                static_materials = asset.get_static_materials()
                for i, mat_slot in enumerate(static_materials):
                    material_slots.append({
                        'slotName': str(mat_slot.material_slot_name) if mat_slot.material_slot_name else f"Slot_{i}",
                        'materialPath': str(mat_slot.material_interface.get_path_name()) 
                                        if mat_slot.material_interface else None
                    })
                info['materialSlots'] = material_slots
            
            # Get info for blueprints
            elif isinstance(asset, unreal.Blueprint):
                info['blueprintType'] = 'Blueprint'
                info['blueprintClass'] = str(asset.generated_class().get_name()) if asset.generated_class() else None
                
                # Try to get bounds from the default object
                try:
                    default_object = asset.generated_class().get_default_object()
                    if default_object and hasattr(default_object, 'get_actor_bounds'):
                        origin, extent = default_object.get_actor_bounds(False)
                        info['bounds'] = {
                            'extent': {
                                'x': float(extent.x),
                                'y': float(extent.y),
                                'z': float(extent.z)
                            },
                            'origin': {
                                'x': float(origin.x),
                                'y': float(origin.y),
                                'z': float(origin.z)
                            },
                            'size': {
                                'x': float(extent.x * 2),
                                'y': float(extent.y * 2),
                                'z': float(extent.z * 2)
                            }
                        }
                    
                    # Get component information
                    if hasattr(default_object, 'get_components'):
                        components = default_object.get_components()
                        component_info = []
                        for comp in components:
                            comp_data = {
                                'name': comp.get_name(),
                                'class': comp.get_class().get_name()
                            }
                            # Add mesh info if it's a mesh component
                            if hasattr(comp, 'static_mesh') and comp.static_mesh:
                                comp_data['meshPath'] = str(comp.static_mesh.get_path_name())
                            component_info.append(comp_data)
                        info['components'] = component_info
                except AttributeError as e:
                    log_error(f"AttributeError while retrieving bounds or components for Blueprint '{assetPath}': {e}")
                except RuntimeError as e:
                    log_error(f"RuntimeError while retrieving bounds or components for Blueprint '{assetPath}': {e}")
            
            # Get info for materials
            elif isinstance(asset, unreal.Material) or isinstance(asset, unreal.MaterialInstance):
                info['materialType'] = asset.get_class().get_name()
                # Could add material parameters, textures, etc.
            
            # Get info for textures
            elif isinstance(asset, unreal.Texture2D):
                info.update({
                    'width': asset.blueprint_get_size_x(),
                    'height': asset.blueprint_get_size_y(),
                    'format': str(asset.get_pixel_format())
                })
            
            return info
            
        except Exception as e:
            log_error(f"Failed to get asset info: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def validate_asset_paths(self, paths):
        """Validate multiple asset paths exist.
        
        Args:
            paths: List of asset paths to validate
            
        Returns:
            dict: Validation results for each path
        """
        try:
            results = {}
            for path in paths:
                results[path] = asset_exists(path)
            
            return {
                'success': True,
                'results': results,
                'validCount': sum(1 for v in results.values() if v),
                'invalidCount': sum(1 for v in results.values() if not v)
            }
            
        except Exception as e:
            log_error(f"Failed to validate asset paths: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def find_assets_by_type(self, assetType, searchPath='/Game', limit=50):
        """Find all assets of a specific type.
        
        Args:
            assetType: Type of asset to find (e.g., 'StaticMesh', 'Material')
            searchPath: Path to search in
            limit: Maximum results
            
        Returns:
            dict: List of matching assets
        """
        try:
            asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
            
            # Build filter
            filter = unreal.ARFilter()
            filter.package_paths = [searchPath]
            filter.recursive_paths = True
            
            if assetType == 'StaticMesh':
                filter.class_names = ['StaticMesh']
            elif assetType == 'Material':
                filter.class_names = ['Material', 'MaterialInstance']
            elif assetType == 'Blueprint':
                filter.class_names = ['Blueprint']
            elif assetType == 'Texture':
                filter.class_names = ['Texture2D']
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
                
                asset_list.append({
                    'name': str(asset.asset_name),
                    'path': str(asset.package_name),
                    'type': str(asset.asset_class_path.asset_name) if hasattr(
                        asset.asset_class_path, 'asset_name'
                    ) else str(asset.asset_class_path)
                })
            
            return {
                'success': True,
                'assets': asset_list,
                'totalCount': len(assets),
                'assetType': assetType,
                'searchPath': searchPath
            }
            
        except Exception as e:
            log_error(f"Failed to find assets by type: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def import_assets(self, sourcePath: str, targetFolder: str = '/Game/ImportedAssets', 
                     importSettings: dict = None, assetType: str = 'auto', 
                     batchImport: bool = False) -> dict:
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
        import os
        import time
        from pathlib import Path
        
        try:
            start_time = time.time()
            
            # Initialize default import settings
            default_settings = {
                'generateCollision': True,
                'generateLODs': False,
                'importMaterials': True,
                'importTextures': True,
                'combineMeshes': False,
                'createMaterialInstances': False,
                'sRGB': True,
                'compressionSettings': 'TC_Default',
                'autoGenerateLODs': False,
                'lodLevels': 3,
                'overwriteExisting': False,
                'preserveHierarchy': True
            }
            
            # Merge with provided settings
            settings = default_settings.copy()
            if importSettings:
                settings.update(importSettings)
            
            # Validate source path
            if not os.path.exists(sourcePath):
                return {
                    'success': False,
                    'error': f'Source path does not exist: {sourcePath}'
                }
            
            # Ensure target folder exists in content browser
            self._ensure_content_folder_exists(targetFolder)
            
            # Collect files to import
            files_to_import = self._collect_import_files(sourcePath, assetType, batchImport)
            
            if not files_to_import:
                return {
                    'success': False,
                    'error': 'No compatible files found for import'
                }
            
            # Initialize result tracking
            imported_assets = []
            failed_assets = []
            skipped_assets = []
            total_size = 0
            
            # Import each file
            for file_path in files_to_import:
                try:
                    result = self._import_single_asset(
                        file_path, targetFolder, settings, assetType
                    )
                    
                    if result['status'] == 'success':
                        imported_assets.append(result)
                        if result.get('size'):
                            total_size += result['size']
                    elif result['status'] == 'failed':
                        failed_assets.append(result)
                    elif result['status'] == 'skipped':
                        skipped_assets.append(result)
                        
                except Exception as e:
                    failed_assets.append({
                        'originalPath': file_path,
                        'targetPath': '',
                        'assetType': assetType,
                        'status': 'failed',
                        'error': str(e)
                    })
            
            processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Build final result
            result = {
                'success': True,
                'importedAssets': imported_assets,
                'failedAssets': failed_assets,
                'skippedAssets': skipped_assets,
                'statistics': {
                    'totalProcessed': len(files_to_import),
                    'successCount': len(imported_assets),
                    'failedCount': len(failed_assets),
                    'skippedCount': len(skipped_assets),
                    'totalSize': total_size if total_size > 0 else None
                },
                'targetFolder': targetFolder,
                'processingTime': processing_time
            }
            
            return result
            
        except Exception as e:
            log_error(f"Failed to import assets: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def _ensure_content_folder_exists(self, folder_path: str):
        """Ensure a content browser folder exists.
        
        Args:
            folder_path: Content browser path (e.g., '/Game/ImportedAssets')
        """
        try:
            # Convert to content browser path format
            if not folder_path.startswith('/Game'):
                folder_path = f'/Game/{folder_path.lstrip("/")}'
            
            # Use AssetTools to create folder if it doesn't exist
            asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
            
            # Check if folder exists by trying to get assets in it
            asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
            existing_assets = asset_registry.get_assets_by_path(folder_path, recursive=False)
            
            # If we can't find any assets and the folder might not exist, create it
            # Note: UE will auto-create folders when we import assets, but this ensures consistency
            pass
            
        except Exception as e:
            log_error(f"Error ensuring folder exists: {str(e)}")
    
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
        from pathlib import Path
        
        # Supported file extensions by type
        SUPPORTED_EXTENSIONS = {
            'staticMesh': ['.fbx', '.obj', '.dae', '.3ds', '.ase', '.ply'],
            'material': ['.mat'],  # UE material files
            'texture': ['.png', '.jpg', '.jpeg', '.tga', '.bmp', '.tiff', '.exr', '.hdr'],
            'blueprint': ['.uasset'],  # Blueprint files
            'auto': ['.fbx', '.obj', '.dae', '.3ds', '.ase', '.ply', '.png', '.jpg', '.jpeg', 
                    '.tga', '.bmp', '.tiff', '.exr', '.hdr', '.uasset']
        }
        
        extensions = SUPPORTED_EXTENSIONS.get(asset_type, SUPPORTED_EXTENSIONS['auto'])
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
    
    def _import_single_asset(self, file_path: str, target_folder: str, 
                           settings: dict, asset_type: str) -> dict:
        """Import a single asset file.
        
        Args:
            file_path: Path to source file
            target_folder: Target content browser folder
            settings: Import settings
            asset_type: Asset type hint
            
        Returns:
            dict: Import result for this asset
        """
        import os
        from pathlib import Path
        
        try:
            file_name = Path(file_path).stem
            file_ext = Path(file_path).suffix.lower()
            
            # Determine target path
            target_path = f"{target_folder}/{file_name}"
            
            # Check if asset already exists and handle accordingly
            if not settings.get('overwriteExisting', False):
                if asset_exists(target_path):
                    return {
                        'originalPath': file_path,
                        'targetPath': target_path,
                        'assetType': self._detect_asset_type_from_extension(file_ext),
                        'status': 'skipped',
                        'error': 'Asset already exists'
                    }
            
            # Setup import task based on file type
            import_task = self._create_import_task(file_path, target_folder, settings, file_ext)
            
            if not import_task:
                return {
                    'originalPath': file_path,
                    'targetPath': target_path,
                    'assetType': self._detect_asset_type_from_extension(file_ext),
                    'status': 'failed',
                    'error': 'Unsupported file type or failed to create import task'
                }
            
            # Execute import
            asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
            imported_assets = asset_tools.import_asset_tasks([import_task])
            
            if imported_assets and len(imported_assets) > 0:
                imported_asset = imported_assets[0]
                
                # Get asset information
                asset_info = self._get_imported_asset_info(imported_asset, file_path)
                
                return {
                    'originalPath': file_path,
                    'targetPath': imported_asset.get_path_name(),
                    'assetType': imported_asset.get_class().get_name(),
                    'status': 'success',
                    'size': asset_info.get('size', 0),
                    'vertexCount': asset_info.get('vertexCount'),
                    'materialCount': asset_info.get('materialCount')
                }
            else:
                return {
                    'originalPath': file_path,
                    'targetPath': target_path,
                    'assetType': self._detect_asset_type_from_extension(file_ext),
                    'status': 'failed',
                    'error': 'Import task completed but no assets were created'
                }
                
        except Exception as e:
            return {
                'originalPath': file_path,
                'targetPath': target_path if 'target_path' in locals() else '',
                'assetType': self._detect_asset_type_from_extension(file_ext) if 'file_ext' in locals() else 'unknown',
                'status': 'failed',
                'error': str(e)
            }
    
    def _detect_asset_type_from_extension(self, file_ext: str) -> str:
        """Detect asset type from file extension.
        
        Args:
            file_ext: File extension (with dot)
            
        Returns:
            str: Asset type
        """
        ext = file_ext.lower()
        
        if ext in ['.fbx', '.obj', '.dae', '.3ds', '.ase', '.ply']:
            return 'StaticMesh'
        elif ext in ['.png', '.jpg', '.jpeg', '.tga', '.bmp', '.tiff', '.exr', '.hdr']:
            return 'Texture2D'
        elif ext in ['.mat']:
            return 'Material'
        elif ext in ['.uasset']:
            return 'Blueprint'
        else:
            return 'Unknown'
    
    def _create_import_task(self, file_path: str, target_folder: str, 
                          settings: dict, file_ext: str) -> unreal.AssetImportTask:
        """Create an import task for the given file.
        
        Args:
            file_path: Source file path
            target_folder: Target content folder
            settings: Import settings
            file_ext: File extension
            
        Returns:
            AssetImportTask or None if unsupported
        """
        try:
            task = unreal.AssetImportTask()
            task.filename = file_path
            task.destination_path = target_folder
            task.replace_existing = settings.get('overwriteExisting', False)
            task.automated = True
            task.save = True
            
            # Configure options based on file type
            if file_ext in ['.fbx', '.obj', '.dae', '.3ds', '.ase', '.ply']:
                # Static mesh import
                options = unreal.FbxImportUI()
                
                # Mesh settings
                options.import_mesh = True
                options.import_materials = settings.get('importMaterials', True)
                options.import_textures = settings.get('importTextures', True)
                options.import_as_skeletal = False
                
                # Static mesh specific settings
                mesh_options = options.static_mesh_import_data
                mesh_options.combine_meshes = settings.get('combineMeshes', False)
                mesh_options.generate_lightmap_u_vs = True
                mesh_options.auto_generate_collision = settings.get('generateCollision', True)
                
                # LOD settings
                if settings.get('generateLODs', False):
                    mesh_options.auto_generate_collision = True
                
                task.options = options
                
            elif file_ext in ['.png', '.jpg', '.jpeg', '.tga', '.bmp', '.tiff', '.exr', '.hdr']:
                # Texture import - use TextureFactory
                factory = unreal.TextureFactory()
                factory.srgb = settings.get('sRGB', True)
                
                # Set compression based on settings
                compression_map = {
                    'TC_Default': unreal.TextureCompressionSettings.TC_DEFAULT,
                    'TC_Normalmap': unreal.TextureCompressionSettings.TC_NORMALMAP,
                    'TC_Masks': unreal.TextureCompressionSettings.TC_MASKS,
                    'TC_Grayscale': unreal.TextureCompressionSettings.TC_GRAYSCALE
                }
                
                compression = settings.get('compressionSettings', 'TC_Default')
                if compression in compression_map:
                    factory.compression_settings = compression_map[compression]
                
                task.factory = factory
            
            return task
            
        except Exception as e:
            log_error(f"Failed to create import task: {str(e)}")
            return None
    
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
        
        try:
            # Get file size
            if os.path.exists(original_file_path):
                info['size'] = os.path.getsize(original_file_path)
            
            # Get mesh-specific info
            if isinstance(asset, unreal.StaticMesh):
                info['vertexCount'] = asset.get_num_vertices(0)
                info['materialCount'] = asset.get_num_sections(0)
            
        except Exception as e:
            log_error(f"Error getting asset info: {str(e)}")
        
        return info