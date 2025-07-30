"""
UEMCP Modular Listener - Refactored with modular architecture
"""

import unreal
import json
import threading
import time
import os
import sys
import socket
from http.server import HTTPServer, BaseHTTPRequestHandler
import queue

# Import command registry and operations
from uemcp_command_registry import get_registry, register_all_operations, dispatch_command
from uemcp_system_ops import register_system_operations
from uemcp_utils import log_debug, log_error

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

class UEMCPHandler(BaseHTTPRequestHandler):
    """HTTP handler for UEMCP commands"""
    
    def do_GET(self):
        """Provide detailed status information"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        # Get project info
        try:
            from uemcp_utils import get_project_info
            project_info = get_project_info()
            
            # Get available commands from registry
            registry = get_registry()
            commands_by_category = registry.get_commands_by_category()
            all_commands = []
            for category, commands in commands_by_category.items():
                all_commands.extend(commands)
            
            status = {
                'status': 'online',
                'service': 'UEMCP Modular Listener',
                'version': '2.0',
                'project': project_info['projectName'],
                'engine_version': project_info['engineVersion'],
                'ready': True,
                'endpoints': {
                    'GET /': 'Status and health check',
                    'POST /': 'Execute UEMCP commands'
                },
                'available_commands': sorted(all_commands),
                'commands_by_category': commands_by_category,
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
            }
        except Exception as e:
            status = {
                'status': 'online',
                'service': 'UEMCP Modular Listener',
                'ready': True,
                'error': f'Could not get project info: {str(e)}'
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
                log_debug(f"Received command: {cmd_type} (ID: {request_id})")
            
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
            log_error(f"POST request handler error: {str(e)}")
            log_error(f"Error type: {type(e).__name__}")
            import traceback
            log_error(f"Traceback: {traceback.format_exc()}")
            
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
    """Execute command on main thread using the modular system"""
    cmd_type = command.get('type', '')
    params = command.get('params', {})
    
    try:
        # Convert old command format to new format
        # Map old command types to new command names
        command_map = {
            'project.info': 'level_get_project_info',
            'asset.list': 'asset_list_assets',
            'asset.info': 'asset_get_asset_info',
            'level.actors': 'level_get_level_actors',
            'level.save': 'level_save_level',
            'level.outliner': 'level_get_outliner_structure',
            'actor.spawn': 'actor_spawn',
            'actor.create': 'actor_spawn',  # Alias
            'actor.delete': 'actor_delete',
            'actor.modify': 'actor_modify',
            'actor.duplicate': 'actor_duplicate',
            'actor.organize': 'actor_organize',
            'viewport.screenshot': 'viewport_screenshot',
            'viewport.camera': 'viewport_set_camera',
            'viewport.mode': 'viewport_set_mode',
            'viewport.focus': 'viewport_focus_on_actor',
            'viewport.render_mode': 'viewport_set_render_mode',
            'viewport.bounds': 'viewport_get_bounds',
            'viewport.fit': 'viewport_fit_actors',
            'viewport.look_at': 'viewport_look_at_target',
            'python.execute': 'python_proxy',
            'system.restart': 'restart_listener',
            'system.help': 'help',
            'system.test': 'test_connection',
            'system.logs': 'ue_logs'
        }
        
        # Get the new command name
        new_command = command_map.get(cmd_type)
        if new_command:
            # Dispatch through the registry
            return dispatch_command(new_command, params)
        else:
            # Try direct dispatch (for commands already in new format)
            return dispatch_command(cmd_type, params)
            
    except Exception as e:
        log_error(f"Failed to execute command {cmd_type}: {str(e)}")
        import traceback
        log_error(f"Traceback: {traceback.format_exc()}")
        return {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }


def process_commands():
    """Process queued commands on main thread"""
    try:
        while not command_queue.empty():
            try:
                request_id, command = command_queue.get_nowait()
                result = execute_on_main_thread(command)
                response_queue[request_id] = result
            except queue.Empty:
                break
            except Exception as e:
                log_error(f"Error processing command: {str(e)}")
                response_queue[request_id] = {
                    'success': False,
                    'error': str(e)
                }
    except Exception as e:
        log_error(f"Command processing error: {str(e)}")


def tick_handler(delta_time):
    """Main thread tick handler"""
    global restart_scheduled, restart_countdown
    
    try:
        # Process any queued commands
        process_commands()
        
        # Handle scheduled restart
        if restart_scheduled:
            restart_countdown -= delta_time
            if restart_countdown <= 0:
                restart_scheduled = False
                stop_server()
                # The restart will be handled by uemcp_helpers
                return
                
    except Exception as e:
        log_error(f"Tick handler error: {str(e)}")


def start_server():
    """Start the HTTP server"""
    global server_running, server_thread, httpd, tick_handle
    
    if server_running:
        log_debug("Server already running")
        return True
    
    try:
        # Register all operations with the command registry
        register_all_operations()
        register_system_operations()
        log_debug("Registered all operations with command registry")
        
        # Register tick handler for main thread processing
        tick_handle = unreal.register_slate_post_tick_callback(tick_handler)
        log_debug("Registered tick handler")
        
        # Start HTTP server in separate thread
        def run_server():
            global httpd, server_running
            try:
                httpd = HTTPServer(('localhost', 8765), UEMCPHandler)
                httpd.timeout = 0.5
                server_running = True
                log_debug("HTTP server started on port 8765")
                
                while server_running:
                    httpd.handle_request()
                    
            except Exception as e:
                log_error(f"HTTP server error: {str(e)}")
            finally:
                server_running = False
                if httpd:
                    httpd.server_close()
                    httpd = None
        
        server_thread = threading.Thread(target=run_server, daemon=True)
        server_thread.start()
        
        # Track thread for cleanup
        try:
            uemcp_thread_tracker.track_thread('uemcp_server', server_thread)
        except:
            pass
        
        # Wait a moment for server to start
        time.sleep(0.5)
        
        # Verify server is running
        if server_running:
            unreal.log("UEMCP: Modular listener started successfully on port 8765")
            return True
        else:
            unreal.log_error("UEMCP: Failed to start modular listener")
            return False
            
    except Exception as e:
        log_error(f"Failed to start server: {str(e)}")
        import traceback
        log_error(f"Traceback: {traceback.format_exc()}")
        return False


def stop_server():
    """Stop the HTTP server"""
    global server_running, server_thread, httpd, tick_handle
    
    try:
        # Signal server to stop
        server_running = False
        
        # Unregister tick handler
        if tick_handle:
            unreal.unregister_slate_post_tick_callback(tick_handle)
            tick_handle = None
            log_debug("Unregistered tick handler")
        
        # Stop HTTP server
        if httpd:
            httpd.shutdown()
            httpd.server_close()
            httpd = None
            
        # Wait for server thread to finish
        if server_thread and server_thread.is_alive():
            server_thread.join(timeout=2.0)
            
        # Clean up thread tracking
        try:
            uemcp_thread_tracker.untrack_thread('uemcp_server')
        except:
            pass
            
        server_thread = None
        unreal.log("UEMCP: Modular listener stopped")
        return True
        
    except Exception as e:
        log_error(f"Error stopping server: {str(e)}")
        return False


def schedule_restart():
    """Schedule a server restart"""
    global restart_scheduled, restart_countdown
    restart_scheduled = True
    restart_countdown = 0.5  # Restart in 0.5 seconds
    return {'success': True, 'message': 'Restart scheduled'}


def get_status():
    """Get current server status"""
    global server_running
    return {
        'running': server_running,
        'port': 8765,
        'version': '2.0 (Modular)'
    }


# Auto-start if imported
if __name__ != "__main__":
    # Check if we should auto-start
    if os.environ.get('UEMCP_AUTOSTART', '1') == '1':
        try:
            # Small delay to ensure Unreal is ready
            unreal.log("UEMCP: Auto-starting modular listener...")
            start_server()
        except Exception as e:
            log_error(f"Auto-start failed: {str(e)}")