"""
UEMCP Fixed Listener - Properly handles threading and provides status
"""

import unreal
import json
import threading
import time
import os
import sys
import socket
import subprocess
import math
from http.server import HTTPServer, BaseHTTPRequestHandler
import queue

# Global state
server_running = False
server_thread = None
httpd = None
tick_handle = None
restart_scheduled = False
restart_countdown = 0

# Import thread tracker
try:
    import uemcp_thread_tracker
except ImportError:
    pass

# Queue for main thread execution
command_queue = queue.Queue()
response_queue = {}
restart_scheduled = False

class UEMCPHandler(BaseHTTPRequestHandler):
    """HTTP handler for UEMCP commands"""
    
    def do_GET(self):
        """Provide detailed status information"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        # Get project info (safe to call from any thread for basic info)
        try:
            project_name = "DemoMaze"
            status = {
                'status': 'online',
                'service': 'UEMCP Listener',
                'version': '1.0',
                'project': project_name,
                'engine_version': '5.6',
                'ready': True,
                'endpoints': {
                    'GET /': 'Status and health check',
                    'POST /': 'Execute UEMCP commands'
                },
                'available_commands': [
                    'project.info',
                    'asset.list', 
                    'asset.info',
                    'level.actors',
                    'actor.create',
                    'actor.spawn',
                    'actor.delete',
                    'actor.modify',
                    'actor.duplicate',
                    'actor.organize',
                    'level.save',
                    'level.outliner',
                    'viewport.screenshot',
                    'viewport.camera',
                    'viewport.mode',
                    'viewport.focus',
                    'viewport.render_mode',
                    'viewport.bounds',
                    'viewport.fit',
                    'python.execute',
                    'system.restart'
                ],
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
            }
        except:
            status = {
                'status': 'online',
                'service': 'UEMCP Listener',
                'ready': True,
                'error': 'Could not get project info'
            }
        
        self.wfile.write(json.dumps(status, indent=2).encode('utf-8'))
    
    def do_POST(self):
        """Handle command execution"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            command = json.loads(post_data.decode('utf-8'))
            
            # Create unique request ID
            request_id = f"req_{time.time()}_{threading.get_ident()}"
            
            # Log incoming command
            cmd_type = command.get('type', 'unknown')
            # Only log in debug mode to reduce overhead
            if os.environ.get('UEMCP_DEBUG'):
                unreal.log(f"UEMCP: Received command: {cmd_type} (ID: {request_id})")
            
            # Queue command for main thread
            command_queue.put((request_id, command))
            
            # Wait for response
            timeout = 10.0
            start_time = time.time()
            
            while request_id not in response_queue:
                if time.time() - start_time > timeout:
                    self.send_error(504, "Command execution timeout")
                    return
                time.sleep(0.01)
            
            # Get and send response
            result = response_queue.pop(request_id)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result, indent=2).encode('utf-8'))
            
        except Exception as e:
            unreal.log_error(f"UEMCP: POST request handler error: {str(e)}")
            unreal.log_error(f"UEMCP: Error type: {type(e).__name__}")
            import traceback
            unreal.log_error(f"UEMCP: Traceback: {traceback.format_exc()}")
            
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error = {
                'success': False, 
                'error': str(e),
                'error_type': type(e).__name__
            }
            self.wfile.write(json.dumps(error).encode('utf-8'))
    
    def log_message(self, format, *args):
        """Suppress default logging"""
        pass

