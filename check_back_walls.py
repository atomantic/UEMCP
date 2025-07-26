#!/usr/bin/env python3
"""
Script to check back wall positions and rotations
Run this in Unreal Engine's Python console
"""

import unreal

print("=== Checking Back Wall Positions ===")

# Get all actors
editor_actor_utils = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
all_actors = editor_actor_utils.get_all_level_actors()

# Find back wall actors
back_wall_actors = []
for actor in all_actors:
    name = actor.get_actor_label()
    if 'Back_Wall' in name or name == 'Corner_Back_Left' or name == 'Corner_Back_Right':
        location = actor.get_actor_location()
        rotation = actor.get_actor_rotation()
        back_wall_actors.append({
            'name': name,
            'location': f"[{location.x:.0f}, {location.y:.0f}, {location.z:.0f}]",
            'rotation': f"[{rotation.pitch:.0f}, {rotation.yaw:.0f}, {rotation.roll:.0f}]"
        })

# Sort by name
back_wall_actors.sort(key=lambda x: x['name'])

# Print info
for actor in back_wall_actors:
    print(f"{actor['name']}:")
    print(f"  Location: {actor['location']}")
    print(f"  Rotation: {actor['rotation']}")

# Also check some reference walls
print("\n=== Reference Wall Positions (for comparison) ===")
ref_walls = ['Wall_Side_Left_1', 'Wall_Side_Right_1', 'Corner_Front_Left']
for actor in all_actors:
    name = actor.get_actor_label()
    if name in ref_walls:
        location = actor.get_actor_location()
        rotation = actor.get_actor_rotation()
        print(f"{name}:")
        print(f"  Location: [{location.x:.0f}, {location.y:.0f}, {location.z:.0f}]")
        print(f"  Rotation: [{rotation.pitch:.0f}, {rotation.yaw:.0f}, {rotation.roll:.0f}]")

print("\n=== Done ===")