"""
UEMCP Helper Functions
Convenient functions for managing the UEMCP listener
"""

import unreal


def restart_listener():
    """Restart the listener."""
    try:
        import uemcp_listener

        return uemcp_listener.restart_listener()
    except Exception as e:
        unreal.log_error(f"UEMCP: Error restarting listener: {e}")
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
    """Start the listener."""
    try:
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


# Module info - minimal output when imported
pass
