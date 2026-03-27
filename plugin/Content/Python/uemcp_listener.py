"""
UEMCP Modular Listener - Refactored with modular architecture
"""

import json
import queue
import threading
import time

# import os
# import sys
# import socket
from http.server import BaseHTTPRequestHandler, HTTPServer

import unreal

from ops.system import register_system_operations
from ops.tool_manifest import get_tool_manifest

# Import command registry and operations
from uemcp_command_registry import dispatch_command, register_all_operations
from utils import log_debug, log_error
from version import VERSION

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
abandoned_requests = {}  # request_id -> abandon timestamp (float); cleaned up periodically
_response_events = {}  # Per-request threading.Event objects
_response_lock = threading.Lock()  # Protects response_queue, abandoned_requests, _response_events

# Fallback timeout defaults for direct HTTP callers that don't send a timeout field.
# The MCP server (TypeScript) always sends timeout — these only apply to raw HTTP calls.
_COMMAND_TIMEOUTS = {
    "viewport_screenshot": 30,
    "asset_import": 60,
    "batch_operations": 30,
    "actor_batch_spawn": 30,
    "blueprint_compile": 30,
    "blueprint_create": 30,
    "blueprint_document": 30,
    "python_proxy": 30,
    "material_create_simple": 20,
    "material_create_instance": 20,
}
_DEFAULT_TIMEOUT = 10


class UEMCPHandler(BaseHTTPRequestHandler):
    """HTTP handler for UEMCP commands"""

    def do_GET(self):
        """Provide health check status with full manifest"""
        # Get the manifest (function imported at module level)
        manifest = get_tool_manifest()

        # Combine status with manifest
        response = {
            "status": "online",
            "service": "UEMCP Listener",
            "version": VERSION,
            "ready": True,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "manifest": manifest,
        }

        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()

        self.wfile.write(json.dumps(response, indent=2).encode("utf-8"))

    def do_POST(self):
        """Handle command execution"""
        try:
            command = self._parse_command()
            if command is None:
                return  # _parse_command already sent the error response
            request_id = self._generate_request_id()
            self._log_command(command)

            # Register event BEFORE queuing so _post_response never misses it
            event = threading.Event()
            with _response_lock:
                _response_events[request_id] = event

            # Queue command for main thread
            command_queue.put((request_id, command))

            # Determine timeout: explicit (from MCP server) > per-command fallback > 10s default
            # Normalize legacy dot-style types (e.g., "viewport.screenshot") to underscore form
            command_type = command.get("type", "")
            normalized_type = command_type.replace(".", "_") if isinstance(command_type, str) else ""
            fallback_timeout = _COMMAND_TIMEOUTS.get(normalized_type, _DEFAULT_TIMEOUT)
            timeout = command.get("timeout", fallback_timeout)

            # Wait for response
            result = self._wait_for_response(request_id, timeout=timeout, event=event)
            if result is None:
                self.send_error(504, f"Command execution timeout after {timeout}s")
                return

            # Send response
            self._send_json_response(200, result)

        except Exception as e:
            self._handle_error(e)

    def _parse_command(self):
        """Parse command from POST data.

        Returns:
            dict or None: Parsed command, or None if validation failed (error already sent)
        """
        raw_length = self.headers.get("Content-Length")
        if raw_length is None:
            self.send_error(411, "Content-Length required")
            return None
        try:
            content_length = int(raw_length)
        except ValueError:
            self.send_error(400, "Invalid Content-Length")
            return None
        if content_length <= 0:
            self.send_error(400, "Content-Length must be positive")
            return None
        if content_length > 10 * 1024 * 1024:  # 10 MB cap
            self.send_error(413, "Request body too large")
            return None
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
            params = command.get("params", {})
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
        return ", ".join(param_info)

    def _wait_for_response(self, request_id, timeout=10.0, event=None):
        """Wait for command response.

        Args:
            request_id: Request ID to wait for
            timeout: Maximum wait time in seconds
            event: Pre-created threading.Event already registered in _response_events.

        Returns:
            dict or None: Response if received, None on timeout
        """
        if event is None:
            event = threading.Event()
            with _response_lock:
                _response_events[request_id] = event

        # Wait outside the lock — the event is set by _post_response
        event.wait(timeout=timeout)

        # Atomically check result and clean up under the lock
        with _response_lock:
            result = response_queue.pop(request_id, None)
            _response_events.pop(request_id, None)
            if result is not None:
                return result
            # Timeout: mark abandoned with timestamp for periodic cleanup
            abandoned_requests[request_id] = time.time()
            return None

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

        error = {"success": False, "error": str(e), "error_type": type(e).__name__}
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
            "asset_get_info": "asset_get_asset_info",  # Direct MCP mapping
            "level.actors": "level_get_level_actors",
            "level.save": "level_save_level",
            "level.outliner": "level_get_outliner_structure",
            "level_get_outliner": "level_get_outliner_structure",  # Direct MCP mapping
            "actor.spawn": "actor_spawn",
            "actor.create": "actor_spawn",  # Alias
            "actor.delete": "actor_delete",
            "actor.modify": "actor_modify",
            "actor.duplicate": "actor_duplicate",
            "actor.organize": "actor_organize",
            "actor.batch_spawn": "actor_batch_spawn",  # Direct MCP mapping
            "batch_spawn": "actor_batch_spawn",  # MCP tool name
            "material_create": "material_create_material",  # Direct MCP mapping
            "material_info": "material_get_material_info",  # Direct MCP mapping
            "material_get_info": "material_get_material_info",  # Direct MCP mapping
            "material_apply": "material_apply_material_to_actor",  # Direct MCP mapping
            "material_apply_to_actor": "material_apply_material_to_actor",  # Direct MCP mapping
            "material_list": "material_list_materials",  # Direct MCP mapping
            "blueprint_list": "blueprint_list_blueprints",  # Direct MCP mapping
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
        }

        # Get the new command name, fall back to direct dispatch
        new_command = command_map.get(cmd_type, cmd_type)
        return dispatch_command(new_command, params)

    except Exception as e:
        import traceback

        log_error(f"Failed to execute command {cmd_type}: {str(e)}")
        log_error(f"Traceback: {traceback.format_exc()}")
        return {"success": False, "error": str(e)}


