# MCP Limitations and Enhancement Opportunities

## Overview

This document outlines limitations discovered during the house-building experiment and proposed MCP enhancements to address them.

## Critical Limitations Found

### 0. Python API Method Inconsistencies
**Problem**: `get_actor_label()` works but `get_actor_reference()` doesn't
- Must use `get_actor_label()` to get display names
- `set_actor_rotation()` works for modifying actors
- Some viewport control methods don't exist in Python API

**Solution Found**: Use `get_actor_label()` for finding actors by name

### 1. Actor Reference System Issues
**Problem**: `get_actor_reference()` doesn't work with friendly names like "Corner_Back_Right"
- Actors are internally referenced as `StaticMeshActor_18` etc.
- No reliable way to get actors by their display names
- Makes it difficult to modify specific actors

**Proposed Enhancement**:
- Add actor search by display name
- Implement actor tagging system
- Create actor reference mapping tool

### 2. Viewport Control Limitations
**Problem**: Several viewport tools are not working correctly
- `viewport_mode` fails with "'NoneType' object is not subscriptable"
- `viewport_render_mode` fails with "no attribute 'editor_play_in_viewport'"
- `viewport_focus` fails with "no attribute 'editor_set_camera_look_at_location'"

**Proposed Enhancement**:
- Fix Python API calls for viewport control
- Add proper error handling and fallbacks
- Implement alternative viewport control methods

### 3. Lack of Snap-to-Grid Functionality
**Problem**: Manual placement requires exact coordinates
- No automatic snapping to modular grid (300 units)
- No socket-based snapping for modular pieces
- Difficult to ensure perfect alignment

**Proposed Enhancement**:
```python
actor_spawn_snapped({
  assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m',
  nearLocation: [12840, 500, 80],
  snapToGrid: 300,
  snapToSockets: true
})
```

### 4. No Placement Validation
**Problem**: Can't detect gaps or overlaps programmatically
- No collision detection for placement
- No way to verify if walls connect properly
- Must rely on visual inspection

**Proposed Enhancement**:
```python
validate_placement({
  actor: 'Wall_1',
  checkCollisions: true,
  checkGaps: true,
  tolerance: 10
})
```

### 5. Limited Asset Information
**Problem**: `asset_info` doesn't provide enough details
- No socket information
- No bounding box dimensions
- No pivot point information

**Proposed Enhancement**:
```python
asset_info_detailed({
  assetPath: '/Game/Meshes/SM_Wall',
  includeSockets: true,
  includeBounds: true,
  includePivot: true
})
```

### 6. No Batch Operations
**Problem**: Must place actors one at a time
- Inefficient for repetitive patterns
- No way to place multiple actors with spacing
- No array/pattern tools

**Proposed Enhancement**:
```python
actor_spawn_array({
  assetPath: '/Game/Meshes/SM_Wall',
  startLocation: [0, 0, 0],
  count: 5,
  spacing: [300, 0, 0],
  rotation: [0, 0, 0]
})
```

### 7. Poor Error Recovery
**Problem**: When placement fails, no way to diagnose
- Generic error messages
- No visual feedback on what went wrong
- Can't query why placement failed

**Proposed Enhancement**:
- Add detailed error responses with suggestions
- Include visual debugging helpers
- Provide placement preview tool

## Best Practices Discovered

### 1. Always Use Multiple Verification Methods
```python
# After placing actors:
1. Take perspective screenshot
2. Switch to wireframe mode
3. Take top-down screenshot
4. List actors to verify names
5. Check positions mathematically
```

### 2. Modular Building Patterns
- Walls are typically 300 units (3m) wide
- Corners need specific rotations (0, 90, 180, 270)
- Always place corners first, then fill walls
- Door/window pieces replace wall segments

### 3. Coordinate System Understanding
- X-axis: Forward/Back (North/South)
- Y-axis: Left/Right (East/West)  
- Z-axis: Up/Down
- Rotation: [Roll, Pitch, Yaw] not [X, Y, Z]

### 4. Debugging Workflow
```python
# When something looks wrong:
1. Check actor list and positions
2. Use python_proxy to inspect transforms
3. Take wireframe screenshots
4. Calculate expected vs actual positions
5. Use actor_modify to fix issues
```

## Recommended MCP Tool Additions

### Priority 1 (Critical for Building)
1. `actor_get_info` - Get detailed actor information by name
2. `viewport_set_camera` - Reliable camera positioning
3. `actor_snap_to_grid` - Grid-based placement
4. `placement_validate` - Check for gaps/overlaps

### Priority 2 (Workflow Enhancement)
1. `actor_spawn_batch` - Place multiple actors
2. `actor_find_by_location` - Find actors in area
3. `asset_get_sockets` - Get socket information
4. `selection_group` - Work with multiple actors

### Priority 3 (Advanced Features)
1. `blueprint_spawn` - Spawn blueprint actors
2. `material_instance_create` - Customize materials
3. `lighting_preview` - Quick lighting setup
4. `measurement_tool` - Measure distances

## Implementation Notes

### Python API Fixes Needed
```python
# Current (broken):
editor_subsystem.editor_play_in_viewport()

# Should be:
unreal.EditorLevelLibrary.editor_set_game_view(True)

# For viewport camera:
viewport = unreal.LevelEditorSubsystem.get_viewport()
viewport.set_view_location(location)
viewport.set_view_rotation(rotation)
```

### Actor Reference Fix
```python
# Add display name tracking
def get_actor_by_display_name(name):
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        if actor.get_actor_label() == name:
            return actor
    return None
```

## House Building Experiment Results

### What Worked
1. **Python Proxy for Direct Manipulation**: Successfully used `python_proxy` to:
   - Find actors by label using `get_actor_label()`
   - Modify rotations with `set_actor_rotation()`
   - Analyze positions and detect gaps

2. **Basic Actor Placement**: Could place walls and corners at specific coordinates

3. **Level Organization**: Folder structure in World Outliner worked well

### Key Discoveries
1. **Corner Pieces Are Junction Pieces**: ModularOldTown corner pieces are smaller than walls, creating intentional 300-unit gaps
2. **Rotation Fix**: Corners need specific rotations:
   - Front-Left: 0°
   - Front-Right: -90°
   - Back-Right: 180°
   - Back-Left: 90°

3. **Gap Analysis**: The "gaps" are actually by design - corner pieces connect at the junction points

## Conclusion

The current MCP implementation is functional but requires significant enhancements for efficient building workflows. The main issues are:

1. Lack of placement validation and snapping
2. Limited viewport control
3. No batch operations
4. Poor actor reference system (partially solved with `get_actor_label()`)

The house building experiment successfully:
- ✅ Identified and fixed corner rotation issues
- ✅ Documented modular building patterns
- ✅ Created comprehensive best practices
- ✅ Discovered Python API workarounds

With the proposed enhancements, the MCP would enable much more efficient and accurate building in Unreal Engine.