def execute_on_main_thread(command):
    """Execute command on main thread"""
    cmd_type = command.get('type', '')
    params = command.get('params', {})
    
    try:
        if cmd_type == 'project.info':
            return {
                'success': True,
                'projectName': unreal.Paths.get_project_file_path().split('/')[-1].replace('.uproject', ''),
                'projectDirectory': unreal.Paths.project_dir(),
                'engineVersion': unreal.SystemLibrary.get_engine_version(),
                'currentLevel': unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world().get_name()
            }
        
        elif cmd_type == 'asset.list':
            path = params.get('path', '/Game')
            limit = params.get('limit', 20)
            asset_type_filter = params.get('assetType', None)
            
            asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
            assets = asset_registry.get_assets_by_path(path, recursive=True)
            
            # Filter by asset type if specified
            if asset_type_filter:
                filtered_assets = []
                for asset in assets:
                    asset_type = str(asset.asset_class_path.asset_name) if hasattr(asset.asset_class_path, 'asset_name') else str(asset.asset_class_path)
                    if asset_type == asset_type_filter:
                        filtered_assets.append(asset)
                assets = filtered_assets
            
            asset_list = []
            for i, asset in enumerate(assets):
                if i >= limit:
                    break
                asset_list.append({
                    'name': str(asset.asset_name),
                    'type': str(asset.asset_class_path.asset_name) if hasattr(asset.asset_class_path, 'asset_name') else str(asset.asset_class_path),
                    'path': str(asset.package_name)
                })
            
            return {
                'success': True,
                'assets': asset_list,
                'totalCount': len(assets),
                'path': path
            }
        
        elif cmd_type == 'level.actors':
            # Get all actors in level
            all_actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
            
            # Apply filter if provided
            filter_text = params.get('filter', None)
            if filter_text:
                # Filter actors by name or class (case-insensitive partial match)
                filtered_actors = []
                for actor in all_actors:
                    actor_name = actor.get_actor_label().lower()
                    actor_class = actor.get_class().get_name().lower()
                    filter_lower = filter_text.lower()
                    
                    if filter_lower in actor_name or filter_lower in actor_class:
                        filtered_actors.append(actor)
                
                actors_to_process = filtered_actors
            else:
                actors_to_process = all_actors
            
            # Build actor list with limit
            actor_list = []
            limit = params.get('limit', 30)
            for i, actor in enumerate(actors_to_process):
                if i >= limit:
                    break
                    
                location = actor.get_actor_location()
                rotation = actor.get_actor_rotation()
                scale = actor.get_actor_scale3d()
                
                actor_data = {
                    'name': actor.get_actor_label(),
                    'class': actor.get_class().get_name(),
                    'location': {
                        'x': float(location.x),
                        'y': float(location.y),
                        'z': float(location.z)
                    },
                    'rotation': {
                        'roll': float(rotation.roll),
                        'pitch': float(rotation.pitch),
                        'yaw': float(rotation.yaw)
                    },
                    'scale': {
                        'x': float(scale.x),
                        'y': float(scale.y),
                        'z': float(scale.z)
                    }
                }
                
                # Get asset path for static mesh actors
                if hasattr(actor, 'static_mesh_component'):
                    mesh_component = actor.static_mesh_component
                    if mesh_component and mesh_component.static_mesh:
                        actor_data['assetPath'] = mesh_component.static_mesh.get_path_name().split(':')[0]
                
                actor_list.append(actor_data)
            
            return {
                'success': True,
                'actors': actor_list,
                'totalCount': len(actors_to_process),
                'currentLevel': unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world().get_name()
            }
        
        elif cmd_type == 'actor.duplicate':
            # Duplicate an existing actor
            source_name = params.get('sourceName')
            new_name = params.get('name')
            offset = params.get('offset', {'x': 0, 'y': 0, 'z': 0})
            validate = params.get('validate', True)  # Default to True for safety
            
            if not source_name:
                return {'success': False, 'error': 'sourceName parameter is required'}
            
            # Find source actor
            all_actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
            source_actor = None
            
            for actor in all_actors:
                if actor.get_actor_label() == source_name:
                    source_actor = actor
                    break
            
            if not source_actor:
                return {'success': False, 'error': f'Source actor "{source_name}" not found'}
            
            # Get source properties
            source_location = source_actor.get_actor_location()
            source_rotation = source_actor.get_actor_rotation()
            source_scale = source_actor.get_actor_scale3d()
            
            # Calculate new location with offset
            new_location = unreal.Vector(
                source_location.x + offset.get('x', 0),
                source_location.y + offset.get('y', 0),
                source_location.z + offset.get('z', 0)
            )
            
            # Duplicate based on actor type
            if hasattr(source_actor, 'static_mesh_component'):
                mesh_component = source_actor.static_mesh_component
                if mesh_component and mesh_component.static_mesh:
                    # Spawn new actor with same mesh
                    new_actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
                        mesh_component.static_mesh,
                        new_location,
                        source_rotation
                    )
                    
                    if new_actor:
                        # Set scale
                        new_actor.set_actor_scale3d(source_scale)
                        
                        # Set name
                        if new_name:
                            new_actor.set_actor_label(new_name)
                        else:
                            # Auto-generate name
                            new_actor.set_actor_label(f"{source_name}_Copy")
                        
                        # Copy folder path
                        source_folder = source_actor.get_folder_path()
                        if source_folder:
                            new_actor.set_folder_path(source_folder)
                        
                        unreal.log(f"UEMCP: Duplicated actor {source_name} to {new_actor.get_actor_label()}")
                        
                        # Validate if requested
                        validation_result = None
                        if validate:
                            import uemcp_validation
                            validation_result = uemcp_validation.validate_actor_spawn(
                                new_actor.get_actor_label(),
                                expected_location=[new_location.x, new_location.y, new_location.z],
                                expected_rotation=[source_rotation.roll, source_rotation.pitch, source_rotation.yaw],
                                expected_scale=[source_scale.x, source_scale.y, source_scale.z],
                                expected_folder=source_folder if source_folder else None
                            )
                        
                        response = {
                            'success': True,
                            'actorName': new_actor.get_actor_label(),
                            'location': {
                                'x': float(new_location.x),
                                'y': float(new_location.y),
                                'z': float(new_location.z)
                            }
                        }
                        
                        # Add validation info if validation was performed
                        if validation_result:
                            response['validated'] = validation_result.success
                            if validation_result.errors:
                                response['validation_errors'] = validation_result.errors
                            if validation_result.warnings:
                                response['validation_warnings'] = validation_result.warnings
                        
                        return response
            
            return {'success': False, 'error': 'Failed to duplicate actor'}
        
        elif cmd_type == 'actor.create' or cmd_type == 'actor.spawn':
            # Support both legacy 'type' parameter and new 'assetPath' parameter
            actor_type = params.get('type', None)
            asset_path = params.get('assetPath', None)
            location = params.get('location', [0, 0, 100])
            rotation = params.get('rotation', [0, 0, 0])
            scale = params.get('scale', [1, 1, 1])
            name = params.get('name', f'UEMCP_Actor_{int(time.time())}')
            folder = params.get('folder', None)
            validate = params.get('validate', True)  # Default to True for safety
            
            # Create transform
            ue_location = unreal.Vector(float(location[0]), float(location[1]), float(location[2]))
            
            # Create rotation with explicit property setting to avoid constructor confusion
            # Rotation array is [Roll, Pitch, Yaw] = [X, Y, Z] as per Unreal Engine standard
            ue_rotation = unreal.Rotator()
            ue_rotation.roll = float(rotation[0])   # Roll (X axis rotation)
            ue_rotation.pitch = float(rotation[1])  # Pitch (Y axis rotation) 
            ue_rotation.yaw = float(rotation[2])    # Yaw (Z axis rotation)
            
            ue_scale = unreal.Vector(float(scale[0]), float(scale[1]), float(scale[2]))
            
            # Handle asset path or type
            if asset_path:
                # Load specified asset
                asset = unreal.EditorAssetLibrary.load_asset(asset_path)
                if not asset:
                    return {'success': False, 'error': f'Could not load asset: {asset_path}'}
            elif actor_type == 'cube':
                # Legacy cube support
                asset = unreal.EditorAssetLibrary.load_asset('/Engine/BasicShapes/Cube')
                if not asset:
                    return {'success': False, 'error': 'Could not load cube mesh'}
            else:
                return {'success': False, 'error': 'No assetPath or valid type provided'}
            
            # Spawn actor based on asset type
            if isinstance(asset, unreal.StaticMesh):
                # Spawn static mesh actor
                # Spawn static mesh actor
                actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
                    unreal.StaticMeshActor.static_class(),
                    ue_location,
                    ue_rotation
                )
                
                if actor:
                    # Set mesh
                    mesh_comp = actor.get_editor_property('static_mesh_component')
                    mesh_comp.set_static_mesh(asset)
                    actor.set_actor_label(name)
                    actor.set_actor_scale3d(ue_scale)
                    
                    # Set folder if specified
                    if folder:
                        actor.set_folder_path(folder)
                    
                    unreal.log(f"UEMCP: Spawned {name} at {location}")
                    
                    # Validate if requested
                    validation_result = None
                    if validate:
                        import uemcp_validation
                        validation_result = uemcp_validation.validate_actor_spawn(
                            name, 
                            expected_location=location,
                            expected_rotation=rotation,
                            expected_scale=scale,
                            expected_mesh_path=asset_path or '/Engine/BasicShapes/Cube',
                            expected_folder=folder
                        )
                    
                    response = {
                        'success': True,
                        'actorName': name,
                        'location': location,
                        'rotation': rotation,
                        'scale': scale,
                        'assetPath': asset_path or '/Engine/BasicShapes/Cube',
                        'message': f'Created {name} at {location}'
                    }
                    
                    # Add validation info if validation was performed
                    if validation_result:
                        response['validated'] = validation_result.success
                        if validation_result.errors:
                            response['validation_errors'] = validation_result.errors
                        if validation_result.warnings:
                            response['validation_warnings'] = validation_result.warnings
                    
                    return response
            elif isinstance(asset, unreal.Blueprint):
                # Spawn blueprint actor
                # Spawn blueprint actor
                actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
                    asset,
                    ue_location,
                    ue_rotation
                )
                
                if actor:
                    actor.set_actor_label(name)
                    actor.set_actor_scale3d(ue_scale)
                    
                    # Set folder if specified
                    if folder:
                        actor.set_folder_path(folder)
                    
                    unreal.log(f"UEMCP: Spawned blueprint {name} at {location}")
                    
                    # Validate if requested
                    validation_result = None
                    if validate:
                        import uemcp_validation
                        validation_result = uemcp_validation.validate_actor_spawn(
                            name, 
                            expected_location=location,
                            expected_rotation=rotation,
                            expected_scale=scale,
                            expected_folder=folder
                        )
                    
                    response = {
                        'success': True,
                        'actorName': name,
                        'location': location,
                        'rotation': rotation,
                        'scale': scale,
                        'assetPath': asset_path,
                        'message': f'Created blueprint actor {name} at {location}'
                    }
                    
                    # Add validation info if validation was performed
                    if validation_result:
                        response['validated'] = validation_result.success
                        if validation_result.errors:
                            response['validation_errors'] = validation_result.errors
                        if validation_result.warnings:
                            response['validation_warnings'] = validation_result.warnings
                    
                    return response
            else:
                return {'success': False, 'error': f'Unsupported asset type: {type(asset).__name__}'}
        
        elif cmd_type == 'actor.organize':
            actors = params.get('actors', [])
            pattern = params.get('pattern', None)
            folder = params.get('folder', '')
            
            if not folder:
                return {'success': False, 'error': 'Folder path is required'}
            
            try:
                # Get all actors
                editor_actor_utils = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
                all_actors = editor_actor_utils.get_all_level_actors()
                
                organized_actors = []
                
                # If specific actors are provided, organize those
                if actors:
                    for actor in all_actors:
                        actor_name = actor.get_actor_label()
                        if actor_name in actors:
                            actor.set_folder_path(folder)
                            organized_actors.append(actor_name)
                
                # If pattern is provided, organize matching actors
                elif pattern:
                    for actor in all_actors:
                        actor_name = actor.get_actor_label()
                        if pattern in actor_name:
                            actor.set_folder_path(folder)
                            organized_actors.append(actor_name)
                
                # Sort for better display
                organized_actors.sort()
                
                return {
                    'success': True,
                    'count': len(organized_actors),
                    'organizedActors': organized_actors,
                    'folder': folder,
                    'message': f'Organized {len(organized_actors)} actors into {folder}'
                }
                
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        elif cmd_type == 'level.save':
            # Save current level
            success = unreal.EditorLevelLibrary.save_current_level()
            return {
                'success': success,
                'message': 'Level saved successfully' if success else 'Failed to save level'
            }
        
        elif cmd_type == 'level.outliner':
            show_empty = params.get('showEmpty', False)
            max_depth = params.get('maxDepth', 10)
            
            try:
                # Get all actors
                editor_actor_utils = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
                all_actors = editor_actor_utils.get_all_level_actors()
                
                # Build folder structure
                folder_structure = {}
                unorganized_actors = []
                organized_count = 0
                
                for actor in all_actors:
                    if actor is None:
                        continue
                        
                    actor_label = actor.get_actor_label()
                    folder_path = actor.get_folder_path()
                    
                    if folder_path:
                        organized_count += 1
                        # Convert to string if it's a Name object
                        folder_path_str = str(folder_path)
                        # Split folder path and build nested structure
                        parts = folder_path_str.split('/')
                        current = folder_structure
                        
                        for i, part in enumerate(parts):
                            if part not in current:
                                current[part] = {
                                    'actors': [],
                                    'subfolders': {}
                                }
                            
                            # If this is the last part, add the actor
                            if i == len(parts) - 1:
                                current[part]['actors'].append(actor_label)
                            
                            # Move to subfolder for next iteration
                            current = current[part]['subfolders']
                    else:
                        unorganized_actors.append(actor_label)
                
                # Sort actors in each folder
                def sort_folder_actors(folder_dict):
                    for folder_name, folder_data in folder_dict.items():
                        if 'actors' in folder_data:
                            folder_data['actors'].sort()
                        if 'subfolders' in folder_data:
                            sort_folder_actors(folder_data['subfolders'])
                
                sort_folder_actors(folder_structure)
                unorganized_actors.sort()
                
                # Count total folders
                def count_folders(folder_dict):
                    count = len(folder_dict)
                    for folder_data in folder_dict.values():
                        if 'subfolders' in folder_data:
                            count += count_folders(folder_data['subfolders'])
                    return count
                
                total_folders = count_folders(folder_structure)
                
                return {
                    'success': True,
                    'outliner': {
                        'folders': folder_structure,
                        'unorganized': unorganized_actors,
                        'stats': {
                            'totalActors': len(all_actors),
                            'organizedActors': organized_count,
                            'unorganizedActors': len(unorganized_actors),
                            'totalFolders': total_folders
                        }
                    }
                }
                
            except Exception as e:
                return {
                    'success': False,
                    'error': str(e)
                }
        
        elif cmd_type == 'viewport.screenshot':
            import os
            import tempfile
            
            # Create temp directory for screenshots
            temp_dir = tempfile.gettempdir()
            timestamp = int(time.time())
            # Use just the base filename - UE will add .png and determine path
            base_filename = f'uemcp_screenshot_{timestamp}'
            
            # Get resolution and screen percentage from params (with defaults for smaller files)
            width = params.get('width', 640)   # Reduced from 1280
            height = params.get('height', 360)  # Reduced from 720
            screen_percentage = params.get('screenPercentage', 50)  # 50% for smaller files
            
            try:
                # Take screenshot using automation library with reduced size
                unreal.AutomationLibrary.take_high_res_screenshot(
                    width, height,    # Configurable resolution (default smaller)
                    base_filename,    # Base filename (no path, no extension)
                    None,            # Camera (None = current view)
                    False,           # Mask enabled
                    False,           # Capture HDR
                    unreal.ComparisonTolerance.LOW  # Use LOW tolerance enum
                )
                
                # Determine expected save path based on platform
                project_path = unreal.SystemLibrary.get_project_directory()
                
                # Detect platform by checking OS module
                import platform as py_platform
                system = py_platform.system()
                
                # UE saves screenshots to Saved/Screenshots/[Platform]Editor/
                if system == 'Darwin':  # macOS
                    expected_path = os.path.join(project_path, 'Saved', 'Screenshots', 'MacEditor', f'{base_filename}.png')
                elif system == 'Windows':
                    expected_path = os.path.join(project_path, 'Saved', 'Screenshots', 'WindowsEditor', f'{base_filename}.png')
                else:
                    expected_path = os.path.join(project_path, 'Saved', 'Screenshots', 'LinuxEditor', f'{base_filename}.png')
                
                # Log the screenshot request
                unreal.log(f"UEMCP: Screenshot requested: {expected_path}")
                unreal.log("UEMCP: Screenshot will be saved asynchronously by Unreal Engine")
                
                # Return immediately - don't block the thread
                # The screenshot will be written asynchronously by UE
                return {
                    'success': True,
                    'filepath': expected_path,
                    'message': f'Screenshot initiated. File will be saved to: {expected_path}'
                }
                    
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        elif cmd_type == 'asset.info':
            asset_path = params.get('assetPath', '')
            
            try:
                # Load the asset
                asset = unreal.EditorAssetLibrary.load_asset(asset_path)
                if not asset:
                    return {'success': False, 'error': f'Could not load asset: {asset_path}'}
                
                info = {
                    'success': True,
                    'assetPath': asset_path,
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
                    if hasattr(asset, 'sockets'):
                        sockets = asset.sockets
                    else:
                        sockets = []
                    
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
                
                return info
                
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        elif cmd_type == 'actor.delete':
            actor_name = params.get('actorName', '')
            validate = params.get('validate', True)  # Default to True for safety
            
            try:
                # Find actor by name
                # Use EditorActorUtilities subsystem instead of deprecated EditorLevelLibrary
                editor_actor_utils = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
                all_actors = editor_actor_utils.get_all_level_actors()
                found = False
                
                for actor in all_actors:
                    if actor.get_actor_label() == actor_name:
                        # Destroy the actor
                        unreal.EditorLevelLibrary.destroy_actor(actor)
                        found = True
                        unreal.log(f"UEMCP: Deleted actor {actor_name}")
                        break
                
                if found:
                    # Validate if requested
                    validation_result = None
                    if validate:
                        import uemcp_validation
                        validation_result = uemcp_validation.validate_actor_deleted(actor_name)
                    
                    response = {
                        'success': True,
                        'message': f'Deleted actor: {actor_name}'
                    }
                    
                    # Add validation info if validation was performed
                    if validation_result:
                        response['validated'] = validation_result.success
                        if validation_result.errors:
                            response['validation_errors'] = validation_result.errors
                        if validation_result.warnings:
                            response['validation_warnings'] = validation_result.warnings
                    
                    return response
                else:
                    return {
                        'success': False,
                        'error': f'Actor not found: {actor_name}'
                    }
                    
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        elif cmd_type == 'actor.modify':
            actor_name = params.get('actorName', '')
            location = params.get('location', None)
            rotation = params.get('rotation', None)
            scale = params.get('scale', None)
            folder = params.get('folder', None)
            mesh = params.get('mesh', None)
            validate = params.get('validate', True)  # Default to True for safety
            
            try:
                # Find actor by name with better error handling
                editor_actor_utils = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
                all_actors = editor_actor_utils.get_all_level_actors()
                found_actor = None
                
                # Filter out None actors and use try-except for safety
                for actor in all_actors:
                    try:
                        if actor and hasattr(actor, 'get_actor_label') and actor.get_actor_label() == actor_name:
                            found_actor = actor
                            break
                    except:
                        # Skip actors that cause errors (e.g., deleted actors)
                        continue
                
                if not found_actor:
                    return {
                        'success': False,
                        'error': f'Actor not found: {actor_name}'
                    }
                
                # Apply modifications
                if location is not None:
                    ue_location = unreal.Vector(
                        float(location[0]), 
                        float(location[1]), 
                        float(location[2])
                    )
                    found_actor.set_actor_location(ue_location, False, False)
                
                if rotation is not None:
                    # Create rotation with explicit property setting to avoid constructor confusion
                    # Rotation array is [Roll, Pitch, Yaw] = [X, Y, Z] as per Unreal Engine standard
                    ue_rotation = unreal.Rotator()
                    ue_rotation.roll = float(rotation[0])   # Roll (X axis rotation)
                    ue_rotation.pitch = float(rotation[1])  # Pitch (Y axis rotation)
                    ue_rotation.yaw = float(rotation[2])    # Yaw (Z axis rotation)
                    
                    found_actor.set_actor_rotation(ue_rotation, False)
                
                if scale is not None:
                    ue_scale = unreal.Vector(
                        float(scale[0]), 
                        float(scale[1]), 
                        float(scale[2])
                    )
                    found_actor.set_actor_scale3d(ue_scale)
                
                if folder is not None:
                    found_actor.set_folder_path(folder)
                
                if mesh is not None:
                    # Change the static mesh for StaticMeshActors
                    mesh_component = found_actor.get_component_by_class(unreal.StaticMeshComponent)
                    if mesh_component:
                        # Debug logging
                        current_mesh = mesh_component.static_mesh
                        print(f"[actor_modify] Changing mesh for {actor_name}")
                        print(f"[actor_modify] Current mesh: {current_mesh.get_path_name() if current_mesh else 'None'}")
                        print(f"[actor_modify] Loading new mesh: {mesh}")
                        
                        # First check if asset exists
                        if not unreal.EditorAssetLibrary.does_asset_exist(mesh):
                            print(f"[actor_modify] Asset does not exist: {mesh}")
                            # Try common subfolder variations
                            mesh_variations = [
                                mesh,
                                mesh.replace('/Meshes/', '/Meshes/Walls/'),
                                mesh.replace('/Meshes/', '/Meshes/Buildings/'),
                                mesh.replace('/Meshes/', '/Meshes/Ground/')
                            ]
                            for variant in mesh_variations:
                                if unreal.EditorAssetLibrary.does_asset_exist(variant):
                                    mesh = variant
                                    print(f"[actor_modify] Found asset at: {mesh}")
                                    break
                        
                        new_mesh = unreal.EditorAssetLibrary.load_asset(mesh)
                        if new_mesh:
                            print(f"[actor_modify] Loaded mesh: {new_mesh.get_path_name()}")
                            mesh_component.set_static_mesh(new_mesh)
                            # Force update
                            found_actor.modify()
                            print(f"[actor_modify] Mesh change applied")
                        else:
                            print(f"[actor_modify] Failed to load mesh: {mesh}")
                            # List similar assets to help debug
                            path_parts = mesh.rsplit('/', 1)
                            if len(path_parts) == 2:
                                folder, asset_name = path_parts
                                similar = unreal.EditorAssetLibrary.list_assets(folder, recursive=False, include_folder=False)
                                print(f"[actor_modify] Similar assets in {folder}: {similar[:5]}")
                            return {
                                'success': False,
                                'error': f'Could not load mesh: {mesh}'
                            }
                    else:
                        return {
                            'success': False,
                            'error': f'Actor {actor_name} does not have a StaticMeshComponent'
                        }
                
                # Get updated transform
                current_location = found_actor.get_actor_location()
                current_rotation = found_actor.get_actor_rotation()
                current_scale = found_actor.get_actor_scale3d()
                
                # Validate if requested
                validation_result = None
                if validate:
                    import uemcp_validation
                    modifications = {}
                    if location is not None:
                        modifications['location'] = location
                    if rotation is not None:
                        modifications['rotation'] = rotation
                    if scale is not None:
                        modifications['scale'] = scale
                    if folder is not None:
                        modifications['folder'] = folder
                    if mesh is not None:
                        modifications['mesh'] = mesh
                    
                    validation_result = uemcp_validation.validate_actor_modifications(found_actor, modifications)
                
                response = {
                    'success': True,
                    'actorName': actor_name,
                    'location': [current_location.x, current_location.y, current_location.z],
                    'rotation': [current_rotation.roll, current_rotation.pitch, current_rotation.yaw],
                    'scale': [current_scale.x, current_scale.y, current_scale.z],
                    'message': f'Modified actor: {actor_name}'
                }
                
                # Add validation info if validation was performed
                if validation_result:
                    response['validated'] = validation_result.success
                    if validation_result.errors:
                        response['validation_errors'] = validation_result.errors
                    if validation_result.warnings:
                        response['validation_warnings'] = validation_result.warnings
                
                return response
                
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        elif cmd_type == 'viewport.camera':
            location = params.get('location', None)
            rotation = params.get('rotation', None)
            focus_actor = params.get('focusActor', None)
            distance = params.get('distance', 500)
            
            try:
                # Get viewport control
                
                # Initialize viewport location and rotation
                current_loc = None
                current_rot = None
                
                if focus_actor:
                    # Find and focus on specific actor
                    # Use EditorActorUtilities subsystem instead of deprecated EditorLevelLibrary
                    editor_actor_utils = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
                    all_actors = editor_actor_utils.get_all_level_actors()
                    target_actor = None
                    
                    for actor in all_actors:
                        if actor.get_actor_label() == focus_actor:
                            target_actor = actor
                            break
                    
                    if target_actor:
                        # Get actor location and bounds
                        actor_location = target_actor.get_actor_location()
                        actor_bounds = target_actor.get_actor_bounds(False)
                        bounds_extent = actor_bounds[1]  # Box extent
                        
                        # Calculate camera position
                        # Position camera at 45 degree angle looking down at actor
                        camera_offset = unreal.Vector(
                            -distance * 0.7,  # Back
                            0,                # Side
                            distance * 0.7    # Up
                        )
                        camera_location = actor_location + camera_offset
                        
                        # Calculate rotation to look at actor
                        direction = actor_location - camera_location
                        camera_rotation = direction.rotation()
                        
                        # Set viewport camera using UnrealEditorSubsystem
                        editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
                        editor_subsystem.set_level_viewport_camera_info(
                            camera_location,
                            camera_rotation
                        )
                        
                        # Also pilot the actor for better framing
                        unreal.EditorLevelLibrary.pilot_level_actor(target_actor)
                        unreal.EditorLevelLibrary.eject_pilot_level_actor()
                        
                        current_loc = camera_location
                        current_rot = camera_rotation
                    else:
                        return {'success': False, 'error': f'Actor not found: {focus_actor}'}
                
                else:
                    # Manual camera positioning
                    if location is not None:
                        current_loc = unreal.Vector(
                            float(location[0]),
                            float(location[1]),
                            float(location[2])
                        )
                    else:
                        # If no location provided, return error
                        return {'success': False, 'error': 'Location required when not focusing on an actor'}
                    
                    if rotation is not None:
                        # IMPORTANT: Create Rotator by setting properties explicitly
                        # Rotation array is [Roll, Pitch, Yaw] = [X, Y, Z] as per Unreal Engine standard
                        current_rot = unreal.Rotator()
                        current_rot.roll = float(rotation[0])   # Roll (X axis rotation)
                        current_rot.pitch = float(rotation[1])  # Pitch (Y axis rotation)
                        current_rot.yaw = float(rotation[2])    # Yaw (Z axis rotation)
                    else:
                        # Default rotation looking forward and slightly down
                        current_rot = unreal.Rotator()
                        current_rot.pitch = -30.0  # Look slightly down
                        current_rot.yaw = 0.0      # Face north
                        current_rot.roll = 0.0     # No tilt
                    
                    # Set the viewport camera using UnrealEditorSubsystem
                    editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
                    editor_subsystem.set_level_viewport_camera_info(
                        current_loc,
                        current_rot
                    )
                
                return {
                    'success': True,
                    'location': {
                        'x': float(current_loc.x),
                        'y': float(current_loc.y),
                        'z': float(current_loc.z)
                    },
                    'rotation': {
                        'pitch': float(current_rot.pitch),
                        'yaw': float(current_rot.yaw),
                        'roll': float(current_rot.roll)
                    },
                    'message': 'Viewport camera updated'
                }
                
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        elif cmd_type == 'viewport.focus':
            actor_name = params.get('actorName', '')
            preserve_rotation = params.get('preserveRotation', False)
            
            try:
                # Find the actor by name
                # Use EditorActorUtilities subsystem instead of deprecated EditorLevelLibrary
                editor_actor_utils = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
                all_actors = editor_actor_utils.get_all_level_actors()
                found_actor = None
                
                for actor in all_actors:
                    if actor.get_actor_label() == actor_name:
                        found_actor = actor
                        break
                
                if not found_actor:
                    return {
                        'success': False,
                        'error': f'Actor not found: {actor_name}'
                    }
                
                # Select the actor using EditorActorSubsystem
                editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
                editor_actor_subsystem.set_selected_level_actors([found_actor])
                
                # Get the editor subsystem
                editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
                
                # Get actor's location and bounds
                actor_location = found_actor.get_actor_location()
                actor_bounds = found_actor.get_actor_bounds(only_colliding_components=False)
                bounds_extent = actor_bounds[1]  # Box extent
                
                # Calculate a good camera distance based on bounds
                max_extent = max(bounds_extent.x, bounds_extent.y, bounds_extent.z)
                camera_distance = max_extent * 3  # View from 3x the largest dimension
                
                if preserve_rotation:
                    # Get current camera rotation
                    current_location, current_rotation = editor_subsystem.get_level_viewport_camera_info()
                    
                    # Check if we're in a top-down view (pitch close to -90)
                    if abs(current_rotation.pitch + 90) < 5:  # Within 5 degrees of straight down
                        # Keep top-down view, just move camera above actor
                        camera_location = unreal.Vector(
                            actor_location.x,
                            actor_location.y,
                            actor_location.z + camera_distance
                        )
                        camera_rotation = current_rotation  # Keep current rotation
                    else:
                        # For other views, calculate offset based on current rotation direction
                        forward_vector = current_rotation.get_forward_vector()
                        camera_location = actor_location - (forward_vector * camera_distance)
                        camera_rotation = current_rotation  # Keep current rotation
                else:
                    # Original behavior - set camera to look at the actor from a nice angle
                    camera_offset = unreal.Vector(-camera_distance, -camera_distance * 0.5, camera_distance * 0.5)
                    camera_location = actor_location + camera_offset
                    
                    # Calculate rotation to look at actor
                    camera_rotation = unreal.MathLibrary.find_look_at_rotation(camera_location, actor_location)
                
                # Set the viewport camera
                editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)
                
                return {
                    'success': True,
                    'message': f'Focused viewport on: {actor_name}',
                    'location': {
                        'x': float(found_actor.get_actor_location().x),
                        'y': float(found_actor.get_actor_location().y),
                        'z': float(found_actor.get_actor_location().z)
                    }
                }
                
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        elif cmd_type == 'viewport.mode':
            mode = params.get('mode', 'perspective').lower()
            
            try:
                # NOTE: The Unreal Engine Python API doesn't expose direct viewport projection type switching
                # (perspective vs orthographic). This tool positions the camera for standard views but
                # maintains the current projection type. For true orthographic projection, users need to
                # use the viewport controls in the Unreal Editor UI (Alt+G or viewport options menu).
                
                # Get viewport control
                editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
                viewport_client = editor_subsystem.get_level_viewport_camera_info()
                
                # Create proper rotations by setting properties explicitly
                # IMPORTANT: Using Rotator(a,b,c) constructor causes Roll issues!
                # Must set roll, pitch, yaw properties directly
                
                # Top view rotation
                top_rotation = unreal.Rotator()
                top_rotation.pitch = -90.0  # Look straight down
                top_rotation.yaw = 0.0      # Face north
                top_rotation.roll = 0.0     # NO TILT!
                
                # Bottom view rotation
                bottom_rotation = unreal.Rotator()
                bottom_rotation.pitch = 90.0   # Look straight up
                bottom_rotation.yaw = 0.0      # Face north  
                bottom_rotation.roll = 0.0     # NO TILT!
                
                # Left view rotation
                left_rotation = unreal.Rotator()
                left_rotation.pitch = 0.0      # Look horizontal
                left_rotation.yaw = 90.0       # Face west
                left_rotation.roll = 0.0       # NO TILT!
                
                # Right view rotation
                right_rotation = unreal.Rotator()
                right_rotation.pitch = 0.0     # Look horizontal
                right_rotation.yaw = -90.0     # Face east
                right_rotation.roll = 0.0      # NO TILT!
                
                # Front view rotation  
                front_rotation = unreal.Rotator()
                front_rotation.pitch = 0.0     # Look horizontal
                front_rotation.yaw = 0.0       # Face north
                front_rotation.roll = 0.0      # NO TILT!
                
                # Back view rotation
                back_rotation = unreal.Rotator()
                back_rotation.pitch = 0.0      # Look horizontal
                back_rotation.yaw = 180.0      # Face south
                back_rotation.roll = 0.0       # NO TILT!
                
                # Map mode names to viewport types and orientations
                mode_map = {
                    'perspective': None,  # Default perspective mode
                    'top': {'type': 'ORTHO_TOP_DOWN', 'rotation': top_rotation},
                    'bottom': {'type': 'ORTHO_BOTTOM_UP', 'rotation': bottom_rotation},
                    'left': {'type': 'ORTHO_YZ', 'rotation': left_rotation},
                    'right': {'type': 'ORTHO_NEGATIVE_YZ', 'rotation': right_rotation},
                    'front': {'type': 'ORTHO_XZ', 'rotation': front_rotation},
                    'back': {'type': 'ORTHO_NEGATIVE_XZ', 'rotation': back_rotation}
                }
                
                if mode not in mode_map:
                    return {
                        'success': False,
                        'error': f'Invalid mode: {mode}. Valid modes: {", ".join(mode_map.keys())}'
                    }
                
                # For orthographic modes, set specific rotation and position
                if mode != 'perspective' and mode_map[mode]:
                    rotation = mode_map[mode]['rotation']
                    
                    # Check if any actors are selected
                    selected_actors = unreal.EditorLevelLibrary.get_selected_level_actors()
                    
                    if selected_actors:
                        # Calculate bounding box for all selected actors
                        min_bounds = unreal.Vector(float('inf'), float('inf'), float('inf'))
                        max_bounds = unreal.Vector(float('-inf'), float('-inf'), float('-inf'))
                        
                        for actor in selected_actors:
                            actor_location = actor.get_actor_location()
                            actor_bounds = actor.get_actor_bounds(only_colliding_components=False)
                            bounds_extent = actor_bounds[1]
                            
                            # Update min/max bounds
                            min_bounds.x = min(min_bounds.x, actor_location.x - bounds_extent.x)
                            min_bounds.y = min(min_bounds.y, actor_location.y - bounds_extent.y)
                            min_bounds.z = min(min_bounds.z, actor_location.z - bounds_extent.z)
                            max_bounds.x = max(max_bounds.x, actor_location.x + bounds_extent.x)
                            max_bounds.y = max(max_bounds.y, actor_location.y + bounds_extent.y)
                            max_bounds.z = max(max_bounds.z, actor_location.z + bounds_extent.z)
                        
                        # Calculate center of all selected actors
                        center = unreal.Vector(
                            (min_bounds.x + max_bounds.x) / 2,
                            (min_bounds.y + max_bounds.y) / 2,
                            (min_bounds.z + max_bounds.z) / 2
                        )
                        
                        # Calculate view distance based on bounds
                        bounds_size = unreal.Vector(
                            max_bounds.x - min_bounds.x,
                            max_bounds.y - min_bounds.y,
                            max_bounds.z - min_bounds.z
                        )
                        max_extent = max(bounds_size.x, bounds_size.y, bounds_size.z)
                        view_distance = max_extent * 1.5  # Give some padding
                        
                        # Position camera based on view mode
                        if mode == 'top':
                            camera_location = unreal.Vector(center.x, center.y, center.z + view_distance)
                        elif mode == 'bottom':
                            camera_location = unreal.Vector(center.x, center.y, center.z - view_distance)
                        elif mode == 'left':
                            camera_location = unreal.Vector(center.x - view_distance, center.y, center.z)
                        elif mode == 'right':
                            camera_location = unreal.Vector(center.x + view_distance, center.y, center.z)
                        elif mode == 'front':
                            camera_location = unreal.Vector(center.x, center.y - view_distance, center.z)
                        elif mode == 'back':
                            camera_location = unreal.Vector(center.x, center.y + view_distance, center.z)
                        else:
                            camera_location = viewport_client[0]  # Keep current location
                    else:
                        # No actors selected, keep current location
                        camera_location = viewport_client[0]
                    
                    # Set camera with proper orientation
                    editor_subsystem.set_level_viewport_camera_info(
                        camera_location,
                        rotation
                    )
                    
                    # Log the actual rotation values for debugging
                    unreal.log(f"UEMCP: Set viewport {mode} view - Pitch={rotation.pitch:.1f}°, Yaw={rotation.yaw:.1f}°, Roll={rotation.roll:.1f}°")
                
                return {
                    'success': True,
                    'mode': mode,
                    'message': f'Viewport mode set to {mode}'
                }
                
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        elif cmd_type == 'viewport.render_mode':
            render_mode = params.get('mode', 'lit').lower()
            
            try:
                # Map mode names to viewport show flags
                mode_map = {
                    'lit': 'LIT',
                    'unlit': 'UNLIT', 
                    'wireframe': 'WIREFRAME',
                    'detail_lighting': 'DETAILLIGHTING',
                    'lighting_only': 'LIGHTINGONLY',
                    'light_complexity': 'LIGHTCOMPLEXITY',
                    'shader_complexity': 'SHADERCOMPLEXITY'
                }
                
                if render_mode not in mode_map:
                    return {
                        'success': False,
                        'error': f'Invalid render mode: {render_mode}. Valid modes: {", ".join(mode_map.keys())}'
                    }
                
                # Note: There's no direct Python API for viewport show flags
                # We'll use console commands as a workaround
                
                # Get editor world for console commands
                editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
                world = editor_subsystem.get_editor_world()
                
                # Apply the render mode using console commands with world context
                if render_mode == 'wireframe':
                    # Use ShowFlag for wireframe as viewmode command doesn't always work
                    unreal.SystemLibrary.execute_console_command(world, "ShowFlag.Wireframe 1")
                    unreal.SystemLibrary.execute_console_command(world, "ShowFlag.Materials 0")
                    unreal.SystemLibrary.execute_console_command(world, "ShowFlag.Lighting 0")
                elif render_mode == 'unlit':
                    unreal.SystemLibrary.execute_console_command(world, "viewmode unlit")
                elif render_mode == 'lit':
                    # Reset all show flags when going back to lit mode
                    unreal.SystemLibrary.execute_console_command(world, "ShowFlag.Wireframe 0")
                    unreal.SystemLibrary.execute_console_command(world, "ShowFlag.Materials 1")
                    unreal.SystemLibrary.execute_console_command(world, "ShowFlag.Lighting 1")
                    unreal.SystemLibrary.execute_console_command(world, "viewmode lit")
                elif render_mode == 'detail_lighting':
                    unreal.SystemLibrary.execute_console_command(world, "viewmode lit_detaillighting")
                elif render_mode == 'lighting_only':
                    unreal.SystemLibrary.execute_console_command(world, "viewmode lightingonly")
                elif render_mode == 'light_complexity':
                    unreal.SystemLibrary.execute_console_command(world, "viewmode lightcomplexity")
                elif render_mode == 'shader_complexity':
                    unreal.SystemLibrary.execute_console_command(world, "viewmode shadercomplexity")
                
                unreal.log(f"UEMCP: Set viewport render mode to {render_mode}")
                
                return {
                    'success': True,
                    'mode': render_mode,
                    'message': f'Viewport render mode set to {render_mode}'
                }
                
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        elif cmd_type == 'viewport.bounds':
            try:
                # Get viewport control
                editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
                camera_location, camera_rotation = editor_subsystem.get_level_viewport_camera_info()
                
                # Get viewport client to calculate frustum
                # Note: Direct frustum calculation is not exposed in Python API
                # We'll estimate bounds based on camera position and typical FOV
                
                # Get FOV (default to 90 if not available)
                fov = 90.0  # Default FOV
                
                # Calculate view distance based on camera height for top-down views
                view_distance = 2000.0  # Default view distance
                
                # For top-down view (pitch near -90), calculate bounds differently
                is_top_down = abs(camera_rotation.pitch + 90) < 5
                
                if is_top_down:
                    # Top-down view - calculate bounds as a square around camera position
                    # Estimate based on typical viewport size and camera height
                    half_size = camera_location.z * 0.8  # Rough estimate
                    
                    bounds_min = unreal.Vector(
                        camera_location.x - half_size,
                        camera_location.y - half_size,
                        0  # Ground level
                    )
                    bounds_max = unreal.Vector(
                        camera_location.x + half_size,
                        camera_location.y + half_size,
                        camera_location.z  # Camera height
                    )
                else:
                    # Perspective view - calculate based on FOV and view distance
                    # This is a rough approximation
                    forward = camera_rotation.get_forward_vector()
                    right = camera_rotation.get_right_vector()
                    up = camera_rotation.get_up_vector()
                    
                    # Calculate view cone at a distance
                    fov_rad = math.radians(fov)
                    half_width = view_distance * math.tan(fov_rad / 2)
                    
                    # Create bounds around view center
                    view_center = camera_location + forward * view_distance
                    
                    bounds_min = unreal.Vector(
                        view_center.x - half_width,
                        view_center.y - half_width,
                        view_center.z - half_width
                    )
                    bounds_max = unreal.Vector(
                        view_center.x + half_width,
                        view_center.y + half_width,
                        view_center.z + half_width
                    )
                
                # Calculate center and size
                bounds_center = unreal.Vector(
                    (bounds_min.x + bounds_max.x) / 2,
                    (bounds_min.y + bounds_max.y) / 2,
                    (bounds_min.z + bounds_max.z) / 2
                )
                bounds_size = unreal.Vector(
                    bounds_max.x - bounds_min.x,
                    bounds_max.y - bounds_min.y,
                    bounds_max.z - bounds_min.z
                )
                
                return {
                    'success': True,
                    'bounds': {
                        'min': {'x': bounds_min.x, 'y': bounds_min.y, 'z': bounds_min.z},
                        'max': {'x': bounds_max.x, 'y': bounds_max.y, 'z': bounds_max.z},
                        'center': {'x': bounds_center.x, 'y': bounds_center.y, 'z': bounds_center.z},
                        'size': {'x': bounds_size.x, 'y': bounds_size.y, 'z': bounds_size.z}
                    },
                    'camera': {
                        'location': {'x': camera_location.x, 'y': camera_location.y, 'z': camera_location.z},
                        'rotation': {
                            'pitch': camera_rotation.pitch,
                            'yaw': camera_rotation.yaw,
                            'roll': camera_rotation.roll
                        },
                        'fov': fov
                    },
                    'isTopDown': is_top_down
                }
                
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        elif cmd_type == 'viewport.fit':
            actors = params.get('actors', [])
            filter_pattern = params.get('filter', '')
            padding = params.get('padding', 20) / 100.0  # Convert percentage to factor
            
            try:
                # Get all actors to check
                editor_actor_utils = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
                all_actors = editor_actor_utils.get_all_level_actors()
                
                # Filter actors based on provided criteria
                target_actors = []
                
                if actors:
                    # Find specific actors by name
                    for actor in all_actors:
                        if actor.get_actor_label() in actors:
                            target_actors.append(actor)
                elif filter_pattern:
                    # Filter by pattern
                    for actor in all_actors:
                        if filter_pattern.lower() in actor.get_actor_label().lower():
                            target_actors.append(actor)
                
                if not target_actors:
                    return {
                        'success': False,
                        'error': 'No actors found matching criteria'
                    }
                
                # Calculate bounding box for all target actors
                min_bounds = unreal.Vector(float('inf'), float('inf'), float('inf'))
                max_bounds = unreal.Vector(float('-inf'), float('-inf'), float('-inf'))
                
                for actor in target_actors:
                    actor_location = actor.get_actor_location()
                    actor_bounds = actor.get_actor_bounds(only_colliding_components=False)
                    bounds_extent = actor_bounds[1]
                    
                    # Update min/max bounds
                    min_bounds.x = min(min_bounds.x, actor_location.x - bounds_extent.x)
                    min_bounds.y = min(min_bounds.y, actor_location.y - bounds_extent.y)
                    min_bounds.z = min(min_bounds.z, actor_location.z - bounds_extent.z)
                    max_bounds.x = max(max_bounds.x, actor_location.x + bounds_extent.x)
                    max_bounds.y = max(max_bounds.y, actor_location.y + bounds_extent.y)
                    max_bounds.z = max(max_bounds.z, actor_location.z + bounds_extent.z)
                
                # Calculate center and size
                bounds_center = unreal.Vector(
                    (min_bounds.x + max_bounds.x) / 2,
                    (min_bounds.y + max_bounds.y) / 2,
                    (min_bounds.z + max_bounds.z) / 2
                )
                bounds_size = unreal.Vector(
                    max_bounds.x - min_bounds.x,
                    max_bounds.y - min_bounds.y,
                    max_bounds.z - min_bounds.z
                )
                
                # Get current camera info to preserve rotation if in special view
                editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
                current_location, current_rotation = editor_subsystem.get_level_viewport_camera_info()
                
                # Check if we're in a standard view (top, front, etc)
                is_top_down = abs(current_rotation.pitch + 90) < 5
                is_front_view = abs(current_rotation.pitch) < 5 and abs(current_rotation.yaw) < 5
                is_side_view = abs(current_rotation.pitch) < 5 and (abs(abs(current_rotation.yaw) - 90) < 5)
                
                # Calculate camera distance based on bounds and FOV
                max_extent = max(bounds_size.x, bounds_size.y, bounds_size.z)
                base_distance = max_extent * (1.0 + padding)
                
                if is_top_down:
                    # For top-down view, position camera above center
                    camera_distance = max(bounds_size.x, bounds_size.y) * (1.0 + padding)
                    camera_location = unreal.Vector(
                        bounds_center.x,
                        bounds_center.y,
                        bounds_center.z + camera_distance
                    )
                    camera_rotation = current_rotation  # Keep top-down rotation
                elif is_front_view:
                    # Front view - position south of center
                    camera_distance = max(bounds_size.x, bounds_size.z) * (1.5 + padding)
                    camera_location = unreal.Vector(
                        bounds_center.x,
                        bounds_center.y - camera_distance,
                        bounds_center.z
                    )
                    camera_rotation = current_rotation  # Keep front rotation
                elif is_side_view:
                    # Side view - position east or west
                    camera_distance = max(bounds_size.y, bounds_size.z) * (1.5 + padding)
                    if current_rotation.yaw > 0:  # Looking west
                        camera_location = unreal.Vector(
                            bounds_center.x - camera_distance,
                            bounds_center.y,
                            bounds_center.z
                        )
                    else:  # Looking east
                        camera_location = unreal.Vector(
                            bounds_center.x + camera_distance,
                            bounds_center.y,
                            bounds_center.z
                        )
                    camera_rotation = current_rotation  # Keep side rotation
                else:
                    # Default perspective view - position at nice angle
                    camera_offset = unreal.Vector(
                        -base_distance * 0.7,
                        -base_distance * 0.7,
                        base_distance * 0.5
                    )
                    camera_location = bounds_center + camera_offset
                    
                    # Calculate rotation to look at center
                    camera_rotation = unreal.MathLibrary.find_look_at_rotation(camera_location, bounds_center)
                
                # Set the viewport camera
                editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)
                
                # Also select the actors
                editor_actor_subsystem.set_selected_level_actors(target_actors)
                
                return {
                    'success': True,
                    'actorCount': len(target_actors),
                    'bounds': {
                        'min': {'x': min_bounds.x, 'y': min_bounds.y, 'z': min_bounds.z},
                        'max': {'x': max_bounds.x, 'y': max_bounds.y, 'z': max_bounds.z},
                        'center': {'x': bounds_center.x, 'y': bounds_center.y, 'z': bounds_center.z},
                        'size': {'x': bounds_size.x, 'y': bounds_size.y, 'z': bounds_size.z}
                    },
                    'camera': {
                        'location': {'x': camera_location.x, 'y': camera_location.y, 'z': camera_location.z},
                        'rotation': {
                            'pitch': camera_rotation.pitch,
                            'yaw': camera_rotation.yaw,
                            'roll': camera_rotation.roll
                        }
                    },
                    'message': f'Fitted {len(target_actors)} actors in viewport'
                }
                
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        elif cmd_type == 'viewport.look_at':
            target = params.get('target', None)
            actor_name = params.get('actorName', None)
            distance = params.get('distance', 1000)
            pitch = params.get('pitch', -30)
            height = params.get('height', 500)
            
            try:
                import math
                
                # Get target location
                if actor_name:
                    # Find actor by name
                    all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
                    found_actor = None
                    for actor in all_actors:
                        if actor and actor.get_actor_label() == actor_name:
                            found_actor = actor
                            break
                    
                    if not found_actor:
                        return {'success': False, 'error': f'Actor not found: {actor_name}'}
                    
                    target_location = found_actor.get_actor_location()
                elif target:
                    target_location = unreal.Vector(target[0], target[1], target[2])
                else:
                    return {'success': False, 'error': 'Must provide either target coordinates or actorName'}
                
                # Calculate camera position
                # We'll position the camera at a 45-degree angle by default
                angle = -45 * math.pi / 180  # -45 degrees in radians
                
                camera_x = target_location.x + distance * math.cos(angle)
                camera_y = target_location.y + distance * math.sin(angle)
                camera_z = target_location.z + height
                
                camera_location = unreal.Vector(camera_x, camera_y, camera_z)
                
                # Calculate yaw to look at target
                dx = target_location.x - camera_x
                dy = target_location.y - camera_y
                
                # Calculate angle and convert to Unreal's coordinate system
                angle_rad = math.atan2(dy, dx)
                yaw = -(angle_rad * 180 / math.pi)
                
                # Set camera rotation
                camera_rotation = unreal.Rotator(0, pitch, yaw)
                
                # Apply to viewport
                editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
                editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)
                
                return {
                    'success': True,
                    'location': [camera_location.x, camera_location.y, camera_location.z],
                    'rotation': [camera_rotation.roll, camera_rotation.pitch, camera_rotation.yaw],
                    'targetLocation': [target_location.x, target_location.y, target_location.z],
                    'message': f'Camera positioned to look at target'
                }
                
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        elif cmd_type == 'python.execute':
            code = params.get('code', '')
            context = params.get('context', {})
            
            try:
                # Create a safe execution environment with Unreal modules
                exec_globals = {
                    'unreal': unreal,
                    '__builtins__': __builtins__,
                }
                
                # Add any context variables
                exec_globals.update(context)
                
                # Create locals dict to capture results
                exec_locals = {}
                
                # Execute the code
                exec(code, exec_globals, exec_locals)
                
                # Try to get a return value
                # If the code assigned to 'result', use that
                # Otherwise try to eval the last line as an expression
                if 'result' in exec_locals:
                    result_value = exec_locals['result']
                else:
                    # Try to evaluate the last line as an expression
                    lines = [line.strip() for line in code.strip().split('\n') if line.strip()]
                    if lines:
                        try:
                            result_value = eval(lines[-1], exec_globals, exec_locals)
                        except:
                            # Last line wasn't an expression
                            result_value = None
                    else:
                        result_value = None
                
                # Convert result to JSON-serializable format
                def make_serializable(obj):
                    """Convert UE objects and other non-serializable types to dicts"""
                    if obj is None:
                        return None
                    elif isinstance(obj, (str, int, float, bool)):
                        return obj
                    elif isinstance(obj, (list, tuple)):
                        return [make_serializable(item) for item in obj]
                    elif isinstance(obj, dict):
                        return {str(k): make_serializable(v) for k, v in obj.items()}
                    elif hasattr(obj, '__dict__'):
                        # Try to get object properties
                        result = {'__type__': type(obj).__name__}
                        # Get common UE properties
                        if hasattr(obj, 'get_name'):
                            result['name'] = obj.get_name()
                        if hasattr(obj, 'get_actor_label'):
                            result['label'] = obj.get_actor_label()
                        if hasattr(obj, 'get_actor_location'):
                            loc = obj.get_actor_location()
                            result['location'] = {'x': loc.x, 'y': loc.y, 'z': loc.z}
                        if hasattr(obj, 'get_class'):
                            result['class'] = obj.get_class().get_name()
                        # Add string representation as fallback
                        result['__str__'] = str(obj)
                        return result
                    else:
                        # Fallback to string representation
                        return str(obj)
                
                return {
                    'success': True,
                    'result': make_serializable(result_value),
                    'locals': {k: make_serializable(v) for k, v in exec_locals.items() if not k.startswith('_')}
                }
                
            except Exception as e:
                import traceback
                return {
                    'success': False,
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'traceback': traceback.format_exc()
                }
        
        elif cmd_type == 'system.restart':
            # Schedule restart to happen on main thread via tick handler
            try:
                global restart_scheduled, restart_countdown
                restart_scheduled = True
                restart_countdown = 0
                unreal.log("UEMCP: Restart scheduled")
                
                return {
                    'success': True,
                    'message': 'Listener will restart automatically in a few seconds'
                }
                
            except Exception as e:
                return {'success': False, 'error': f'Failed to schedule restart: {str(e)}'}
        
        else:
            return {
                'success': False,
                'error': f'Unknown command: {cmd_type}'
            }
            
    except Exception as e:
        unreal.log_error(f"UEMCP: Command execution error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'command': cmd_type
        }

