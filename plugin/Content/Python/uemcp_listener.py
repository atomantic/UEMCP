"""
UEMCP Modular Listener - Refactored with modular architecture
"""

import unreal
import json
import threading
import time
# import os
# import sys
# import socket
from http.server import HTTPServer, BaseHTTPRequestHandler
import queue

# Import command registry and operations
from uemcp_command_registry import register_all_operations, dispatch_command
from ops.system import register_system_operations
from utils import log_debug, log_error

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
        """Provide simple health check status"""
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()

        # Minimal status for health check - only what Python bridge actually
        # uses
        status = {
            "status": "online",
            "service": "UEMCP Listener",
            "version": "2.0",
            "ready": True,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        }

        self.wfile.write(json.dumps(status, indent=2).encode("utf-8"))

    def do_POST(self):
        """Handle command execution"""
        try:
            command = self._parse_command()
            request_id = self._generate_request_id()
            self._log_command(command)

            # Queue command for main thread
            command_queue.put((request_id, command))

            # Wait for response
            result = self._wait_for_response(request_id)
            if result is None:
                self.send_error(504, "Command execution timeout")
                return

            # Send response
            self._send_json_response(200, result)

        except Exception as e:
            self._handle_error(e)

    def _parse_command(self):
        """Parse command from POST data.

        Returns:
            dict: Parsed command
        """
        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length)
        return json.loads(post_data.decode("utf-8"))

    def _generate_request_id(self):
        """Generate unique request ID.

        Returns:
            str: Unique request ID
        """
        return f"req_{time.time()}_{threading.get_ident()}"

    def _log_command(self, command):
        """Log incoming command details.

        Args:
            command: Command dictionary
        """
        cmd_type = command.get("type", "unknown")

        if cmd_type == "python_proxy":
            # Don't log full code for python_proxy
            unreal.log(f"UEMCP: Handling MCP tool: {cmd_type}")
        else:
            params = command.get("parameters", {})
            param_str = self._format_params_for_logging(params)
            unreal.log(f"UEMCP: Handling MCP tool: {cmd_type}({param_str})")

    def _format_params_for_logging(self, params):
        """Format parameters for logging.

        Args:
            params: Parameters dictionary

        Returns:
            str: Formatted parameter string
        """
        if not params:
            return ""

        param_info = []
        for k, v in list(params.items())[:3]:
            if isinstance(v, str) and len(v) > 50:
                v = v[:50] + "..."
            param_info.append(f"{k}={v}")
        return ', '.join(param_info)

    def _wait_for_response(self, request_id, timeout=10.0):
        """Wait for command response.

        Args:
            request_id: Request ID to wait for
            timeout: Maximum wait time in seconds

        Returns:
            dict or None: Response if received, None on timeout
        """
        start_time = time.time()

        while request_id not in response_queue:
            if time.time() - start_time > timeout:
                return None
            time.sleep(0.01)

        return response_queue.pop(request_id)

    def _send_json_response(self, code, data):
        """Send JSON response.

        Args:
            code: HTTP response code
            data: Data to send as JSON
        """
        self.send_response(code)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode("utf-8"))

    def _handle_error(self, e):
        """Handle and log errors.

        Args:
            e: Exception that occurred
        """
        log_error(f"POST request handler error: {str(e)}")
        log_error(f"Error type: {type(e).__name__}")

        import traceback
        log_error(f"Traceback: {traceback.format_exc()}")

        error = {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__}
        self._send_json_response(500, error)

    def log_message(self, format, *args):
        """Suppress default logging"""
        pass


