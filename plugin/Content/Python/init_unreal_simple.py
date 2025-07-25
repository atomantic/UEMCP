"""
UEMCP Simple Auto-startup for Unreal Engine
Minimal version with better error handling
"""

import unreal
import sys
import os

# Add Python directory to path
content_python_path = unreal.Paths.project_content_dir() + "Python"
if content_python_path not in sys.path:
    sys.path.append(content_python_path)

try:
    # Try to import and start the fixed thread-safe listener
    import uemcp_listener_fixed
    
    # Check if already running
    if not uemcp_listener_fixed.server_running:
        unreal.log("UEMCP: Starting thread-safe listener on project load...")
        uemcp_listener_fixed.start_listener()
        unreal.log("UEMCP: Thread-safe listener started successfully!")
    else:
        unreal.log("UEMCP: Listener already running")
        
except ImportError as e:
    unreal.log_error(f"UEMCP: Could not import listener module: {e}")
except Exception as e:
    unreal.log_error(f"UEMCP: Failed to start: {e}")

# Log status
unreal.log("UEMCP: Auto-startup complete. Check Output Log for details.")