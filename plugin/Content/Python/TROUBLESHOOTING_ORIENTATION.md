# Troubleshooting Orientation & Coordinate Issues

## Common Confusion Points

### 1. East/West Confusion
**Problem**: Corners labeled with wrong cardinal directions (E/W swapped)

**Root Cause**: Misunderstanding Unreal's coordinate system
- In Unreal: **X+ is EAST**, X- is West
- This may differ from other 3D applications

**Solution**:
```python
# Quick check in Python console:
print("X+ direction is EAST")
print("If actor.x > foundation.x, actor is EAST of foundation")
```

### 2. Corner Rotation Issues
**Problem**: Corners don't connect properly, gaps at joints

**Visual Guide**:
```
Correct SE Corner (Yaw=0°):
    ┌─────
    │  ╱
    │ ╱   Sharp angle points Southeast
    │╱

Wrong SE Corner (Yaw=-90°):
    │
    │_____  Sharp angle points wrong way
     ╲
      ╲
```

**Fix**: Use these rotations for sharp angle pointing outward:
- NW: Yaw = 180°
- NE: Yaw = -90°
- SE: Yaw = 0°
- SW: Yaw = 90°

### 3. Viewport Camera Confusion
**Problem**: "The viewport is rotated 90 degrees"

**Cause**: Confusing Roll with Pitch
```python
# WRONG - Creates tilted horizon:
camera_rotation = unreal.Rotator(0, 0, -90)  # Roll=-90

# CORRECT - Top-down view:
camera_rotation = unreal.Rotator(-90, 0, 0)  # Pitch=-90
```

**Remember**: [Pitch, Yaw, Roll] not [X, Y, Z]

### 4. Actor Placement Gaps
**Problem**: Walls don't connect, visible gaps

**Cause**: Not accounting for center pivots
```python
# WRONG - Assumes corner pivot:
wall_pos = foundation_pos + 500

# CORRECT - Accounts for center pivot:
wall_pos = foundation_pos + 500  # For corner at edge
wall_pos = foundation_pos + 400  # For 200-unit wall next to 100-unit corner
```

## Diagnostic Scripts

### Check World Orientation
```python
import unreal

# Find sun direction (usually from East)
for actor in unreal.EditorLevelLibrary.get_all_level_actors():
    if actor.get_class().get_name() == 'DirectionalLight':
        rot = actor.get_actor_rotation()
        print(f"Sun Yaw: {rot.yaw}° (0° = shining from East)")
        break
```

### Verify Corner Positions
```python
import unreal

foundation = None
corners = []

for actor in unreal.EditorLevelLibrary.get_all_level_actors():
    label = actor.get_actor_label()
    if label == 'HouseFoundation':
        foundation = actor.get_actor_location()
    elif 'Corner' in label and 'F1' in label:
        corners.append((label, actor.get_actor_location()))

if foundation:
    print("Corner positions relative to foundation:")
    for label, loc in corners:
        x_dir = "EAST" if loc.x > foundation.x else "WEST"
        y_dir = "SOUTH" if loc.y > foundation.y else "NORTH"
        print(f"{label}: {y_dir}-{x_dir}")
```

### Fix All Corner Names
```python
import unreal

# This will rename all F1 corners based on their actual positions
foundation = None
for actor in unreal.EditorLevelLibrary.get_all_level_actors():
    if actor.get_actor_label() == 'HouseFoundation':
        foundation = actor.get_actor_location()
        break

if foundation:
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        label = actor.get_actor_label()
        if 'Corner_F1' in label:
            loc = actor.get_actor_location()
            
            # Determine cardinal
            if loc.x < foundation.x and loc.y < foundation.y:
                cardinal = "NW"
            elif loc.x > foundation.x and loc.y < foundation.y:
                cardinal = "NE"
            elif loc.x > foundation.x and loc.y > foundation.y:
                cardinal = "SE"
            else:
                cardinal = "SW"
            
            new_name = f"Corner_F1_{cardinal}"
            actor.set_actor_label(new_name)
            print(f"Renamed to {new_name}")
```

## Visual Verification

### Enable Grid
In viewport: Show → Grid
- Helps verify 100cm alignment
- Shows world axes clearly

### Use Wireframe Mode
```python
# Better for seeing gaps
unreal.EditorLevelLibrary.set_editor_viewport_view_mode(
    unreal.EditorViewportViewMode.WIREFRAME
)
```

### Top-Down Verification
```python
# Set camera for alignment check
editor = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
editor.set_level_viewport_camera_info(
    unreal.Vector(10760, 660, 2000),  # High above
    unreal.Rotator(-90, 0, 0)         # Looking down
)
```

## Prevention Tips

1. **Always verify orientation first**
   - Place a test corner at each position
   - Check if sharp angles point outward
   - Adjust rotation values if needed

2. **Use helper functions**
   ```python
   def get_cardinal_direction(actor_pos, center_pos):
       """Returns cardinal direction of actor relative to center"""
       x_dir = "E" if actor_pos.x > center_pos.x else "W"
       y_dir = "S" if actor_pos.y > center_pos.y else "N"
       return f"{y_dir}{x_dir}"
   ```

3. **Document your coordinate system**
   - Add comment actors or text labels
   - Take screenshot with compass overlay
   - Keep this guide handy

4. **Test with simple shapes first**
   - Place cubes at cardinal positions
   - Verify they appear where expected
   - Then proceed with complex meshes