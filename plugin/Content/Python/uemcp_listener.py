"""
UEMCP Fixed Listener - Properly handles threading and provides status
"""

import unreal
import json
import threading
import time
import os
import socket
from http.server import HTTPServer, BaseHTTPRequestHandler
import queue

# Global state
server_running = False
server_thread = None
httpd = None
tick_handle = None

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
                    'actor.organize',
                    'level.save',
                    'level.outliner',
                    'viewport.screenshot',
                    'viewport.camera',
                    'viewport.mode',
                    'viewport.focus',
                    'viewport.render_mode',
                    'python.execute'
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
            
            asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
            assets = asset_registry.get_assets_by_path(path, recursive=True)
            
            asset_list = []
            for i, asset in enumerate(assets):
                if i >= limit:
                    break
                asset_list.append({
                    'name': str(asset.asset_name),
                    'type': str(asset.asset_class),
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
            actor_list = []
            
            limit = params.get('limit', 30)
            for i, actor in enumerate(all_actors):
                if i >= limit:
                    break
                    
                location = actor.get_actor_location()
                actor_list.append({
                    'name': actor.get_actor_label(),
                    'class': actor.get_class().get_name(),
                    'location': {
                        'x': float(location.x),
                        'y': float(location.y),
                        'z': float(location.z)
                    }
                })
            
            return {
                'success': True,
                'actors': actor_list,
                'totalCount': len(all_actors),
                'currentLevel': unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world().get_name()
            }
        
        elif cmd_type == 'actor.create' or cmd_type == 'actor.spawn':
            # Support both legacy 'type' parameter and new 'assetPath' parameter
            actor_type = params.get('type', None)
            asset_path = params.get('assetPath', None)
            location = params.get('location', [0, 0, 100])
            rotation = params.get('rotation', [0, 0, 0])
            scale = params.get('scale', [1, 1, 1])
            name = params.get('name', f'UEMCP_Actor_{int(time.time())}')
            folder = params.get('folder', None)
            
            # Create transform
            ue_location = unreal.Vector(float(location[0]), float(location[1]), float(location[2]))
            ue_rotation = unreal.Rotator(float(rotation[0]), float(rotation[1]), float(rotation[2]))
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
                    return {
                        'success': True,
                        'actorName': name,
                        'location': location,
                        'rotation': rotation,
                        'scale': scale,
                        'assetPath': asset_path or '/Engine/BasicShapes/Cube',
                        'message': f'Created {name} at {location}'
                    }
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
                    
                    unreal.log(f"UEMCP: Spawned blueprint {name} at {location}")
                    return {
                        'success': True,
                        'actorName': name,
                        'location': location,
                        'rotation': rotation,
                        'scale': scale,
                        'assetPath': asset_path,
                        'message': f'Created blueprint actor {name} at {location}'
                    }
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
                    return {
                        'success': True,
                        'message': f'Deleted actor: {actor_name}'
                    }
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
            
            try:
                # Find actor by name
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
                
                # Apply modifications
                if location is not None:
                    ue_location = unreal.Vector(
                        float(location[0]), 
                        float(location[1]), 
                        float(location[2])
                    )
                    found_actor.set_actor_location(ue_location, False, False)
                
                if rotation is not None:
                    ue_rotation = unreal.Rotator(
                        float(rotation[0]), 
                        float(rotation[1]), 
                        float(rotation[2])
                    )
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
                
                # Get updated transform
                current_location = found_actor.get_actor_location()
                current_rotation = found_actor.get_actor_rotation()
                current_scale = found_actor.get_actor_scale3d()
                
                return {
                    'success': True,
                    'actorName': actor_name,
                    'location': [current_location.x, current_location.y, current_location.z],
                    'rotation': [current_rotation.pitch, current_rotation.yaw, current_rotation.roll],
                    'scale': [current_scale.x, current_scale.y, current_scale.z],
                    'message': f'Modified actor: {actor_name}'
                }
                
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
                        # to avoid Roll/Pitch/Yaw confusion from constructor
                        current_rot = unreal.Rotator()
                        current_rot.pitch = float(rotation[0])  # Pitch (up/down)
                        current_rot.yaw = float(rotation[1])    # Yaw (left/right)
                        current_rot.roll = float(rotation[2])   # Roll (tilt)
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
                
                # Focus on selected actors
                # First, get the actor's location and bounds
                actor_location = found_actor.get_actor_location()
                actor_bounds = found_actor.get_actor_bounds(only_colliding_components=False)
                bounds_extent = actor_bounds[1]  # Box extent
                
                # Calculate a good camera distance based on bounds
                max_extent = max(bounds_extent.x, bounds_extent.y, bounds_extent.z)
                camera_distance = max_extent * 3  # View from 3x the largest dimension
                
                # Set camera to look at the actor from a nice angle
                camera_offset = unreal.Vector(-camera_distance, -camera_distance * 0.5, camera_distance * 0.5)
                camera_location = actor_location + camera_offset
                
                # Calculate rotation to look at actor
                direction = actor_location - camera_location
                camera_rotation = direction.rotation()
                
                # Set the viewport camera
                editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
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
                # Get viewport control
                editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
                viewport_client = editor_subsystem.get_level_viewport_camera_info()
                
                # Create proper rotations by setting properties explicitly
                # IMPORTANT: Using Rotator(a,b,c) constructor causes Roll issues!
                # Must set pitch, yaw, roll properties directly
                
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
                
                # For orthographic modes, set specific rotation
                if mode != 'perspective' and mode_map[mode]:
                    rotation = mode_map[mode]['rotation']
                    # Get current camera location
                    current_loc = viewport_client[0]
                    
                    # Set orthographic view with proper orientation
                    editor_subsystem.set_level_viewport_camera_info(
                        current_loc,
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
                
                # Apply the render mode using console commands
                if render_mode == 'wireframe':
                    unreal.SystemLibrary.execute_console_command(None, "viewmode wireframe")
                elif render_mode == 'unlit':
                    unreal.SystemLibrary.execute_console_command(None, "viewmode unlit")
                elif render_mode == 'lit':
                    unreal.SystemLibrary.execute_console_command(None, "viewmode lit")
                elif render_mode == 'detail_lighting':
                    unreal.SystemLibrary.execute_console_command(None, "viewmode lit_detaillighting")
                elif render_mode == 'lighting_only':
                    unreal.SystemLibrary.execute_console_command(None, "viewmode lightingonly")
                elif render_mode == 'light_complexity':
                    unreal.SystemLibrary.execute_console_command(None, "viewmode lightcomplexity")
                elif render_mode == 'shader_complexity':
                    unreal.SystemLibrary.execute_console_command(None, "viewmode shadercomplexity")
                
                unreal.log(f"UEMCP: Set viewport render mode to {render_mode}")
                
                return {
                    'success': True,
                    'mode': render_mode,
                    'message': f'Viewport render mode set to {render_mode}'
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
            # Use the non-blocking restart from helpers
            try:
                import uemcp_helpers
                result = uemcp_helpers.restart_listener()
                
                return {
                    'success': result,
                    'message': 'Hot reload completed!' if result else 'Restart failed - check console'
                }
                
            except Exception as e:
                return {'success': False, 'error': f'Failed to initiate restart: {str(e)}'}
        
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
    global server_running, server_thread, httpd, tick_handle
    
    # Always clean up any existing threads first
    cleanup_all_threads()
    
    if server_running:
        unreal.log_warning("UEMCP Listener is already running!")
        return False
    
    # Check if port is already in use
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(('localhost', port))
    except OSError:
        # Port is in use, try to clean it up automatically
        sock.close()  # Close our test socket first
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
                        test_sock.bind(('localhost', port))
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
        sock.close()
    
    # Start HTTP server
    def run_server():
        global httpd, server_running
        try:
            # Create custom server class with SO_REUSEADDR
            class ReuseAddrHTTPServer(HTTPServer):
                allow_reuse_address = True
                
                def server_bind(self):
                    # Set SO_REUSEADDR before binding
                    self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
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
            
            # Create server with reuse enabled
            httpd = ReuseAddrHTTPServer(('localhost', port), UEMCPHandler)
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
        return
    
    unreal.log("UEMCP: Stopping listener...")
    server_running = False
    
    # Shutdown HTTP server
    if httpd:
        try:
            # First shutdown the server
            httpd.shutdown()
            # Then close the socket
            httpd.server_close()
            # Set to None to ensure it's garbage collected
            httpd = None
        except Exception as e:
            unreal.log_warning(f"UEMCP: Error shutting down server: {e}")
    
    # Wait for thread to finish (with timeout to prevent hanging)
    if server_thread and server_thread.is_alive():
        # Don't wait too long - this can hang UE
        server_thread.join(timeout=0.5)
        if server_thread.is_alive():
            unreal.log_warning("UEMCP: Server thread did not stop cleanly")
    
    # Unregister tick callback
    if tick_handle:
        unreal.unregister_slate_pre_tick_callback(tick_handle)
        tick_handle = None
    
    httpd = None
    server_thread = None
    
    # Force free the port if still in use
    try:
        import uemcp_port_utils
        if uemcp_port_utils.is_port_in_use(8765):
            unreal.log("UEMCP: Forcing port 8765 cleanup...")
            uemcp_port_utils.force_free_port_silent(8765)
            time.sleep(0.5)
    except:
        pass
    
    unreal.log("UEMCP: Listener stopped")

# Module info - minimal output when imported
pass