"""
UEMCP Auto-startup Script
This script is automatically executed when the plugin loads
"""

import os
import sys
import time

import unreal

# Add this plugin's Python directory to path
plugin_python_path = os.path.dirname(os.path.abspath(__file__))
if plugin_python_path not in sys.path:
    sys.path.append(plugin_python_path)

try:
    # Import listener module
    import uemcp_listener

    # Check if a listener is already running (from previous session)
    if uemcp_listener.server_running:
        unreal.log("UEMCP: Stopping previous listener...")
        uemcp_listener.server_running = False
        time.sleep(1)  # Give it time to stop

    # Also check if port is in use from a crashed session
    from utils import force_free_port_silent, is_port_in_use

    if is_port_in_use(8765):
        unreal.log("UEMCP: Port 8765 in use from previous session, cleaning up...")
        force_free_port_silent(8765)
        time.sleep(1)

    # Try to start the listener
    started = uemcp_listener.start_listener()
    if not started:
        # This should rarely happen now with automatic cleanup
        unreal.log_warning("UEMCP: Could not start listener")
        unreal.log("UEMCP: Check the output log for details")

    if started:
        # Success - show status
        unreal.log("UEMCP: Ready on http://localhost:8765")
        unreal.log("UEMCP: Commands: from uemcp_helpers import *")
        unreal.log("UEMCP: Functions: restart_listener(), stop_listener(), status(), start_listener()")

    # Import helper functions for convenience (made available to Python console)
    from uemcp_helpers import reload_uemcp, restart_listener, start_listener, status, stop_listener  # noqa: F401

except ImportError as e:
    unreal.log_error(f"UEMCP: Could not import module: {e}")
except Exception as e:
    unreal.log_error(f"UEMCP: Startup error: {e}")
