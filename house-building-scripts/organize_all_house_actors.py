#!/usr/bin/env python3
"""
Script to organize all house actors into Estate/House folder
Run this in Unreal Engine's Python console
"""

import unreal

print("=== Organizing All House Actors ===")

# Get all actors
editor_actor_utils = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
all_actors = editor_actor_utils.get_all_level_actors()

# Define patterns for house-related actors
house_patterns = [
    'Wall_',          # All wall pieces
    'Corner_',        # Corner pieces
    'Back_Wall',      # Back wall pieces
    'Door',           # Door
    'HouseFoundation' # Foundation
]

# Find and organize actors
organized_actors = []
for actor in all_actors:
    actor_name = actor.get_actor_label()
    for pattern in house_patterns:
        if pattern in actor_name:
            actor.set_folder_path('Estate/House')
            organized_actors.append(actor_name)
            break

# Sort for better display
organized_actors.sort()

# Print results
print(f"\n✓ Organized {len(organized_actors)} actors into Estate/House folder:")
print("\nWalls and Corners:")
for name in organized_actors:
    if 'Wall' in name or 'Corner' in name:
        print(f"  • {name}")

print("\nOther House Components:")
for name in organized_actors:
    if 'Wall' not in name and 'Corner' not in name:
        print(f"  • {name}")

print("\n=== Done ===")
print("All house components are now organized in the Estate/House folder!")