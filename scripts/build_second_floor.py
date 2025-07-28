#!/usr/bin/env python3
"""Build the second floor of the house in HomeWorld"""

import requests
import json
import time

# Python listener endpoint
BASE_URL = "http://localhost:8765"

def execute_command(command_type, params):
    """Execute a command via the Python listener"""
    payload = {
        "type": command_type,
        "params": params
    }
    
    try:
        response = requests.post(BASE_URL, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error executing {command_type}: {e}")
        return None

def main():
    # First, restart the listener to apply rotation fixes
    print("Restarting listener to apply rotation fixes...")
    result = execute_command("python.execute", {
        "code": """
from uemcp_helpers import restart_listener
restart_listener()
"""
    })
    
    # Wait for listener to restart
    time.sleep(3)
    
    # Check available floor assets
    print("\nChecking available floor assets...")
    result = execute_command("asset.list", {
        "path": "/Game/ModularOldTown/Meshes",
        "filter": "SM_Floor",
        "limit": 10
    })
    
    if result and result.get('success'):
        print(f"Found {result.get('totalCount', 0)} floor assets")
        for asset in result.get('assets', []):
            print(f"  - {asset['name']}")
    
    # Get floor asset dimensions
    print("\nGetting floor tile dimensions...")
    floor_2m_info = execute_command("asset.info", {
        "assetPath": "/Game/ModularOldTown/Meshes/SM_Floor_2m"
    })
    
    floor_1m_info = execute_command("asset.info", {
        "assetPath": "/Game/ModularOldTown/Meshes/SM_Floor_1m"
    })
    
    # Calculate floor layout
    # House is 10m x 8m (1000cm x 800cm)
    # Using 2m tiles: 5 tiles x 4 tiles = 20 tiles total
    # Z position for second floor: 392
    
    print("\nPlacing second floor tiles...")
    tile_count = 0
    
    # Place 2m floor tiles in a 5x4 grid
    for row in range(4):  # 4 rows (800cm / 200cm)
        for col in range(5):  # 5 columns (1000cm / 200cm)
            x = 10260 + (col * 200)  # Start at 10260 (west edge)
            y = 290 + (row * 200)    # Start at 290 (north edge)
            z = 392                   # Second floor height
            
            actor_name = f"Floor_F2_{row}_{col}"
            
            result = execute_command("actor.spawn", {
                "assetPath": "/Game/ModularOldTown/Meshes/SM_Floor_2m",
                "location": [x, y, z],
                "rotation": [0, 0, 0],
                "scale": [1, 1, 1],
                "actorName": actor_name,
                "folderPath": "Estate/House/SecondFloor/Floor"
            })
            
            if result and result.get('success'):
                tile_count += 1
                print(f"  Placed {actor_name} at [{x}, {y}, {z}]")
    
    print(f"\nPlaced {tile_count} floor tiles")
    
    # Now place corner pieces for second floor walls
    print("\nPlacing second floor corner pieces...")
    
    corners = [
        {"name": "Corner_F2_NW", "location": [10260, 290, 392], "rotation": [0, 0, 0]},
        {"name": "Corner_F2_NE", "location": [10260, 1090, 392], "rotation": [0, 0, 90]},
        {"name": "Corner_F2_SE", "location": [11260, 1090, 392], "rotation": [0, 0, 180]},
        {"name": "Corner_F2_SW", "location": [11260, 290, 392], "rotation": [0, 0, 270]}
    ]
    
    for corner in corners:
        result = execute_command("actor.spawn", {
            "assetPath": "/Game/ModularOldTown/Meshes/SM_SimpleCorner_A",
            "location": corner["location"],
            "rotation": corner["rotation"],
            "scale": [1, 1, 1],
            "actorName": corner["name"],
            "folderPath": "Estate/House/SecondFloor/Walls"
        })
        
        if result and result.get('success'):
            print(f"  Placed {corner['name']}")
    
    # Place second floor walls with windows
    print("\nPlacing second floor walls...")
    
    # North wall (3 sections with windows)
    for i in range(3):
        x = 10260
        y = 390 + (i * 300)  # Start at 390, space by 300
        
        result = execute_command("actor.spawn", {
            "assetPath": "/Game/ModularOldTown/Meshes/SM_FlatWall_3m_SquareWin",
            "location": [x, y, 392],
            "rotation": [0, 0, 270],  # Face south into building
            "scale": [1, 1, 1],
            "actorName": f"Wall_F2_North_{i+1}",
            "folderPath": "Estate/House/SecondFloor/Walls"
        })
    
    # South wall (2 sections with windows, leaving space for potential balcony)
    for i in range(2):
        x = 11260
        y = 390 + (i * 300)
        
        result = execute_command("actor.spawn", {
            "assetPath": "/Game/ModularOldTown/Meshes/SM_FlatWall_3m_SquareWin",
            "location": [x, y, 392],
            "rotation": [0, 0, 90],  # Face north into building
            "scale": [1, 1, 1],
            "actorName": f"Wall_F2_South_{i+1}",
            "folderPath": "Estate/House/SecondFloor/Walls"
        })
    
    # East wall (2 sections with mix of 2m and 3m)
    result = execute_command("actor.spawn", {
        "assetPath": "/Game/ModularOldTown/Meshes/SM_FlatWall_3m_SquareWin",
        "location": [10560, 1090, 392],
        "rotation": [0, 0, 180],  # Face west into building
        "scale": [1, 1, 1],
        "actorName": "Wall_F2_East_1",
        "folderPath": "Estate/House/SecondFloor/Walls"
    })
    
    result = execute_command("actor.spawn", {
        "assetPath": "/Game/ModularOldTown/Meshes/SM_FlatWall_2m_SquareWin",
        "location": [10860, 1090, 392],
        "rotation": [0, 0, 180],  # Face west into building
        "scale": [1, 1, 1],
        "actorName": "Wall_F2_East_2",
        "folderPath": "Estate/House/SecondFloor/Walls"
    })
    
    # West wall (similar to east)
    result = execute_command("actor.spawn", {
        "assetPath": "/Game/ModularOldTown/Meshes/SM_FlatWall_3m_SquareWin",
        "location": [10560, 290, 392],
        "rotation": [0, 0, 0],  # Face east into building
        "scale": [1, 1, 1],
        "actorName": "Wall_F2_West_1",
        "folderPath": "Estate/House/SecondFloor/Walls"
    })
    
    result = execute_command("actor.spawn", {
        "assetPath": "/Game/ModularOldTown/Meshes/SM_FlatWall_2m_SquareWin",
        "location": [10860, 290, 392],
        "rotation": [0, 0, 0],  # Face east into building
        "scale": [1, 1, 1],
        "actorName": "Wall_F2_West_2",
        "folderPath": "Estate/House/SecondFloor/Walls"
    })
    
    # Check for balcony asset
    print("\nChecking for balcony assets...")
    result = execute_command("asset.list", {
        "path": "/Game/ModularOldTown/Meshes",
        "filter": "Balcony",
        "limit": 5
    })
    
    if result and result.get('totalCount', 0) > 0:
        print("Found balcony assets, placing on south side...")
        # Place balcony on south side
        result = execute_command("actor.spawn", {
            "assetPath": "/Game/ModularOldTown/Meshes/SM_SimpleBalcony_A",
            "location": [11260, 690, 392],  # Center of south wall
            "rotation": [0, 0, 90],  # Face outward (south)
            "scale": [1, 1, 1],
            "actorName": "Balcony_F2_South",
            "folderPath": "Estate/House/SecondFloor/Details"
        })
    
    # Take screenshots to verify
    print("\nTaking verification screenshots...")
    
    # Perspective view
    execute_command("viewport.camera", {
        "location": [9500, 1500, 900],
        "rotation": [-30, -45, 0]
    })
    execute_command("viewport.screenshot", {
        "filename": "house_second_floor_perspective.png"
    })
    
    # Top view
    execute_command("viewport.mode", {"mode": "top"})
    execute_command("viewport.camera", {
        "location": [10760, 690, 1500],
        "rotation": [-90, 0, 0]
    })
    execute_command("viewport.screenshot", {
        "filename": "house_second_floor_top.png"
    })
    
    # Wireframe view
    execute_command("viewport.render_mode", {"mode": "wireframe"})
    execute_command("viewport.screenshot", {
        "filename": "house_second_floor_wireframe.png"
    })
    
    # Save level
    print("\nSaving level...")
    execute_command("level.save", {})
    
    print("\nSecond floor construction complete!")

if __name__ == "__main__":
    main()