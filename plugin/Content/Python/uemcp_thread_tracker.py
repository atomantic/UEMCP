"""
Global thread tracker for UEMCP
This module persists across reloads to track all server threads
"""

import threading
import unreal

# Global storage that persists across module reloads
_all_server_threads = []
_all_httpd_servers = []

def add_server_thread(thread):
    """Add a server thread to track"""
    _all_server_threads.append(thread)
    # Clean up dead threads
    _all_server_threads[:] = [t for t in _all_server_threads if t.is_alive()]

def add_httpd_server(httpd):
    """Add an httpd server to track"""
    _all_httpd_servers.append(httpd)

def cleanup_all():
    """Clean up all tracked threads and servers"""
    global _all_server_threads
    
    unreal.log(f"UEMCP: Cleaning up {len(_all_server_threads)} threads and {len(_all_httpd_servers)} servers")
    
    # Force close all server sockets
    for httpd in _all_httpd_servers:
        try:
            # Close the socket immediately
            if hasattr(httpd, 'socket'):
                httpd.socket.close()
            httpd.server_close()
        except:
            pass
    
    # Clear the list
    _all_httpd_servers.clear()
    
    # Don't wait for threads - they'll die when sockets close
    dead_threads = []
    for thread in _all_server_threads:
        if not thread.is_alive():
            dead_threads.append(thread)
    
    # Only keep alive threads (should be none after socket close)
    _all_server_threads = [t for t in _all_server_threads if t.is_alive()]
    
    if _all_server_threads:
        unreal.log_warning(f"UEMCP: {len(_all_server_threads)} threads still alive after cleanup")
    
    unreal.log("UEMCP: Cleanup complete")