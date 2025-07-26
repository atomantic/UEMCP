#!/usr/bin/env python3
"""
Clean restart script for UEMCP listener
Run this in Unreal Engine's Python console
"""

import unreal
import time

print("=== UEMCP Clean Restart ===")

# Stop the listener if running
try:
    stop_listener()
    print("✓ Stopped existing listener")
except:
    print("- No listener was running")

# Force cleanup the port
try:
    import uemcp_port_utils
    if uemcp_port_utils.force_free_port_silent(8765):
        print("✓ Port 8765 cleaned up")
    else:
        print("! Port 8765 cleanup failed")
except Exception as e:
    print(f"! Error cleaning port: {e}")

# Wait a moment
time.sleep(2)

# Start fresh listener
try:
    start_listener()
    print("✓ Started new listener")
    print("=== Restart Complete ===")
except Exception as e:
    print(f"✗ Failed to start listener: {e}")
    print("Try running: start_listener() manually")