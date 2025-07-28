import unreal
import time

house_center_x = 10760
house_center_y = 690
floor_z = 392

# Screenshot 1: Perspective view from southwest
print("Taking perspective view screenshot...")
unreal.EditorLevelLibrary.editor_set_camera_location(
    unreal.Vector(house_center_x + 1500, house_center_y + 1200, floor_z + 800)
)
rot = unreal.Rotator()
rot.pitch = -30
rot.yaw = -135
rot.roll = 0
unreal.EditorLevelLibrary.editor_set_camera_rotation(rot)

# Set perspective mode
unreal.EditorLevelLibrary.set_viewport_camera_orthographic(False)

# Take screenshot
unreal.AutomationLibrary.take_high_res_screenshot(
    640, 360, 
    "SecondFloor_Perspective.png",
    None,  # camera
    {},    # capture region
    50,    # screen percentage
    True   # include buffer visualization
)
time.sleep(1)

# Screenshot 2: Top-down view
print("Taking top-down view screenshot...")
unreal.EditorLevelLibrary.editor_set_camera_location(
    unreal.Vector(house_center_x, house_center_y, floor_z + 2000)
)
rot = unreal.Rotator()
rot.pitch = -90
rot.yaw = 0
rot.roll = 0
unreal.EditorLevelLibrary.editor_set_camera_rotation(rot)

# Set orthographic mode for top view
unreal.EditorLevelLibrary.set_viewport_camera_orthographic(True)

unreal.AutomationLibrary.take_high_res_screenshot(
    640, 360,
    "SecondFloor_TopView.png", 
    None,
    {},
    50,
    True
)
time.sleep(1)

# Screenshot 3: Wireframe view to check alignment
print("Taking wireframe screenshot...")
# Set wireframe mode
viewport_client = unreal.EditorLevelLibrary.get_editor_viewport_client()
if viewport_client:
    viewport_client.set_view_mode(unreal.ViewModeIndex.WIREFRAME)

unreal.AutomationLibrary.take_high_res_screenshot(
    640, 360,
    "SecondFloor_Wireframe.png",
    None,
    {},
    50,
    True
)
time.sleep(1)

# Reset to lit mode
if viewport_client:
    viewport_client.set_view_mode(unreal.ViewModeIndex.LIT)

# Set back to perspective
unreal.EditorLevelLibrary.set_viewport_camera_orthographic(False)

print("Screenshots complete!")
result = "Screenshots taken"