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
    # Import and start the listener
    import uemcp_listener_fixed
    
    if not uemcp_listener_fixed.server_running:
        unreal.log("UEMCP: Starting HTTP listener...")
        if uemcp_listener_fixed.start_listener():
            unreal.log("UEMCP: ✓ Listener started successfully on http://localhost:8765")
        else:
            unreal.log_error("UEMCP: Failed to start listener")
    else:
        unreal.log("UEMCP: Listener already running")
        
except ImportError as e:
    unreal.log_error(f"UEMCP: Could not import listener module: {e}")
except Exception as e:
    unreal.log_error(f"UEMCP: Startup error: {e}")

unreal.log("UEMCP: Initialization complete")
unreal.log("="*60)