def process_commands(delta_time):
    """Process queued commands on the main thread"""
    global restart_scheduled, restart_countdown
    
    # Handle scheduled restart on main thread
    if restart_scheduled:
        restart_countdown += delta_time
        # Wait 2 seconds to ensure HTTP response is sent
        if restart_countdown > 2.0:
            restart_scheduled = False
            restart_countdown = 0
            unreal.log("UEMCP: Executing restart on main thread...")
            # Use the working restart function
            import uemcp_helpers
            uemcp_helpers.restart_listener()
            return  # Exit early since we're restarting
    
    processed = 0
    max_per_tick = 3  # Reduced from 10 to prevent audio buffer underrun
    
    while not command_queue.empty() and processed < max_per_tick:
        try:
            request_id, command = command_queue.get_nowait()
            cmd_type = command.get('type', 'unknown')
            # Only log in debug mode
            if os.environ.get('UEMCP_DEBUG'):
                unreal.log(f"UEMCP: Processing command: {cmd_type} (ID: {request_id})")
            
            result = execute_on_main_thread(command)
            response_queue[request_id] = result
            
            # Only log in debug mode
            if os.environ.get('UEMCP_DEBUG'):
                unreal.log(f"UEMCP: Command completed: {cmd_type} - Success: {result.get('success', False)}")
            processed += 1
        except queue.Empty:
            break
        except Exception as e:
            unreal.log_error(f"UEMCP: Error processing command: {e}")
            import traceback
            unreal.log_error(f"UEMCP: Traceback: {traceback.format_exc()}")
    
    # Removed old restart scheduled code - now handled in system.restart command

