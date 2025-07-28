"""
Script to fix floor tile gaps by replacing them with properly spaced tiles
Run this in the Unreal Engine Python console
"""

import unreal

def fix_floor_gaps():
    """Delete existing floor tiles and replace with properly spaced ones"""
    
    print("Starting floor tile fix...")
    
    # Get all actors
    all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
    
    # Find and delete existing floor tiles
    floor_tiles_deleted = 0
    floor_z = None
    
    for actor in all_actors:
        label = actor.get_actor_label()
        # Delete first floor tiles (F1)
        if 'Floor_F1_' in label:
            if floor_z is None:
                # Remember the Z position of the floor
                floor_z = actor.get_actor_location().z
            unreal.EditorLevelLibrary.destroy_actor(actor)
            floor_tiles_deleted += 1
    
    print(f"Deleted {floor_tiles_deleted} existing floor tiles")
    
    # If we didn't find any floor tiles, use a default height
    if floor_z is None:
        floor_z = 140.0  # Default ground floor height
        print(f"Using default floor height: {floor_z}")
    
    # Place new floor tiles with correct spacing
    # SM_Floor_2m is 200cm x 200cm
    tile_size = 200.0  # 2 meters
    
    # Define the grid (9 columns x 4 rows based on the names I saw)
    rows = 4
    cols = 9
    
    # Starting position (adjust based on your building location)
    # This assumes the building is centered around a certain point
    start_x = 10000.0  # Adjust based on your building's actual location
    start_y = 0.0      # Adjust based on your building's actual location
    
    tiles_placed = 0
    
    for row in range(rows):
        for col in range(cols):
            # Calculate position with NO GAPS (edge-to-edge placement)
            x = start_x + (col * tile_size)
            y = start_y + (row * tile_size)
            
            # Spawn the floor tile
            location = unreal.Vector(x, y, floor_z)
            rotation = unreal.Rotator(0, 0, 0)  # No rotation needed for floor
            
            # Spawn static mesh actor
            actor = unreal.EditorLevelLibrary.spawn_actor_from_class(
                unreal.StaticMeshActor.static_class(),
                location,
                rotation
            )
            
            if actor:
                # Load and set the floor mesh
                floor_mesh = unreal.EditorAssetLibrary.load_asset('/Game/ModularOldTown/Meshes/SM_Floor_2m')
                if floor_mesh:
                    mesh_comp = actor.get_editor_property('static_mesh_component')
                    mesh_comp.set_static_mesh(floor_mesh)
                    
                    # Set a meaningful name
                    actor.set_actor_label(f'Floor_F1_{row+1}_{col+1}')
                    
                    # Organize in folder
                    actor.set_folder_path('Building/GroundFloor/Floor')
                    
                    tiles_placed += 1
                else:
                    print("ERROR: Could not load floor mesh!")
                    unreal.EditorLevelLibrary.destroy_actor(actor)
                    return False
    
    print(f"Placed {tiles_placed} new floor tiles with proper spacing")
    print(f"Tile size: {tile_size}cm x {tile_size}cm")
    print(f"Grid: {rows} rows x {cols} columns")
    print("\nFloor tiles fixed successfully!")
    
    # Save the level
    unreal.EditorLevelLibrary.save_current_level()
    print("Level saved")
    
    return True

# Run the fix
if __name__ == "__main__":
    fix_floor_gaps()