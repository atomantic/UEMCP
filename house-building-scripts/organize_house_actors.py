#!/usr/bin/env python3
"""
Script to organize all house actors into Estate/House folder
Run this in Unreal Engine's Python console
"""

import unreal

print("=== Organizing House Actors ===")

# Get all actors
editor_actor_utils = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
all_actors = editor_actor_utils.get_all_level_actors()

# Find all house-related actors
house_patterns = ['Wall_', 'Corner_', 'Door', 'HouseFoundation', 'Back_Wall']
house_actors = []

for actor in all_actors:
    actor_name = actor.get_actor_label()
    for pattern in house_patterns:
        if pattern in actor_name:
            house_actors.append(actor_name)
            # Set the folder path
            actor.set_folder_path('Estate/House')
            break

print(f"✓ Organized {len(house_actors)} actors into Estate/House folder:")
for name in sorted(house_actors):
    print(f"  - {name}")

print("\n=== Done ===")