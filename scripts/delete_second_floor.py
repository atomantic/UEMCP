#!/usr/bin/env python3
"""Delete all second floor assets from the house in HomeWorld"""

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
    print("Deleting all second floor assets...")
    
    # First, get all actors in the level to identify second floor assets
    print("\nFinding all second floor actors...")
    
    result = execute_command("python.execute", {
        "code": """
import unreal

# Get all actors in the level
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find actors that might be second floor related
second_floor_actors = []

for actor in all_actors:
    actor_name = actor.get_actor_label()
    
    # Check if actor has "F2" in the name
    if "F2" in actor_name:
        second_floor_actors.append((actor_name, actor))
        continue
    
    # Check folder path for "SecondFloor"
    folder_path = actor.get_folder_path()
    if "SecondFloor" in folder_path:
        second_floor_actors.append((actor_name, actor))

# Print results
print(f"Found {len(second_floor_actors)} second floor actors to delete:")
for actor_name, _ in sorted(second_floor_actors):
    print(f"  - {actor_name}")

# Return the count
len(second_floor_actors)
"""
    })
    
    if result and result.get('success'):
        actor_count = result.get('result', 0)
        print(f"\nTotal actors found: {actor_count}")
    
    # Now delete all second floor actors
    print("\nDeleting second floor actors...")
    
    result = execute_command("python.execute", {
        "code": """
import unreal

# Get all actors in the level
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find and delete second floor actors
deleted_count = 0
deleted_names = []

for actor in all_actors:
    actor_name = actor.get_actor_label()
    folder_path = actor.get_folder_path()
    
    # Check if this is a second floor actor
    should_delete = False
    
    if "F2" in actor_name:
        should_delete = True
    elif "SecondFloor" in folder_path:
        should_delete = True
    
    if should_delete:
        try:
            # Delete the actor
            unreal.EditorLevelLibrary.destroy_actor(actor)
            deleted_count += 1
            deleted_names.append(actor_name)
            print(f"  Deleted: {actor_name}")
        except Exception as e:
            print(f"  Failed to delete {actor_name}: {e}")

print(f"\\nDeleted {deleted_count} actors total")

# Return the count
deleted_count
"""
    })
    
    if result and result.get('success'):
        deleted_count = result.get('result', 0)
        print(f"\nSuccessfully deleted {deleted_count} second floor actors")
    
    # Take a screenshot to verify
    print("\nTaking verification screenshot...")
    
    # Set camera to perspective view
    execute_command("viewport.camera", {
        "location": [9500, 1500, 600],
        "rotation": [-20, -45, 0]
    })
    
    execute_command("viewport.screenshot", {
        "filename": "house_after_second_floor_deletion.png"
    })
    
    # Save the level
    print("\nSaving level...")
    execute_command("level.save", {})
    
    print("\nSecond floor deletion complete!")

if __name__ == "__main__":
    main()