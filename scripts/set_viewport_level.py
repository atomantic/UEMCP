#!/usr/bin/env python3
"""
Direct script to level the viewport in UE 5.6
Run this in Unreal Engine's Python console
"""

import unreal

print("=== Setting Level Viewport ===")

# Try Method 1: Using EditorLevelLibrary (even if deprecated)
try:
    unreal.EditorLevelLibrary.set_level_viewport_camera_info(
        unreal.Vector(600, -1200, 800),  # Location
        unreal.Rotator(0, 0, 0)          # Rotation (level horizon)
    )
    print("✓ Method 1: EditorLevelLibrary worked!")
except Exception as e:
    print(f"✗ Method 1 failed: {e}")

# Try Method 2: Get viewport and set directly
try:
    # Get the active level viewport
    level_editor = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    
    # Try to pilot the active level viewport
    level_editor.pilot_level_actor(None)  # Clear any pilot
    
    # Get current viewport info
    viewport_info = level_editor.get_level_viewport_camera_info()
    print(f"Current camera location: {viewport_info.camera_location}")
    print(f"Current camera rotation: {viewport_info.camera_rotation}")
    
    print("✓ Method 2: Got viewport info")
except Exception as e:
    print(f"✗ Method 2 failed: {e}")

# Try Method 3: Using editor viewport utilities
try:
    # Get all viewports
    viewports = unreal.UnrealEditorSubsystem.get_all_level_editors_viewports()
    if viewports:
        viewport = viewports[0]
        # Set camera transform
        viewport.set_view_location(unreal.Vector(600, -1200, 800))
        viewport.set_view_rotation(unreal.Rotator(0, 0, 0))
        print("✓ Method 3: Direct viewport access worked!")
except Exception as e:
    print(f"✗ Method 3 failed: {e}")

print("\n=== Done ===")