def execute_on_main_thread(command):
    """Execute command on main thread using the modular system"""
    cmd_type = command.get("type", "")
    params = command.get("params", {})

    try:
        # Convert old command format to new format
        # Map old command types to new command names
        command_map = {
            "project.info": "level_get_project_info",
            "asset.list": "asset_list_assets",
            "asset.info": "asset_get_asset_info",
            "level.actors": "level_get_level_actors",
            "level.save": "level_save_level",
            "level.outliner": "level_get_outliner_structure",
            "actor.spawn": "actor_spawn",
            "actor.create": "actor_spawn",  # Alias
            "actor.delete": "actor_delete",
            "actor.modify": "actor_modify",
            "actor.duplicate": "actor_duplicate",
            "actor.organize": "actor_organize",
            "viewport.screenshot": "viewport_screenshot",
            "viewport.camera": "viewport_set_camera",
            "viewport.mode": "viewport_set_mode",
            "viewport.focus": "viewport_focus_on_actor",
            "viewport.render_mode": "viewport_set_render_mode",
            "viewport.bounds": "viewport_get_bounds",
            "viewport.fit": "viewport_fit_actors",
            "viewport.look_at": "viewport_look_at_target",
            "python.execute": "python_proxy",
            "python.proxy": "python_proxy",  # Alternative mapping
            "system.restart": "restart_listener",
            "system.help": "help",
            "system.test": "test_connection",
            "system.test_connection": "test_connection",  # Alternative mapping
            "system.logs": "ue_logs",
            "system.ue_logs": "ue_logs",  # Alternative mapping
            # Note: undo/redo/history/checkpoint tools exist only in MCP server layer
            # These operations are handled by the MCP server's operation history system
            # and don't need Python plugin implementations
            "system.undo": "not_implemented_python_layer",
            "system.redo": "not_implemented_python_layer", 
            "system.history_list": "not_implemented_python_layer",
            "system.checkpoint_create": "not_implemented_python_layer",
            "system.checkpoint_restore": "not_implemented_python_layer",
            "placement.validate": "not_implemented_python_layer",
        }

        # Get the new command name
        new_command = command_map.get(cmd_type)
        if new_command:
            # Check for server-layer-only commands
            if new_command == "not_implemented_python_layer":
                return {
                    "success": False,
                    "error": f"Command '{cmd_type}' is handled by MCP server layer, not Python plugin",
                    "note": "This command should be called through the MCP server API, not directly to the Python listener"
                }
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
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }


def process_commands():
    """Process queued commands on main thread"""
    try:
        while not command_queue.empty():
            try:
                request_id, command = command_queue.get_nowait()
                cmd_type = command.get("type", "unknown")
                result = execute_on_main_thread(command)
                response_queue[request_id] = result

                # Log command completion
                if result.get("success"):
                    unreal.log(f"UEMCP: Completed MCP tool: {cmd_type} ✓")
                else:
                    error_msg = result.get("error", "Unknown error")
                    unreal.log(
                        f"UEMCP: Failed MCP tool: {cmd_type} - {error_msg}")
            except queue.Empty:
                break
            except Exception as e:
                log_error(f"Error processing command: {str(e)}")
                response_queue[request_id] = {
                    "success": False, "error": str(e)}
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
                # Schedule restart after server is fully stopped
                unreal.log(
                    "UEMCP: Listener stopped, restarting in 1 second...")

                # Create a one-time tick handler for restart
                restart_timer = {"time": 1.0}

                def restart_tick_handler(delta):
                    restart_timer["time"] -= delta
                    if restart_timer["time"] <= 0:
                        unreal.unregister_slate_post_tick_callback(
                            restart_handle)
                        unreal.log("UEMCP: Restarting listener now...")
                        start_server()

                restart_handle = unreal.register_slate_post_tick_callback(
                    restart_tick_handler)
                return

    except Exception as e:
        log_error(f"Tick handler error: {str(e)}")


def start_server():
    """Start the HTTP server"""
    global server_thread, tick_handle

    if server_running:
        log_debug("Server already running")
        return True

    try:
        # Register operations and handlers
        _register_operations()
        tick_handle = _register_tick_handler()

        # Start server thread
        server_thread = _create_server_thread()
        server_thread.start()

        # Track and verify
        _track_server_thread(server_thread)
        return _verify_server_started()

    except Exception as e:
        log_error(f"Failed to start server: {str(e)}")
        import traceback
        log_error(f"Traceback: {traceback.format_exc()}")
        return False


