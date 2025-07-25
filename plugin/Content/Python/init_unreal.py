"""
UEMCP Auto-startup Script
This script is automatically executed when the plugin loads
"""

import unreal
import sys
import os

# Add this plugin's Python directory to path
plugin_python_path = os.path.dirname(os.path.abspath(__file__))
if plugin_python_path not in sys.path:
    sys.path.append(plugin_python_path)

unreal.log("="*60)
unreal.log("UEMCP: Initializing...")
unreal.log("="*60)

try:
    # Import listener module
    import uemcp_listener_fixed
    
    # Check if a listener is already running (from previous session)
    if uemcp_listener_fixed.server_running:
        unreal.log("UEMCP: Listener already marked as running, stopping first...")
        uemcp_listener_fixed.stop_listener()
        import time
        time.sleep(1)  # Give it time to clean up
    
    # Try to start the listener
    unreal.log("UEMCP: Starting HTTP listener...")
    if uemcp_listener_fixed.start_listener():
        unreal.log("UEMCP: ✓ Listener started successfully on http://localhost:8765")
    else:
        unreal.log_warning("UEMCP: Could not start listener - port may be in use")
        unreal.log("UEMCP: You can manually run 'stop_listener()' then 'start_listener()' in the Python console")
    
    # Import helper functions
    import uemcp_helpers
    # Make helper functions available globally
    from uemcp_helpers import restart_listener, reload_uemcp, status
    
    unreal.log("UEMCP: Helper functions loaded - use restart_listener() to reload changes")
        
except ImportError as e:
    unreal.log_error(f"UEMCP: Could not import listener module: {e}")
except Exception as e:
    unreal.log_error(f"UEMCP: Startup error: {e}")

unreal.log("UEMCP: Initialization complete")
unreal.log("="*60)