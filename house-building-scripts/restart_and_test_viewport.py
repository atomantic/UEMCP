#!/usr/bin/env python3
"""Restart the listener and test viewport commands."""

import json
import urllib.request
import urllib.error
import time

LISTENER_URL = "http://localhost:8765"

def send_command(cmd_type, params, description):
    """Send a command and return the result."""
    print(f"\n{description}")
    print(f"Command: {cmd_type}")
    
    try:
        payload = {
            "type": cmd_type,
            "params": params
        }
        
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(LISTENER_URL, data=data, headers={'Content-Type': 'application/json'})
        
        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                result = json.loads(response.read().decode('utf-8'))
                if result.get('success'):
                    print(f"✓ Success")
                else:
                    print(f"✗ Failed: {result.get('error', 'Unknown error')}")
                return result
            else:
                print(f"✗ HTTP Error {response.status}")
                return None
    except urllib.error.URLError as e:
        print("✗ Could not connect to listener")
        return None
    except Exception as e:
        print(f"✗ Error: {type(e).__name__}: {e}")
        return None

def main():
    print("Restarting listener and testing viewport commands")
    print("="*50)
    
    # First restart the listener to pick up our code changes
    print("\n1. Restarting the listener...")
    result = send_command("system.restart", {}, "Restarting Python listener")
    
    if not result or not result.get('success'):
        print("\nFailed to restart listener. Please restart it manually in UE console:")
        print("from uemcp_helpers import *")
        print("restart_listener()")
        return
    
    # Wait for listener to restart
    print("Waiting for listener to restart...")
    time.sleep(5)
    
    # Test connection
    print("\n2. Testing connection...")
    try:
        with urllib.request.urlopen(LISTENER_URL, timeout=5) as response:
            if response.status == 200:
                print("✓ Listener is running")
            else:
                print("✗ Listener returned unexpected status")
                return
    except:
        print("✗ Could not connect to listener after restart")
        return
    
    # Now test viewport commands
    print("\n3. Testing viewport commands...")
    
    # Test viewport camera
    send_command(
        "viewport.camera",
        {"location": [0, 0, 1000], "rotation": [-30, 0, 0]},
        "Setting camera position"
    )
    time.sleep(1)
    
    # Test viewport mode - perspective
    send_command(
        "viewport.mode",
        {"mode": "perspective"},
        "Switching to perspective view"
    )
    time.sleep(1)
    
    # Test viewport render mode - wireframe
    send_command(
        "viewport.render_mode",
        {"mode": "wireframe"},
        "Switching to wireframe mode"
    )
    time.sleep(1)
    
    # Test viewport render mode - lit
    send_command(
        "viewport.render_mode",
        {"mode": "lit"},
        "Switching back to lit mode"
    )
    time.sleep(1)
    
    # Test viewport mode - top
    send_command(
        "viewport.mode",
        {"mode": "top"},
        "Switching to top view"
    )
    time.sleep(1)
    
    # Back to perspective
    send_command(
        "viewport.mode",
        {"mode": "perspective"},
        "Switching back to perspective"
    )
    
    print("\n" + "="*50)
    print("Testing complete!")
    print("\nNote: Check the UE viewport to see if the commands took effect.")
    print("Also check the UE log file for any errors:")
    print("/Users/antic/Library/Logs/Unreal Engine/HomeEditor/Home.log")

if __name__ == "__main__":
    main()