def _register_operations():
    """Register all operations with the command registry."""
    register_all_operations()
    register_system_operations()
    log_debug("Registered all operations with command registry")


def _register_tick_handler():
    """Register tick handler for main thread processing.

    Returns:
        Handle for the registered tick handler
    """
    handle = unreal.register_slate_post_tick_callback(tick_handler)
    log_debug("Registered tick handler")
    return handle


def _create_server_thread():
    """Create the server thread.

    Returns:
        threading.Thread: The server thread
    """
    def run_server():
        global httpd, server_running
        local_httpd = None
        try:
            local_httpd = HTTPServer(("localhost", 8765), UEMCPHandler)
            local_httpd.timeout = 0.5
            httpd = local_httpd
            server_running = True
            log_debug("HTTP server started on port 8765")

            while server_running:
                local_httpd.handle_request()

        except Exception as e:
            log_error(f"HTTP server error: {str(e)}")
        finally:
            server_running = False
            _cleanup_server(local_httpd)
            httpd = None

    return threading.Thread(target=run_server, daemon=True)


def _cleanup_server(httpd_instance):
    """Clean up server resources.

    Args:
        httpd_instance: The HTTP server instance to clean up
    """
    if httpd_instance:
        try:
            httpd_instance.server_close()
        except Exception:
            pass


def _track_server_thread(thread):
    """Track server thread for cleanup.

    Args:
        thread: The server thread to track
    """
    try:
        uemcp_thread_tracker.track_thread("uemcp_server", thread)
    except Exception:
        pass


def _verify_server_started():
    """Verify the server started successfully.

    Returns:
        bool: True if server is running, False otherwise
    """
    # Wait a moment for server to start
    time.sleep(0.5)

    if server_running:
        unreal.log("UEMCP: Modular listener started successfully on port 8765")
        return True
    else:
        unreal.log_error("UEMCP: Failed to start modular listener")
        return False


def stop_server():
    """Stop the HTTP server"""
    global server_running, server_thread, httpd, tick_handle

    try:
        # Signal server to stop
        server_running = False

        # Unregister tick handler first
        if tick_handle:
            unreal.unregister_slate_post_tick_callback(tick_handle)
            tick_handle = None
            log_debug("Unregistered tick handler")

        # Give the server thread time to notice the flag and exit gracefully
        if server_thread and server_thread.is_alive():
            # Wait a bit for the thread to exit
            for i in range(20):  # Wait up to 2 seconds
                if not server_thread.is_alive():
                    break
                time.sleep(0.1)

            # If still alive, force kill the port
            if server_thread.is_alive():
                log_error(
                    "Server thread did not stop gracefully, forcing port cleanup")
                try:
                    from utils import force_free_port_silent

                    force_free_port_silent(8765)
                except Exception:
                    pass

        # Clean up references
        httpd = None
        server_thread = None

        # Clean up thread tracking
        try:
            uemcp_thread_tracker.untrack_thread("uemcp_server")
        except Exception:
            pass

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
    return {"success": True, "message": "Restart scheduled"}


def get_status():
    """Get current server status"""
    return {"running": server_running,
            "port": 8765, "version": "2.0 (Modular)"}


# Module-level functions for compatibility with existing code
def start_listener():
    """Start the UEMCP listener (module-level function for compatibility)."""
    return start_server()


def stop_listener():
    """Stop the UEMCP listener (module-level function for compatibility)."""
    return stop_server()


def restart_listener():
    """Restart the UEMCP listener (module-level function for compatibility)."""
    # Use the safer scheduled restart to avoid threading issues
    result = schedule_restart()
    if result["success"]:
        unreal.log("UEMCP: Restart scheduled - will restart automatically")
        return True
    return False


# Auto-start only if running as main script
# When imported as a module, init_unreal.py handles startup
if __name__ == "__main__":
    # Start server when run directly
    start_server()
