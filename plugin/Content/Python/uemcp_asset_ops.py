"""
UEMCP Asset Operations - All asset and content browser operations
"""

import unreal
from uemcp_utils import load_asset, asset_exists, log_debug, log_error


class AssetOperations:
    """Handles all asset-related operations."""
    
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
                        }
                    },
                    'numVertices': asset.get_num_vertices(0),
                    'numTriangles': asset.get_num_triangles(0),
                    'numMaterials': asset.get_num_sections(0)
                })
                
                # Get sockets if any
                sockets = getattr(asset, 'sockets', [])
                if sockets:
                    socket_info = []
                    for socket in sockets:
                        socket_info.append({
                            'name': socket.socket_name,
                            'location': {
                                'x': float(socket.relative_location.x),
                                'y': float(socket.relative_location.y),
                                'z': float(socket.relative_location.z)
                            },
                            'rotation': {
                                'pitch': float(socket.relative_rotation.pitch),
                                'yaw': float(socket.relative_rotation.yaw),
                                'roll': float(socket.relative_rotation.roll)
                            }
                        })
                    info['sockets'] = socket_info
            
            # Get info for blueprints
            elif isinstance(asset, unreal.Blueprint):
                info['blueprintType'] = 'Blueprint'
                # Could add more blueprint-specific info here
            
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