def _post_response(request_id, result):
    """Store result and signal the waiting HTTP handler thread.

    All shared state access is protected by _response_lock to prevent races.
    """
    with _response_lock:
        if request_id in abandoned_requests:
            del abandoned_requests[request_id]
            return
        event = _response_events.get(request_id)
        if event is None:
            return
        response_queue[request_id] = result
    # Set event outside lock so the waiter can acquire the lock to read
    event.set()


def process_commands():
    """Process queued commands on main thread"""
    try:
        while not command_queue.empty():
            request_id = None
            try:
                request_id, command = command_queue.get_nowait()
                cmd_type = command.get("type", "unknown")
                result = execute_on_main_thread(command)
                _post_response(request_id, result)

                # Log command completion
                if result.get("success"):
                    unreal.log(f"UEMCP: Completed MCP tool: {cmd_type} ✓")
                else:
                    error_msg = result.get("error", "Unknown error")
                    unreal.log(f"UEMCP: Failed MCP tool: {cmd_type} - {error_msg}")
            except queue.Empty:
                break
            except Exception as e:
                log_error(f"Error processing command: {str(e)}")
                if request_id is not None:
                    _post_response(request_id, {"success": False, "error": str(e)})
    except Exception as e:
        log_error(f"Command processing error: {str(e)}")


def _cleanup_abandoned_requests():
    """Remove abandoned_requests entries older than 30 seconds to prevent unbounded growth."""
    cutoff = time.time() - 30
    with _response_lock:
        stale = [rid for rid, ts in abandoned_requests.items() if ts < cutoff]
        for rid in stale:
            del abandoned_requests[rid]


def tick_handler(delta_time):
    """Main thread tick handler"""
    try:
        process_commands()
        _cleanup_abandoned_requests()
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

    # Register manifest operations for dynamic tool discovery
    from ops.tool_manifest import register_manifest_operations

    register_manifest_operations()

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
                try:
                    local_httpd.handle_request()
                except OSError as e:
                    # Socket was closed, this is expected during shutdown
                    if not server_running:
                        break
                    log_error(f"Socket error during request handling: {str(e)}")
                    break

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
        uemcp_thread_tracker.track_thread(thread)
    except Exception:
        pass


def _untrack_server_thread(thread):
    """Remove server thread from tracking.

    Args:
        thread: The server thread to untrack (no-op if None)
    """
    if thread is None:
        return
    try:
        uemcp_thread_tracker.untrack_thread(thread)
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
            # Close the httpd socket to interrupt handle_request()
            if httpd:
                try:
                    # Close the socket to interrupt any pending handle_request()
                    httpd.socket.close()
                except Exception:
                    pass

            # Wait a bit for the thread to exit
            for _i in range(30):  # Wait up to 3 seconds
                if not server_thread.is_alive():
                    break
                time.sleep(0.1)

            # If still alive, force kill the port
            if server_thread.is_alive():
                log_error("Server thread did not stop gracefully, forcing port cleanup")
                try:
                    from utils import force_free_port_silent

                    force_free_port_silent(8765)
                except Exception:
                    pass

        # Clean up thread tracking before nullifying the reference
        _untrack_server_thread(server_thread)

        # Clean up references
        httpd = None
        server_thread = None

        unreal.log("UEMCP: Modular listener stopped")
        return True

    except Exception as e:
        log_error(f"Error stopping server: {str(e)}")
        return False


def schedule_restart():
    """Schedule a server restart (deprecated - use restart_listener instead)"""
    # Just call restart_listener directly now
    return {"success": restart_listener(), "message": "Restart completed"}


def get_status():
    """Get current server status"""
    return {"running": server_running, "port": 8765, "version": VERSION}


# Module-level functions for compatibility with existing code
def start_listener():
    """Start the UEMCP listener (module-level function for compatibility)."""
    return start_server()


def stop_listener():
    """Stop the UEMCP listener (module-level function for compatibility)."""
    return stop_server()


def restart_listener():
    """Restart the UEMCP listener (module-level function for compatibility)."""
    unreal.log("UEMCP: Restarting listener...")

    # Stop the server first
    if stop_server():
        # Wait a longer moment for complete cleanup
        time.sleep(1.0)  # Increased from 0.5 to ensure port is fully released

        # Start it again
        if start_server():
            unreal.log("UEMCP: Listener restarted successfully")
            return True
        else:
            unreal.log_error("UEMCP: Failed to start listener after stopping")
            return False
    else:
        unreal.log_error("UEMCP: Failed to stop listener for restart")
        return False


# Auto-start only if running as main script
# When imported as a module, init_unreal.py handles startup
if __name__ == "__main__":
    # Start server when run directly
    start_server()
