#!/usr/bin/env python3
"""Test viewport commands by making direct HTTP calls to the Python listener."""

import json
import urllib.request
import urllib.error
import time

LISTENER_URL = "http://localhost:8765"

def test_command(cmd_type, params, description):
    """Execute a command and print the result."""
    print(f"\n{'='*60}")
    print(f"Testing: {description}")
    print(f"Command: {cmd_type}")
    print(f"Params: {json.dumps(params, indent=2)}")
    print('-'*60)
    
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
                print(f"Success: {result.get('success', False)}")
                if result.get('success'):
                    print(f"Result: {json.dumps(result, indent=2)}")
                else:
                    print(f"Error: {result.get('error', 'Unknown error')}")
            else:
                print(f"HTTP Error {response.status}: {response.read().decode('utf-8')}")
            
    except urllib.error.URLError as e:
        print("ERROR: Could not connect to Python listener at http://localhost:8765")
        print("Make sure the listener is running in Unreal Engine")
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
    
    time.sleep(1)  # Brief pause between commands

def main():
    print("Testing Viewport Control Commands")
    print("=================================")
    
    # Test connection first
    try:
        with urllib.request.urlopen(LISTENER_URL, timeout=5) as response:
            if response.status == 200:
                print("✓ Python listener is running")
                status_text = response.read().decode('utf-8')
                print(f"Status: {status_text[:100]}...")
            else:
                print("✗ Python listener returned unexpected status")
                return
    except:
        print("✗ Could not connect to Python listener")
        print("Please ensure the listener is running in Unreal Engine")
        return
    
    # Test viewport camera
    test_command(
        "viewport.camera",
        {
            "location": [0, 0, 500],
            "rotation": [0, 0, 0]
        },
        "Set viewport camera to specific location and rotation"
    )
    
    # Test viewport mode - perspective
    test_command(
        "viewport.mode",
        {"mode": "perspective"},
        "Switch to perspective view"
    )
    
    # Test viewport mode - top
    test_command(
        "viewport.mode", 
        {"mode": "top"},
        "Switch to top orthographic view"
    )
    
    # Test viewport render mode - wireframe
    test_command(
        "viewport.render_mode",
        {"mode": "wireframe"},
        "Switch to wireframe rendering"
    )
    
    # Test viewport render mode - lit
    test_command(
        "viewport.render_mode",
        {"mode": "lit"},
        "Switch back to lit rendering"
    )
    
    # Test viewport camera with focus
    test_command(
        "viewport.camera",
        {
            "focusActor": "SM_Building_WallFloor_A_1",
            "distance": 1000
        },
        "Focus camera on specific actor"
    )

if __name__ == "__main__":
    main()