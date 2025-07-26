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
    unreal.log(f"UEMCP: Cleaning up {len(_all_server_threads)} threads and {len(_all_httpd_servers)} servers")
    
    # Just close sockets, don't call shutdown() which blocks
    for httpd in _all_httpd_servers:
        try:
            httpd.server_close()
        except:
            pass
    _all_httpd_servers.clear()
    
    # Wait briefly for threads to finish
    for thread in _all_server_threads:
        if thread.is_alive():
            thread.join(timeout=0.5)
    _all_server_threads.clear()
    
    unreal.log("UEMCP: Cleanup complete")