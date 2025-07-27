#!/usr/bin/env python3
"""
Simple startup script for UEMCP listener
Safe to run when opening Unreal project
"""

import unreal

try:
    # Check if already running
    import uemcp_listener
    if hasattr(uemcp_listener, 'server_running') and uemcp_listener.server_running:
        unreal.log("UEMCP: Listener is already running on http://localhost:8765")
    else:
        # Start the listener
        if uemcp_listener.start_listener():
            unreal.log("UEMCP: ✓ Listener started on http://localhost:8765")
        else:
            unreal.log_error("UEMCP: Failed to start listener")
except ImportError:
    # First time loading
    import uemcp_listener
    if uemcp_listener.start_listener():
        unreal.log("UEMCP: ✓ Listener started on http://localhost:8765")
    else:
        unreal.log_error("UEMCP: Failed to start listener")
except Exception as e:
    unreal.log_error(f"UEMCP: Error starting listener: {e}")

# Show available commands
unreal.log("UEMCP: For helper functions run: from uemcp_helpers import *")