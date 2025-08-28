"""
UEMCP Helper Functions
Convenient functions for managing the UEMCP listener
"""

import unreal
import sys
# import importlib
import time
import os


def restart_listener():
    """Restart the listener using safe scheduled restart"""
    try:
        import uemcp_listener

        # Check if running
        if hasattr(uemcp_listener, "server_running") and uemcp_listener.server_running:
            # Use the safer scheduled restart from uemcp_listener
            if hasattr(uemcp_listener, "restart_listener"):
                return uemcp_listener.restart_listener()
            else:
                unreal.log_error("UEMCP: restart_listener function not found in module")
                return False
        else:
            # Not running, just start it
            unreal.log("UEMCP: Listener not running, starting fresh...")
            return uemcp_listener.start_listener()

    except Exception as e:
        unreal.log_error(f"UEMCP: Error in restart: {e}")
        import traceback

        unreal.log_error(traceback.format_exc())
        return False


def reload_uemcp():
    """Alias for restart_listener"""
    return restart_listener()


def status():
    """Check UEMCP listener status"""
    try:
        import uemcp_listener

        if hasattr(uemcp_listener, "server_running") and uemcp_listener.server_running:
            unreal.log("UEMCP: Listener is RUNNING on http://localhost:8765")
            unreal.log("UEMCP: Commands: restart_listener(), stop_listener(), status()")
        else:
            unreal.log("UEMCP: Listener is STOPPED")
            unreal.log("UEMCP: Run: start_listener() to start")
    except ImportError:
        unreal.log("UEMCP: Listener module not loaded")
        unreal.log("UEMCP: Run: import uemcp_listener")


def start_listener():
    """Start the listener"""
    try:
        # First ensure port is free
        force_kill_port()
        time.sleep(0.5)

        import uemcp_listener

        return uemcp_listener.start_listener()
    except Exception as e:
        unreal.log_error(f"UEMCP: Error starting listener: {e}")
        return False


def stop_listener():
    """Stop the listener properly"""
    try:
        import uemcp_listener

        # Call the actual stop function
        if hasattr(uemcp_listener, "stop_listener"):
            return uemcp_listener.stop_listener()
        else:
            unreal.log("UEMCP: Listener module not loaded properly")
            return False
    except Exception as e:
        unreal.log_error(f"UEMCP: Error stopping listener: {e}")
        return False


def force_kill_port():
    """Force kill any process on port 8765"""
    try:
        if sys.platform == "darwin":  # macOS
            result = os.system("lsof -ti:8765 | xargs kill -9 2>/dev/null")
            if result == 0:
                unreal.log("UEMCP: Killed processes on port 8765")
            else:
                unreal.log("UEMCP: No processes found on port 8765")
        elif sys.platform == "win32":  # Windows
            os.system("FOR /F \"tokens=5\" %P IN ('netstat -ano ^| findstr :8765') DO TaskKill /F /PID %P")
        return True
    except Exception as e:
        unreal.log_error(f"UEMCP: Error killing port: {e}")
        return False


# Module info - minimal output when imported
pass
