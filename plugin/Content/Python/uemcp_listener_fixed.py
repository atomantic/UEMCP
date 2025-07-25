"""
UEMCP Fixed Listener - Properly handles threading and provides status
"""

import unreal
import json
import threading
import time
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
import queue

# Global state
server_running = False
server_thread = None
httpd = None
tick_handle = None

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
                    'level.save',
                    'viewport.screenshot',
                    'viewport.camera'
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
                'currentLevel': unreal.UnrealEditorSubsystem().get_editor_world().get_name()
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
            all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
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
                'currentLevel': unreal.UnrealEditorSubsystem().get_editor_world().get_name()
            }
        
        elif cmd_type == 'actor.create' or cmd_type == 'actor.spawn':
            # Support both legacy 'type' parameter and new 'assetPath' parameter
            actor_type = params.get('type', None)
            asset_path = params.get('assetPath', None)
            location = params.get('location', [0, 0, 100])
            rotation = params.get('rotation', [0, 0, 0])
            scale = params.get('scale', [1, 1, 1])
            name = params.get('name', f'UEMCP_Actor_{int(time.time())}')
            
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
                actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
                    asset,
                    ue_location,
                    ue_rotation
                )
                
                if actor:
                    actor.set_actor_label(name)
                    actor.set_actor_scale3d(ue_scale)
                    
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
        
        elif cmd_type == 'level.save':
            success = unreal.EditorLevelLibrary.save_current_level()
            return {
                'success': success,
                'message': 'Level saved successfully' if success else 'Failed to save level'
            }
        
        elif cmd_type == 'viewport.screenshot':
            import os
            import tempfile
            
            # Create temp directory for screenshots
            temp_dir = tempfile.gettempdir()
            timestamp = int(time.time())
            filename = f'uemcp_screenshot_{timestamp}.png'
            filepath = os.path.join(temp_dir, filename)
            
            try:
                # Take screenshot with reasonable resolution to avoid performance issues
                # Reduced from 1920x1080 to 1280x720 to prevent audio buffer underruns
                unreal.AutomationLibrary.take_high_res_screenshot(
                    1280, 720,   # Reduced resolution
                    filepath,    # Filename
                    None,        # Camera (None = current view)
                    False,       # Mask enabled
                    False        # Capture HDR
                )
                
                # Wait a moment for file to be written
                time.sleep(0.5)
                
                if os.path.exists(filepath):
                    return {
                        'success': True,
                        'filepath': filepath,
                        'message': f'Screenshot saved to: {filepath}'
                    }
                else:
                    return {'success': False, 'error': 'Screenshot file not created'}
                    
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
                all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
                found = False
                
                for actor in all_actors:
                    if actor.get_actor_label() == actor_name:
                        unreal.EditorLevelLibrary.destroy_actor(actor)
                        found = True
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
            
            try:
                # Find actor by name
                all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
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
                # Get the level editor subsystem for viewport control
                level_editor_subsystem = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
                
                # Initialize viewport location and rotation
                current_loc = None
                current_rot = None
                
                if focus_actor:
                    # Find and focus on specific actor
                    all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
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
                        
                        # Set viewport
                        unreal.EditorLevelLibrary.set_level_viewport_camera_info(
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
                        current_rot = unreal.Rotator(
                            float(rotation[0]),  # Pitch
                            float(rotation[1]),  # Yaw
                            float(rotation[2])   # Roll
                        )
                    else:
                        # Default rotation looking forward and slightly down
                        current_rot = unreal.Rotator(-30, 0, 0)
                    
                    # Set the viewport camera
                    unreal.EditorLevelLibrary.set_level_viewport_camera_info(
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
        
        elif cmd_type == 'system.restart':
            # Handle restart command
            force = params.get('force', False)
            
            try:
                # Mark that we need to restart
                global restart_scheduled
                restart_scheduled = True
                
                # Return success immediately
                return {
                    'success': True,
                    'message': 'Listener restart scheduled. The listener will restart after sending this response.',
                    'note': 'Connection will be temporarily unavailable during restart (1-2 seconds).'
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
    
    # Check if restart was scheduled
    global restart_scheduled
    if restart_scheduled:
        restart_scheduled = False
        unreal.log("UEMCP: Executing scheduled restart...")
        # Import and call restart function
        try:
            import uemcp_helpers
            # Schedule restart on next tick to allow response to be sent
            unreal.register_slate_post_tick_callback(lambda delta: uemcp_helpers.restart_listener())
        except Exception as e:
            unreal.log_error(f"UEMCP: Failed to schedule restart: {e}")

def start_listener(port=8765):
    """Start the HTTP listener with main thread processing"""
    global server_running, server_thread, httpd, tick_handle
    
    if server_running:
        unreal.log_warning("UEMCP Listener is already running!")
        return False
    
    # Check if port is already in use
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(('localhost', port))
    except OSError:
        # Port is in use, try to get more info
        try:
            import uemcp_port_utils
            pid, process_name = uemcp_port_utils.find_process_using_port(port)
            if pid:
                unreal.log_warning(f"Port {port} is used by {process_name} (PID: {pid})")
            else:
                unreal.log_warning(f"Port {port} is already in use")
        except:
            unreal.log_warning(f"Port {port} is already in use - another listener may be running")
        
        unreal.log("Try: stop_listener() first, or check for other processes")
        unreal.log("Or in Python console: import uemcp_port_utils; uemcp_port_utils.force_free_port(8765)")
        return False
    finally:
        # Always close the socket to prevent resource warnings
        sock.close()
    
    # Start HTTP server
    def run_server():
        global httpd
        try:
            httpd = HTTPServer(('localhost', port), UEMCPHandler)
            unreal.log(f"UEMCP Listener started on http://localhost:{port}")
            httpd.serve_forever()
        except Exception as e:
            unreal.log_error(f"Failed to start listener: {e}")
    
    server_running = True
    server_thread = threading.Thread(target=run_server)
    server_thread.daemon = True
    server_thread.start()
    
    # Register tick callback for main thread processing
    tick_handle = unreal.register_slate_pre_tick_callback(process_commands)
    
    # Wait a moment
    time.sleep(0.5)
    
    unreal.log("UEMCP Listener is running!")
    unreal.log(f"Status: http://localhost:{port}/")
    unreal.log("Ready to receive commands from Claude")
    
    # Show notification
    unreal.EditorDialog.show_message(
        "UEMCP Connected",
        f"Listener running on http://localhost:{port}\nClaude can now control Unreal Engine!",
        unreal.AppMsgType.OK
    )
    
    return True

def stop_listener():
    """Stop the listener and cleanup"""
    global server_running, httpd, tick_handle, server_thread
    
    if not server_running:
        unreal.log("UEMCP Listener is not running")
        return
    
    server_running = False
    
    # Shutdown HTTP server
    if httpd:
        try:
            httpd.shutdown()
            httpd.server_close()  # This ensures socket is closed
        except:
            pass
    
    # Wait for thread to finish
    if server_thread and server_thread.is_alive():
        server_thread.join(timeout=2)
    
    # Unregister tick callback
    if tick_handle:
        unreal.unregister_slate_pre_tick_callback(tick_handle)
        tick_handle = None
    
    httpd = None
    server_thread = None
    unreal.log("UEMCP Listener stopped")

# Module info
print("\n" + "="*50)
print("UEMCP Fixed Listener - Thread-Safe Version")
print("="*50)
print("\nCommands:")
print("  start_listener() - Start the listener")
print("  stop_listener()  - Stop the listener")
print("\nStatus URL: http://localhost:8765/")
print("="*50)