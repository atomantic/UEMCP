# Unreal Engine Conventions & Best Practices

This document contains detailed UE-specific conventions and guidelines.

## Viewport Camera Control

**CRITICAL**: Understanding viewport camera positioning:

### Camera Rotation [Roll, Pitch, Yaw]

- **Pitch**: Tilt up/down (-90 = looking straight down, 0 = horizontal, 90 = looking straight up)
- **Yaw**: Turn left/right - **WARNING: This is the direction camera FACES, not compass direction!**
  - Yaw 0° = Camera facing EAST (+Y direction)
  - Yaw 90° = Camera facing NORTH (-X direction)
  - Yaw 180° or -180° = Camera facing WEST (-Y direction)
  - Yaw -90° or 270° = Camera facing SOUTH (+X direction)
- **Roll**: Tilt sideways (KEEP AT 0 for normal viewing - non-zero creates tilted horizon!)

### Correct Yaw Calculation
To look at a target from camera position:
```python
import math
dx = target_x - camera_x
dy = target_y - camera_y
# Calculate angle in radians
angle_rad = math.atan2(dy, dx)
# Convert to degrees
yaw = math.degrees(angle_rad)
```

**COMMON MISTAKE TO AVOID**:
- If camera is at [1200, 1200, z] and target is at [0, 0, z]
- dx = 0 - 1200 = -1200, dy = 0 - 1200 = -1200
- angle = atan2(-1200, -1200) = -135° (or 225°)
- NOT -45°! That points the opposite direction!

**QUICK REFERENCE** (for camera looking at origin [0,0,z]):
- Camera at [+X, +Y]: Use Yaw ≈ -135° or 225°
- Camera at [+X, -Y]: Use Yaw ≈ -45° or 315°
- Camera at [-X, +Y]: Use Yaw ≈ 135° or -225°
- Camera at [-X, -Y]: Use Yaw ≈ 45° or -315°

### Best Practice - Use Built-in Tools

```python
# Method 1: Use viewport_focus tool (MOST RELIABLE - ALWAYS USE THIS FIRST!)
viewport_focus({ actorName: 'Monument_Orb' })
# This simply centers on the actor without complex math

# Method 2: Use viewport_fit to frame multiple actors (ALSO RELIABLE)
viewport_fit({ actors: ['Wall_1', 'Wall_2', 'Wall_3'] })

# Method 3: Use viewport_look_at tool (CAN BE UNPREDICTABLE)
viewport_look_at({
  target: [0, 0, 300],  # Look at this point
  distance: 1000,       # From this distance
  height: 500          # At this height offset
})
# WARNING: viewport_look_at still calculates position and can end up weird!
```

### Common Camera Views

- **Top-down**: Rotation = [-90, 0, 0] (Pitch=-90, looking straight down)
- **Front view**: Rotation = [0, 0, 0] (horizontal, facing north)
- **Isometric**: Rotation = [-30, 45, 0] (angled down, turned northeast)
- **NEVER use Roll unless creating Dutch angle effects**

### Setting Proper Views

```python
# CORRECT top-down view
camera_location = unreal.Vector(10760, 690, 2000)  # Above target
camera_rotation = unreal.Rotator(-90, 0, 0)  # Pitch=-90, Yaw=0, Roll=0

# WRONG (creates sideways view with tilted horizon)
camera_rotation = unreal.Rotator(0, 0, -90)  # This uses Roll instead of Pitch!
```

### Rotator Constructor Bug

The `unreal.Rotator(a, b, c)` constructor has confusing parameter ordering that can cause Roll issues.
**Always set rotation properties explicitly** to avoid problems:
```python
# CORRECT - Set properties explicitly
rotation = unreal.Rotator()
rotation.pitch = -90.0  # Look down
rotation.yaw = 0.0      # Face north
rotation.roll = 0.0     # No tilt

# AVOID - Constructor can cause Roll confusion
rotation = unreal.Rotator(-90, 0, 0)  # May set Roll=-90 instead of Pitch=-90!
```

## Coordinate System

**CRITICAL**: Unreal Engine's coordinate system is counterintuitive:
- **X- = NORTH** (X decreases going North)
- **X+ = SOUTH** (X increases going South)
- **Y- = EAST** (Y decreases going East)
- **Y+ = WEST** (Y increases going West)
- **Z+ = UP** (Z increases going Up)