def cleanup_all_threads():
    """Clean up all server threads before starting fresh"""
    global server_running
    
    # Signal all threads to stop
    server_running = False
    
    # Use external tracker if available
    try:
        import uemcp_thread_tracker
        uemcp_thread_tracker.cleanup_all()
    except:
        pass

def start_listener(port=8765):
    """Start the HTTP listener with main thread processing"""
    global server_running, server_thread, tick_handle
    
    # Always clean up any existing threads first
    cleanup_all_threads()
    
    # Wait a bit for cleanup
    time.sleep(1.0)
    
    # More aggressive cleanup - force kill Python's own process on the port
    try:
        if sys.platform == "darwin":
            # Get the PID using the port
            result = subprocess.run(['lsof', '-ti:8765'], capture_output=True, text=True)
            if result.stdout.strip():
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    try:
                        # Don't kill our own process
                        if int(pid) != os.getpid():
                            os.kill(int(pid), 9)
                            unreal.log(f"UEMCP: Killed process {pid} on port 8765")
                    except:
                        pass
                time.sleep(1.0)
    except Exception as e:
        unreal.log_warning(f"UEMCP: Error during port cleanup: {e}")
    
    if server_running:
        unreal.log_warning("UEMCP Listener is already running!")
        return False
    
    # Check if port is already in use
    test_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    test_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    if hasattr(socket, 'SO_REUSEPORT'):
        test_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
    
    try:
        test_sock.bind(('', port))
        test_sock.close()  # Success - close test socket
    except OSError:
        # Port is in use, try to clean it up automatically
        test_sock.close()  # Close our test socket first
        try:
            import uemcp_port_utils
            pid, process_name = uemcp_port_utils.find_process_using_port(port)
            if pid:
                unreal.log_warning(f"UEMCP: Port {port} is used by {process_name} (PID: {pid})")
                unreal.log("UEMCP: Attempting automatic cleanup...")
                if uemcp_port_utils.force_free_port_silent(port):
                    unreal.log("UEMCP: Port freed successfully!")
                    time.sleep(1)  # Give OS time to release the port
                    # Try to bind again
                    test_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    try:
                        test_sock.bind(('', port))
                        test_sock.close()
                        # Port is now free, continue with startup
                    except OSError:
                        unreal.log_error("UEMCP: Failed to free port automatically")
                        return False
                else:
                    unreal.log_error("UEMCP: Could not free port automatically")
                    return False
            else:
                unreal.log_warning(f"UEMCP: Port {port} is already in use by unknown process")
                return False
        except Exception as e:
            unreal.log_warning(f"UEMCP: Port {port} is already in use: {e}")
            return False
    finally:
        # Always close the socket to prevent resource warnings
        test_sock.close()
    
    # Start HTTP server
    def run_server():
        global httpd
        try:
            # Create custom server class with SO_REUSEADDR
            class ReuseAddrHTTPServer(HTTPServer):
                allow_reuse_address = True
                
                def server_bind(self):
                    # Set socket options for better reuse
                    self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                    # Also set SO_REUSEPORT if available (macOS/Linux)
                    if hasattr(socket, 'SO_REUSEPORT'):
                        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEPORT, 1)
                    super().server_bind()
                
                def serve_forever(self, poll_interval=0.5):
                    """Handle requests until shutdown, checking server_running flag"""
                    while server_running:
                        self.handle_request()
                    # Just close the socket when done - don't call shutdown()
                    try:
                        self.server_close()
                    except:
                        pass
            
            # Create server with reuse enabled - bind to all interfaces
            httpd = ReuseAddrHTTPServer(('', port), UEMCPHandler)
            httpd.timeout = 0.5  # Set timeout so handle_request doesn't block forever
            
            # Track the httpd server externally
            try:
                import uemcp_thread_tracker
                uemcp_thread_tracker.add_httpd_server(httpd)
            except:
                pass
            
            # Server thread will log when ready
            httpd.serve_forever()
        except Exception as e:
            if server_running:  # Only log error if we weren't trying to stop
                unreal.log_error(f"UEMCP: Failed to start listener: {e}")
        finally:
            # Ensure socket is closed
            if httpd:
                try:
                    httpd.server_close()
                except:
                    pass
    
    server_running = True
    server_thread = threading.Thread(target=run_server)
    server_thread.daemon = True
    server_thread.start()
    
    # Track this thread externally
    try:
        import uemcp_thread_tracker
        uemcp_thread_tracker.add_server_thread(server_thread)
    except:
        pass
    
    # Register tick callback for main thread processing
    tick_handle = unreal.register_slate_pre_tick_callback(process_commands)
    
    # Wait a moment
    time.sleep(0.5)
    
    # Startup message handled by init script
    return True

