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

try:
    # Import listener module
    import uemcp_listener_fixed
    
    # Check if a listener is already running (from previous session)
    if uemcp_listener_fixed.server_running:
        uemcp_listener_fixed.stop_listener()
        import time
        time.sleep(1)  # Give it time to clean up
    
    # Try to start the listener
    if uemcp_listener_fixed.start_listener():
        unreal.log("="*60)
        unreal.log("UEMCP: Ready on http://localhost:8765")
        unreal.log("UEMCP: Commands: status(), restart_listener(), stop_listener()")
        unreal.log("="*60)
    else:
        unreal.log_warning("UEMCP: Could not start - port may be in use")
        unreal.log("UEMCP: Run 'stop_listener()' then 'start_listener()'")
    
    # Import helper functions
    import uemcp_helpers
    # Make helper functions available globally
    from uemcp_helpers import restart_listener, reload_uemcp, status
        
except ImportError as e:
    unreal.log_error(f"UEMCP: Could not import module: {e}")
except Exception as e:
    unreal.log_error(f"UEMCP: Startup error: {e}")