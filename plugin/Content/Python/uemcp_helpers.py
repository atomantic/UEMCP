"""
UEMCP Helper Functions
Convenient functions for managing the UEMCP listener
"""

import unreal
import sys
import importlib
import time
import os

def restart_listener():
    """Restart the listener - manual two-step process to prevent crashes"""
    try:
        # First, just stop the listener
        if stop_listener():
            unreal.log("UEMCP: Listener stopped.")
            unreal.log("UEMCP: To complete restart, run these commands:")
            unreal.log("UEMCP:   1. import importlib")
            unreal.log("UEMCP:   2. importlib.reload(uemcp_listener)")
            unreal.log("UEMCP:   3. uemcp_listener.start_listener()")
            return True
        else:
            # Not running, just start it
            unreal.log("UEMCP: Listener not running, starting fresh...")
            import uemcp_listener
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
        if hasattr(uemcp_listener, 'server_running') and uemcp_listener.server_running:
            unreal.log("UEMCP: Listener is RUNNING on http://localhost:8765")
            unreal.log("Commands: restart_listener(), stop_listener(), status()")
        else:
            unreal.log("UEMCP: Listener is STOPPED")
            unreal.log("Run: start_listener() to start")
    except ImportError:
        unreal.log("UEMCP: Listener module not loaded")
        unreal.log("Run: import uemcp_listener")

def start_listener():
    """Start the listener"""
    try:
        import uemcp_listener
        return uemcp_listener.start_listener()
    except Exception as e:
        unreal.log_error(f"UEMCP: Error starting listener: {e}")
        return False

def stop_listener():
    """Stop the listener (non-blocking)"""
    try:
        import uemcp_listener
        # Just set the flag
        if hasattr(uemcp_listener, 'server_running'):
            uemcp_listener.server_running = False
            unreal.log("UEMCP: Stop signal sent to listener")
            return True
        else:
            unreal.log("UEMCP: Listener not running")
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
            os.system('FOR /F "tokens=5" %P IN (\'netstat -ano ^| findstr :8765\') DO TaskKill /F /PID %P')
        return True
    except Exception as e:
        unreal.log_error(f"UEMCP: Error killing port: {e}")
        return False

# Module info - minimal output when imported
pass