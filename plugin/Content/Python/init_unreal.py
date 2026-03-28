"""
UEMCP Auto-startup Script
This script is automatically executed when the plugin loads
"""

import os
import sys

import unreal

# Add this plugin's Python directory to path
plugin_python_path = os.path.dirname(os.path.abspath(__file__))
if plugin_python_path not in sys.path:
    sys.path.append(plugin_python_path)

try:
    # Import listener module
    import uemcp_listener

    # Also check if port is in use from a crashed session
    from utils import is_port_in_use

    def _deferred_startup(delta_time):
        """Deferred startup to avoid blocking the UE main thread."""
        if hasattr(_deferred_startup, "_handle"):
            unreal.unregister_slate_post_tick_callback(_deferred_startup._handle)

        # Stop any listener already running in this process (e.g. from a previous
        # hot-reload).  stop_listener() waits for the server thread to exit cleanly;
        # as a last resort it calls force_free_port_silent, which kills any process
        # holding the port — including the Unreal Editor itself if the thread hangs.
        if uemcp_listener.server_running:
            unreal.log("UEMCP: Stopping previous listener...")
            uemcp_listener.stop_listener()
        elif is_port_in_use(8765):
            # Port is held by an unknown (likely crashed) process from a previous
            # session.  Killing it risks terminating the editor; skip automatic
            # cleanup and let the user decide.
            unreal.log_warning(
                "UEMCP: Port 8765 is already in use by an external process; "
                "listener will not start automatically. "
                "Close the process and call start_listener() manually."
            )
            return

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

    # Schedule startup on next Slate tick to avoid blocking UE main thread
    _deferred_startup._handle = unreal.register_slate_post_tick_callback(_deferred_startup)

    # Import helper functions for convenience (made available to Python console)
    from uemcp_helpers import reload_uemcp, restart_listener, start_listener, status, stop_listener  # noqa: F401

except ImportError as e:
    unreal.log_error(f"UEMCP: Could not import module: {e}")
except Exception as e:
    unreal.log_error(f"UEMCP: Startup error: {e}")