def stop_listener():
    """Stop the listener and cleanup"""
    global server_running, httpd, tick_handle, server_thread
    
    if not server_running:
        unreal.log("UEMCP: Listener is not running")
        # Even if not running, try to free the port in case it's stuck
        try:
            import uemcp_port_utils
            if uemcp_port_utils.is_port_in_use(8765):
                unreal.log("UEMCP: Port 8765 still in use, forcing cleanup...")
                uemcp_port_utils.force_free_port_silent(8765)
                time.sleep(0.5)
        except:
            pass
        return True
    
    unreal.log("UEMCP: Stopping listener...")
    server_running = False
    
    # Close the server socket without calling shutdown() to avoid blocking
    if httpd:
        try:
            # Just close the socket - don't call shutdown() which blocks
            httpd.server_close()
            # Set to None to ensure it's garbage collected
            httpd = None
        except Exception as e:
            unreal.log_warning(f"UEMCP: Error closing server: {e}")
    
    # Don't wait for thread - just let it die naturally
    if server_thread and server_thread.is_alive():
        unreal.log("UEMCP: Server thread will stop shortly")
    
    # Unregister tick callback
    if tick_handle:
        unreal.unregister_slate_pre_tick_callback(tick_handle)
        tick_handle = None
    
    httpd = None
    server_thread = None
    
    # Give the thread more time to stop
    time.sleep(0.5)
    
    # Force kill any process on port 8765
    try:
        if sys.platform == "darwin":  # macOS
            # Find and kill any process using port 8765
            result = os.system("lsof -ti:8765 | xargs kill -9 2>/dev/null")
            if result == 0:
                unreal.log("UEMCP: Killed process on port 8765")
            time.sleep(0.5)  # Wait for OS to release port
            
            # Double-check and try again if needed
            check_result = os.system("lsof -ti:8765 2>/dev/null")
            if check_result == 0:
                # Port still in use, try harder
                os.system("lsof -ti:8765 | xargs kill -9 2>/dev/null")
                time.sleep(0.5)
                
        elif sys.platform == "win32":  # Windows
            os.system('FOR /F "tokens=5" %P IN (\'netstat -ano ^| findstr :8765\') DO TaskKill /F /PID %P 2>nul')
            time.sleep(0.5)
            
    except Exception as e:
        unreal.log_warning(f"UEMCP: Error during port cleanup: {e}")
    
    # Final check using port utils
    try:
        import uemcp_port_utils
        if uemcp_port_utils.is_port_in_use(8765):
            unreal.log_warning("UEMCP: Port 8765 still in use after cleanup attempt")
            # Try one more time with force_free
            uemcp_port_utils.force_free_port_silent(8765)
            time.sleep(0.3)
    except:
        pass
    
    unreal.log("UEMCP: Listener stopped")
    return True

# Module info - minimal output when imported
pass