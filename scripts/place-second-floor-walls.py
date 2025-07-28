import unreal

# House dimensions and assets
house_center_x = 10760
house_center_y = 690
floor_z = 392
wall_height = 300  # 3m walls
width = 1000  # 10m
depth = 800   # 8m

# Assets
corner_asset = "/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner.SM_FlatWall_1m_Corner"
corner_r_asset = "/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner_R.SM_FlatWall_1m_Corner_R"
window_wall = "/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareWin.SM_FlatWall_3m_SquareWin"

# Calculate positions
half_width = width / 2
half_depth = depth / 2

# Function to spawn actor
def spawn_actor(asset_path, location, rotation, name, folder):
    asset_obj = unreal.EditorAssetLibrary.load_asset(asset_path)
    if asset_obj:
        loc = unreal.Vector(location[0], location[1], location[2])
        rot = unreal.Rotator()
        rot.pitch = rotation[1]
        rot.yaw = rotation[2]
        rot.roll = rotation[0]
        
        actor = unreal.EditorLevelLibrary.spawn_actor_from_object(asset_obj, loc, rot)
        if actor:
            actor.set_actor_label(name)
            actor.set_folder_path(folder)
            return True
    return False

# Place corners (stacking 3x 1m corners)
print("Placing corners...")
corners = [
    {"name": "NE", "x": house_center_x - half_width, "y": house_center_y - half_depth, "yaw": 0, "asset": corner_asset},
    {"name": "SE", "x": house_center_x + half_width, "y": house_center_y - half_depth, "yaw": 90, "asset": corner_r_asset},
    {"name": "SW", "x": house_center_x + half_width, "y": house_center_y + half_depth, "yaw": 180, "asset": corner_asset},
    {"name": "NW", "x": house_center_x - half_width, "y": house_center_y + half_depth, "yaw": 270, "asset": corner_r_asset}
]

for corner in corners:
    # Stack 3 corner pieces
    for i in range(3):
        z = floor_z + i * 100
        name = f"SecondFloor_{corner['name']}_Corner_{i}"
        spawn_actor(corner["asset"], [corner["x"], corner["y"], z], [0, 0, corner["yaw"]], name, "Estate/House/SecondFloor/Structure")
        print(f"  Placed {name}")

# Place window walls
print("\nPlacing walls...")

# North walls (faces south, Yaw=270)
for i in range(3):
    x = house_center_x - half_width + 100 + i * 300 + 100  # Offset for corner
    spawn_actor(window_wall, [x, house_center_y - half_depth, floor_z], [0, 0, 270], f"SecondFloor_NorthWall_{i}", "Estate/House/SecondFloor/Structure")
    print(f"  Placed north wall {i}")

# South walls (faces north, Yaw=90)
for i in range(3):
    x = house_center_x - half_width + 100 + i * 300 + 100
    spawn_actor(window_wall, [x, house_center_y + half_depth, floor_z], [0, 0, 90], f"SecondFloor_SouthWall_{i}", "Estate/House/SecondFloor/Structure")
    print(f"  Placed south wall {i}")

# East walls (faces west, Yaw=180)
for i in range(2):
    y = house_center_y - half_depth + 100 + i * 300 + 100
    spawn_actor(window_wall, [house_center_x + half_width, y, floor_z], [0, 0, 180], f"SecondFloor_EastWall_{i}", "Estate/House/SecondFloor/Structure")
    print(f"  Placed east wall {i}")

# West walls (faces east, Yaw=0)
for i in range(2):
    y = house_center_y - half_depth + 100 + i * 300 + 100
    spawn_actor(window_wall, [house_center_x - half_width, y, floor_z], [0, 0, 0], f"SecondFloor_WestWall_{i}", "Estate/House/SecondFloor/Structure")
    print(f"  Placed west wall {i}")

print("\nSecond floor structure complete!")
result = "Success"