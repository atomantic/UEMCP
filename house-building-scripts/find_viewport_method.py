#!/usr/bin/env python3
"""
Script to find the correct viewport camera method in UE 5.6
Run this in Unreal Engine's Python console
"""

import unreal

print("=== Finding Viewport Camera Methods ===")

# Method 1: Check LevelEditorSubsystem
level_editor = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
print("\n1. LevelEditorSubsystem methods:")
methods = [m for m in dir(level_editor) if 'viewport' in m.lower() or 'camera' in m.lower() or 'view' in m.lower()]
for m in methods:
    print(f"   - {m}")

# Method 2: Check EditorLevelLibrary (deprecated but might still work)
print("\n2. EditorLevelLibrary methods:")
try:
    lib_methods = [m for m in dir(unreal.EditorLevelLibrary) if 'viewport' in m.lower() or 'camera' in m.lower()]
    for m in lib_methods:
        print(f"   - {m}")
except:
    print("   EditorLevelLibrary not available")

# Method 3: Check UnrealEditorSubsystem
print("\n3. UnrealEditorSubsystem methods:")
try:
    ue_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
    ue_methods = [m for m in dir(ue_subsystem) if 'viewport' in m.lower() or 'camera' in m.lower() or 'view' in m.lower()]
    for m in ue_methods:
        print(f"   - {m}")
except Exception as e:
    print(f"   Error: {e}")

# Method 4: Try to get viewport clients directly
print("\n4. Direct viewport access:")
try:
    # Get all level editor viewports
    viewport_clients = unreal.UnrealEditorSubsystem.get_level_editor_viewports()
    print(f"   Found {len(viewport_clients)} viewport(s)")
    
    if viewport_clients:
        vpc = viewport_clients[0]
        vpc_methods = [m for m in dir(vpc) if 'camera' in m.lower() or 'view' in m.lower()]
        print("   Viewport client methods:")
        for m in vpc_methods:
            print(f"   - {m}")
except Exception as e:
    print(f"   Error: {e}")

print("\n=== End of search ===")