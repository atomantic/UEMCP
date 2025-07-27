#!/usr/bin/env python3
"""
Force cleanup for stuck UEMCP listener
"""

import unreal
import sys
import os
import time
import subprocess

def force_cleanup():
    """Aggressively clean up any stuck listener processes"""
    unreal.log("=== UEMCP Force Cleanup ===")
    
    # Step 1: Signal any running listener to stop
    if 'uemcp_listener' in sys.modules:
        mod = sys.modules['uemcp_listener']
        if hasattr(mod, 'server_running'):
            mod.server_running = False
        if hasattr(mod, 'httpd') and mod.httpd:
            try:
                mod.httpd.server_close()
            except:
                pass
        unreal.log("✓ Signaled listener to stop")
    
    # Step 2: Force kill any process on port 8765
    try:
        if sys.platform == "darwin":  # macOS
            # Get PIDs
            result = subprocess.run(['lsof', '-ti:8765'], capture_output=True, text=True)
            if result.stdout:
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    if pid:
                        subprocess.run(['kill', '-9', pid])
                        unreal.log(f"✓ Killed process {pid}")
                time.sleep(1)
            else:
                unreal.log("✓ No processes found on port 8765")
    except Exception as e:
        unreal.log_error(f"Error killing processes: {e}")
    
    # Step 3: Remove module from sys.modules
    if 'uemcp_listener' in sys.modules:
        del sys.modules['uemcp_listener']
        unreal.log("✓ Removed module from cache")
    
    unreal.log("=== Cleanup Complete ===")
    unreal.log("You can now run: import uemcp_listener; uemcp_listener.start_listener()")

if __name__ == "__main__":
    force_cleanup()