## Rotation and Location Arrays

**Location [X, Y, Z]**: Position in 3D space
- X axis: North (-) to South (+)
- Y axis: East (-) to West (+)
- Z axis: Down (-) to Up (+)

**Rotation [Roll, Pitch, Yaw]**:
- **Roll** (index 0): Rotation around the forward X axis (tilting sideways)
- **Pitch** (index 1): Rotation around the right Y axis (looking up/down)
- **Yaw** (index 2): Rotation around the up Z axis (turning left/right)

Common rotation examples for building:
- `[0, 0, 0]` - No rotation (default orientation)
- `[0, 0, 90]` - Rotate 90° clockwise around Z axis (turn right)
- `[0, 0, -90]` - Rotate 90° counter-clockwise around Z axis (turn left)
- `[0, 90, 0]` - Rotate 90° around Y axis (face up)
- `[90, 0, 0]` - Rotate 90° around X axis (tilt sideways)

**For modular building pieces**:
- Walls running along X-axis (North-South): Use rotation `[0, 0, 0]`
- Walls running along Y-axis (East-West): Use rotation `[0, 0, -90]`
- Corner pieces may need specific rotations like `[0, 0, 90]` or `[0, 90, 0]`

**Note**: The rotation array is [Roll, Pitch, Yaw], NOT [X, Y, Z] as the indices might suggest!

## ModularOldTown Wall Rotations

**CRITICAL**: The correct Yaw rotations for walls to face into the building:
- **North walls**: Yaw = 270° (-90°) - faces south into building
- **South walls**: Yaw = 90° - faces north into building
- **East walls**: Yaw = 180° - faces west into building
- **West walls**: Yaw = 0° - faces east into building

**Note**: The default wall orientation faces a specific direction, so these rotations ensure windows/doors face inward.

## Best Practices for Actor Placement

### Use Multiple Viewpoints
- Take screenshots from perspective view first
- Then switch to top/wireframe view to check alignment
- Wireframe mode reveals gaps and overlaps clearly

### Modular Asset Snapping
- ModularOldTown assets are typically 300 units (3m) wide
- Corner pieces need specific rotations to connect properly
- Check for gaps between walls - they should connect seamlessly

### Common Placement Issues
- **Corner Rotation**: Corners must be rotated to match adjacent walls
- **Wall Gaps**: Ensure walls are placed at exact 300-unit intervals
- **Overlapping**: Check wireframe view for overlapping geometry
- **Missing Actors**: Keep track of all placed actors (doors, windows)

### Verification Steps
```python
# 1. List all actors to verify nothing is missing
level_actors(filter="Wall")
level_actors(filter="Door")

# 2. Take wireframe screenshot from top
viewport_render_mode(mode="wireframe")
viewport_mode(mode="top")
viewport_screenshot()

# 3. Check actor positions mathematically
# Walls should be at exact 300-unit intervals
# Corners need proper rotation values
```

### Debugging Placement
- If walls don't align, check both position AND rotation
- Corner pieces often need 90° rotations
- Use `actor_modify` to fix misaligned actors
- Save level frequently to preserve progress

## Python Proxy Examples

The `python_proxy` tool provides unlimited Python execution capabilities:

```python
# Example 1: Complex actor manipulation
import unreal
import math

# Find all actors in a radius and rotate them
center = unreal.Vector(0, 0, 0)
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

for actor in all_actors:
    loc = actor.get_actor_location()
    distance = (loc - center).size()

    if distance < 1000:
        # Rotate based on distance
        rotation = actor.get_actor_rotation()
        rotation.yaw += distance * 0.1
        actor.set_actor_rotation(rotation)

# Example 2: Batch asset operations
assets = unreal.EditorAssetLibrary.list_assets("/Game/MyFolder")
for asset_path in assets:
    asset = unreal.EditorAssetLibrary.load_asset(asset_path)
    # Process each asset...

# Example 3: Custom editor automation
def place_actors_in_grid(asset_path, grid_size=5, spacing=200):
    """Place actors in a grid pattern"""
    for x in range(grid_size):
        for y in range(grid_size):
            location = unreal.Vector(x * spacing, y * spacing, 0)
            unreal.EditorLevelLibrary.spawn_actor_from_object(
                unreal.EditorAssetLibrary.load_asset(asset_path),
                location
            )

place_actors_in_grid("/Game/MyMesh", 3, 300)
```