"""
UEMCP Asset Operations - All asset and content browser operations
"""

import unreal
from utils import load_asset, asset_exists, log_error


class AssetOperations:
    """Handles all asset-related operations."""
    
    # Tolerance for pivot type detection (in Unreal units)
    PIVOT_TOLERANCE = 0.1
    
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
    
    def get_asset_info(self, assetPath):
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
                pivot_type = 'center'  # Default assumption
                tolerance = self.PIVOT_TOLERANCE
                if abs(origin.z + box_extent.z) < tolerance:
                    pivot_type = 'bottom-center'
                elif abs(origin.x + box_extent.x) < tolerance and abs(origin.y + box_extent.y) < tolerance:
                    pivot_type = 'corner-bottom'
                
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
                    collision_info['collisionComplexity'] = str(body_setup.collision_trace_flag)
                    # Check for simple collision
                    collision_info['hasSimpleCollision'] = (
                        len(body_setup.aggregate_geom.box_elems) > 0 or
                        len(body_setup.aggregate_geom.sphere_elems) > 0 or
                        len(body_setup.aggregate_geom.convex_elems) > 0
                    )
                
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
                    log_error(f"AttributeError while retrieving bounds or components for asset: {e}")
                except RuntimeError as e:
                    log_error(f"RuntimeError while retrieving bounds or components for asset: {e}")
            
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