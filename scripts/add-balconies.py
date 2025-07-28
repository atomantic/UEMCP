import unreal

# Add balconies to south side
balcony_asset = "/Game/ModularOldTown/Meshes/Decoration_Parts/SM_SimpleBalcony_A.SM_SimpleBalcony_A"
house_center_x = 10760
house_center_y = 690
floor_z = 392
balcony_height = 100  # Offset above floor

# Place 3 balconies on south wall
for i in range(3):
    x = house_center_x - 400 + i * 300 + 100
    y = house_center_y + 400  # South side
    z = floor_z + balcony_height
    
    loc = unreal.Vector(x, y, z)
    rot = unreal.Rotator()
    rot.yaw = 90  # Face north (into building)
    
    asset_obj = unreal.EditorAssetLibrary.load_asset(balcony_asset)
    if asset_obj:
        actor = unreal.EditorLevelLibrary.spawn_actor_from_object(asset_obj, loc, rot)
        if actor:
            actor.set_actor_label(f"SecondFloor_Balcony_South_{i}")
            actor.set_folder_path("Estate/House/SecondFloor/Decorations")
            print(f"Placed balcony {i} at ({x}, {y}, {z})")

print("\nBalconies added!")
result = "Success"