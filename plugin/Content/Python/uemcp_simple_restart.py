"""
Simple restart helper that works reliably
"""

import unreal
import sys
import time

def simple_restart():
    """Simple two-step restart process"""
    # Step 1: Stop the listener
    if 'uemcp_listener_fixed' in sys.modules:
        mod = sys.modules['uemcp_listener_fixed']
        if hasattr(mod, 'server_running') and mod.server_running:
            unreal.log("UEMCP: Stopping listener...")
            mod.server_running = False
            unreal.log("UEMCP: Listener will stop in a moment.")
            unreal.log("UEMCP: Wait 2 seconds, then run:")
            unreal.log("      import importlib; importlib.reload(uemcp_listener_fixed); uemcp_listener_fixed.start_listener()")
        else:
            unreal.log("UEMCP: Listener not running. To start:")
            unreal.log("      import uemcp_listener_fixed; uemcp_listener_fixed.start_listener()")
    else:
        unreal.log("UEMCP: Module not loaded. To start:")
        unreal.log("      import uemcp_listener_fixed; uemcp_listener_fixed.start_listener()")

if __name__ == "__main__":
    simple_restart()