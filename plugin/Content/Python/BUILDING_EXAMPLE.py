"""
UEMCP Building Construction Example

This example demonstrates proper actor placement, naming, and organization
when building with modular assets in Unreal Engine using UEMCP.
"""

import unreal

def build_simple_house_example():
    """
    Builds a simple 4-corner, 1-room house demonstrating:
    - Proper coordinate system usage
    - Cardinal direction naming
    - Correct corner rotations
    - Actor organization
    """
    
    print("Building Simple House Example...")
    print("================================")
    
    # Configuration
    foundation_location = unreal.Vector(10760, 660, 80)
    house_width = 600  # 6 meters
    house_depth = 600  # 6 meters
    floor_height = 140  # Ground floor Z position
    
    # Calculate corner positions (accounting for center pivots)
    half_width = house_width / 2
    half_depth = house_depth / 2
    
    corners = {
        'NW': {
            'pos': unreal.Vector(
                foundation_location.x - half_width,
                foundation_location.y - half_depth,
                floor_height
            ),
            'rot': unreal.Rotator(0, 0, 180)  # Yaw=180 for NW
        },
        'NE': {
            'pos': unreal.Vector(
                foundation_location.x + half_width,
                foundation_location.y - half_depth,
                floor_height
            ),
            'rot': unreal.Rotator(0, 0, -90)  # Yaw=-90 for NE
        },
        'SE': {
            'pos': unreal.Vector(
                foundation_location.x + half_width,
                foundation_location.y + half_depth,
                floor_height
            ),
            'rot': unreal.Rotator(0, 0, 0)    # Yaw=0 for SE
        },
        'SW': {
            'pos': unreal.Vector(
                foundation_location.x - half_width,
                foundation_location.y + half_depth,
                floor_height
            ),
            'rot': unreal.Rotator(0, 0, 90)   # Yaw=90 for SW
        }
    }
    
    # Load corner asset
    corner_asset = unreal.EditorAssetLibrary.load_asset(
        '/Game/ModularOldTown/Meshes/Walls/SM_Corner_2m'
    )
    
    if not corner_asset:
        print("ERROR: Could not load corner asset!")
        print("Make sure ModularOldTown is in your project")
        return
    
    # Place corners
    print("\nPlacing corners with correct cardinal names and rotations:")
    
    for cardinal, data in corners.items():
        # Spawn the corner
        actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
            corner_asset,
            data['pos'],
            data['rot']
        )
        
        if actor:
            # Set proper name using cardinal direction
            actor.set_actor_label(f'Corner_F1_{cardinal}')
            
            # Organize in folder structure
            actor.set_folder_path('Examples/SimpleHouse/GroundFloor/Corners')
            
            print(f"  - Corner_F1_{cardinal} at {data['pos']} with Yaw={data['rot'].yaw}°")
    
    # Place walls between corners
    print("\nPlacing walls:")
    
    wall_asset = unreal.EditorAssetLibrary.load_asset(
        '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m'
    )
    
    if wall_asset:
        # North wall (between NW and NE)
        north_wall_pos = unreal.Vector(
            foundation_location.x,
            foundation_location.y - half_depth,
            floor_height
        )
        north_wall = unreal.EditorLevelLibrary.spawn_actor_from_object(
            wall_asset,
            north_wall_pos,
            unreal.Rotator(0, 0, 0)  # No rotation for E-W walls
        )
        if north_wall:
            north_wall.set_actor_label('Wall_North_1')
            north_wall.set_folder_path('Examples/SimpleHouse/GroundFloor/Walls')
            print(f"  - Wall_North_1 at {north_wall_pos}")
    
    print("\nExample house frame created!")
    print("\nKey concepts demonstrated:")
    print("1. Coordinate system: X=East/West, Y=North/South")
    print("2. Cardinal naming: NW, NE, SE, SW based on position")
    print("3. Corner rotations: Sharp angle points outward")
    print("4. Actor organization: Hierarchical folder structure")
    print("5. Descriptive naming: Corner_F1_NW, Wall_North_1, etc.")
    
    print("\nTo see the coordinate system visually:")
    print(">>> from COORDINATE_SYSTEM_DIAGRAM import create_coordinate_markers")
    print(">>> create_coordinate_markers()")

def cleanup_example():
    """Removes the example house"""
    all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
    removed = 0
    
    for actor in all_actors:
        if actor.get_folder_path().startswith('Examples/SimpleHouse'):
            unreal.EditorLevelLibrary.destroy_actor(actor)
            removed += 1
    
    print(f"Removed {removed} example actors")

# Usage
print("""
UEMCP Building Example
======================

To build the example house:
>>> build_simple_house_example()

To remove the example:
>>> cleanup_example()

This example demonstrates:
- Proper coordinate system usage (X=E/W, Y=N/S)
- Cardinal direction naming (NW, NE, SE, SW)
- Correct corner rotations (sharp angle out)
- Actor organization in folders
- Descriptive actor naming
""")