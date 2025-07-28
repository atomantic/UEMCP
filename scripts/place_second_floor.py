import unreal

# House dimensions and floor height
center_x = 10760
center_y = 690
floor_z = 392
house_width = 1000  # 10m
house_depth = 800   # 8m

# Floor tile configuration
tile_size = 200  # 2m tiles
tiles_x = 5
tiles_y = 4

# Calculate starting position (bottom-left corner)
start_x = center_x - (tiles_x * tile_size) / 2 + tile_size / 2
start_y = center_y - (tiles_y * tile_size) / 2 + tile_size / 2

# Floor asset path
floor_asset = "/Game/ModularOldTown/Meshes/Ground/SM_Floor_2m"

print(f"Building second floor at Z={floor_z}")
print(f"Center: ({center_x}, {center_y})")
print(f"Floor grid: {tiles_x}x{tiles_y} tiles of {tile_size}cm")

# Place floor tiles
placed_count = 0
for x in range(tiles_x):
    for y in range(tiles_y):
        pos_x = start_x + x * tile_size
        pos_y = start_y + y * tile_size
        actor_name = f"SecondFloorTile_{x}_{y}"
        
        # Spawn the floor tile
        location = unreal.Vector(pos_x, pos_y, floor_z)
        rotation = unreal.Rotator(0, 0, 0)
        
        actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
            unreal.EditorAssetLibrary.load_asset(floor_asset),
            location,
            rotation
        )
        
        if actor:
            actor.set_actor_label(actor_name)
            # Move to folder
            actor.set_folder_path("Estate/House/SecondFloor/Floor")
            placed_count += 1
            print(f"  Placed {actor_name} at ({pos_x}, {pos_y}, {floor_z})")

print(f"\nPlaced {placed_count} floor tiles successfully!")
placed_count