"""
UEMCP Coordinate System Visual Reference

This file can be executed in Unreal Engine's Python console to create
visual markers showing the coordinate system and cardinal directions.
"""

import unreal

def create_coordinate_markers():
    """Creates visual markers in the scene to show coordinate system"""
    
    # Get editor subsystem
    editor_asset_lib = unreal.EditorAssetLibrary
    editor_level_lib = unreal.EditorLevelLibrary
    
    # Center position (adjust as needed)
    center = unreal.Vector(10760, 660, 200)
    
    # Create text render actors for each direction
    directions = [
        {"name": "NORTH_Y_NEG", "offset": unreal.Vector(0, -500, 0), "text": "NORTH (Y-)"},
        {"name": "SOUTH_Y_POS", "offset": unreal.Vector(0, 500, 0), "text": "SOUTH (Y+)"},
        {"name": "EAST_X_POS", "offset": unreal.Vector(500, 0, 0), "text": "EAST (X+)"},
        {"name": "WEST_X_NEG", "offset": unreal.Vector(-500, 0, 0), "text": "WEST (X-)"},
        {"name": "UP_Z_POS", "offset": unreal.Vector(0, 0, 300), "text": "UP (Z+)"},
    ]
    
    # Cardinal corners
    corners = [
        {"name": "NW_CORNER", "offset": unreal.Vector(-300, -300, 0), "text": "NW"},
        {"name": "NE_CORNER", "offset": unreal.Vector(300, -300, 0), "text": "NE"},
        {"name": "SE_CORNER", "offset": unreal.Vector(300, 300, 0), "text": "SE"},
        {"name": "SW_CORNER", "offset": unreal.Vector(-300, 300, 0), "text": "SW"},
    ]
    
    created_actors = []
    
    # Create direction markers
    for dir_info in directions:
        # Create a cube as a marker
        cube_actor = editor_level_lib.spawn_actor_from_class(
            unreal.StaticMeshActor.static_class(),
            center + dir_info["offset"]
        )
        
        if cube_actor:
            # Set up the mesh
            cube_mesh = editor_asset_lib.load_asset('/Engine/BasicShapes/Cube')
            if cube_mesh:
                mesh_comp = cube_actor.get_component_by_class(unreal.StaticMeshComponent)
                if mesh_comp:
                    mesh_comp.set_static_mesh(cube_mesh)
                    mesh_comp.set_world_scale3d(unreal.Vector(0.2, 0.2, 0.2))
            
            # Name the actor
            cube_actor.set_actor_label(f"CoordMarker_{dir_info['name']}")
            cube_actor.set_folder_path("CoordinateSystem/Directions")
            created_actors.append(cube_actor)
            
            print(f"Created {dir_info['text']} marker at {center + dir_info['offset']}")
    
    # Create corner markers
    for corner_info in corners:
        # Create a sphere as a corner marker
        sphere_actor = editor_level_lib.spawn_actor_from_class(
            unreal.StaticMeshActor.static_class(),
            center + corner_info["offset"]
        )
        
        if sphere_actor:
            # Set up the mesh
            sphere_mesh = editor_asset_lib.load_asset('/Engine/BasicShapes/Sphere')
            if sphere_mesh:
                mesh_comp = sphere_actor.get_component_by_class(unreal.StaticMeshComponent)
                if mesh_comp:
                    mesh_comp.set_static_mesh(sphere_mesh)
                    mesh_comp.set_world_scale3d(unreal.Vector(0.3, 0.3, 0.3))
            
            # Name the actor
            sphere_actor.set_actor_label(f"CoordMarker_{corner_info['name']}")
            sphere_actor.set_folder_path("CoordinateSystem/Cardinals")
            created_actors.append(sphere_actor)
            
            print(f"Created {corner_info['text']} corner marker")
    
    print(f"\nCreated {len(created_actors)} coordinate markers")
    print("Markers are in the 'CoordinateSystem' folder in World Outliner")
    return created_actors

def remove_coordinate_markers():
    """Removes all coordinate system markers from the scene"""
    
    all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
    removed_count = 0
    
    for actor in all_actors:
        label = actor.get_actor_label()
        if label.startswith("CoordMarker_"):
            unreal.EditorLevelLibrary.destroy_actor(actor)
            removed_count += 1
    
    print(f"Removed {removed_count} coordinate markers")

# Usage instructions
print("""
UEMCP Coordinate System Visualizer
==================================

To create coordinate markers in your scene:
>>> create_coordinate_markers()

To remove coordinate markers:
>>> remove_coordinate_markers()

The markers will show:
- Cardinal directions (N, S, E, W)
- Cardinal corners (NW, NE, SE, SW)
- Up direction (Z+)

Coordinate System:
- X+ = EAST
- X- = WEST
- Y+ = SOUTH
- Y- = NORTH
- Z+ = UP
""")