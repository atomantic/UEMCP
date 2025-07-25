"""
UEMCP Helper Functions
Convenient functions for managing the UEMCP listener
"""

import unreal
import sys
import os
import importlib

def restart_listener():
    """Restart the UEMCP listener to pick up code changes"""
    try:
        import time
        import socket
        
        # First, stop the existing listener if running
        import uemcp_listener_fixed
        if hasattr(uemcp_listener_fixed, 'stop_listener'):
            if uemcp_listener_fixed.server_running:
                unreal.log("UEMCP: Stopping existing listener...")
                uemcp_listener_fixed.stop_listener()
        
        # Wait for the port to be freed
        port_free = False
        max_attempts = 10
        for i in range(max_attempts):
            try:
                # Try to bind to the port to check if it's free
                test_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                try:
                    test_socket.bind(('localhost', 8765))
                    port_free = True
                except:
                    pass
                finally:
                    # Always close the socket to prevent resource warnings
                    test_socket.close()
                
                if port_free:
                    break
            except:
                # Port still in use, wait a bit more
                time.sleep(0.5)
        
        if not port_free:
            # Force free the port if needed
            try:
                import uemcp_port_utils
                uemcp_port_utils.force_free_port(8765)
                time.sleep(0.5)
            except:
                unreal.log_warning("UEMCP: Could not force free port 8765")
        
        # Reload the module to pick up changes
        unreal.log("UEMCP: Reloading listener module...")
        importlib.reload(uemcp_listener_fixed)
        
        # Start the listener again
        unreal.log("UEMCP: Starting listener...")
        if uemcp_listener_fixed.start_listener():
            unreal.log("UEMCP: ✓ Listener restarted successfully!")
            return True
        else:
            unreal.log_error("UEMCP: Failed to restart listener")
            return False
            
    except Exception as e:
        unreal.log_error(f"UEMCP: Error restarting listener: {e}")
        return False

def reload_uemcp():
    """Alias for restart_listener"""
    return restart_listener()

def status():
    """Check UEMCP listener status"""
    try:
        import uemcp_listener_fixed
        if uemcp_listener_fixed.server_running:
            unreal.log("UEMCP: Listener is RUNNING on http://localhost:8765")
            unreal.log("Commands: restart_listener(), stop_listener(), status()")
        else:
            unreal.log("UEMCP: Listener is STOPPED")
            unreal.log("Run: start_listener() to start")
    except:
        unreal.log("UEMCP: Listener module not loaded")
        unreal.log("Run: import uemcp_listener_fixed")

# Print available commands
print("\n" + "="*50)
print("UEMCP Helper Functions Loaded")
print("="*50)
print("\nAvailable commands:")
print("  restart_listener() - Restart the listener (picks up code changes)")
print("  reload_uemcp()     - Alias for restart_listener()")
print("  status()           - Check listener status")
print("  stop_listener()    - Stop the listener")
print("  start_listener()   - Start the listener")
print("="*50)