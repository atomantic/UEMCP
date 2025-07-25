"""
UEMCP Auto-startup Script
This script is automatically executed when the plugin loads
"""

import unreal
import sys
import os
import time

# Add this plugin's Python directory to path
plugin_python_path = os.path.dirname(os.path.abspath(__file__))
if plugin_python_path not in sys.path:
    sys.path.append(plugin_python_path)

try:
    # Import listener module
    import uemcp_listener_fixed
    
    # Check if a listener is already running (from previous session)
    if uemcp_listener_fixed.server_running:
        uemcp_listener_fixed.stop_listener()
        time.sleep(1)  # Give it time to clean up
    
    # Also check if port is in use from a crashed session
    import uemcp_port_utils
    if uemcp_port_utils.is_port_in_use(8765):
        unreal.log("UEMCP: Port 8765 in use from previous session, cleaning up...")
        uemcp_port_utils.force_free_port_silent(8765)
        time.sleep(1)
    
    # Try to start the listener
    started = uemcp_listener_fixed.start_listener()
    if not started:
        # This should rarely happen now with automatic cleanup
        unreal.log_warning("UEMCP: Could not start listener")
        unreal.log("UEMCP: Check the output log for details")
    
    if started:
        # Success - show status
        unreal.log("UEMCP: Ready on http://localhost:8765")
        unreal.log("UEMCP: Python console: start_listener(), stop_listener(), restart_listener(), reload_uemcp(), status()")
        unreal.log("UEMCP: MCP tools: project_info, asset_list, asset_info, actor_spawn, actor_delete, actor_modify")
        unreal.log("UEMCP:           level_actors, level_save, viewport_screenshot, viewport_camera, viewport_mode, viewport_focus")
        unreal.log("UEMCP:           viewport_render_mode (wireframe, unlit, lit, etc.), python_proxy (full API access)")
    
    # Import helper functions
    import uemcp_helpers
    # Make helper functions available globally
    from uemcp_helpers import restart_listener, reload_uemcp, status
    from uemcp_listener_fixed import start_listener, stop_listener
        
except ImportError as e:
    unreal.log_error(f"UEMCP: Could not import module: {e}")
except Exception as e:
    unreal.log_error(f"UEMCP: Startup error: {e}")