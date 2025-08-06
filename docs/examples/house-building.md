# House Building Experiment

## Overview

This document captures the learnings from building an elaborate house on top of the HouseFoundation in the Home Unreal Project using ModularOldTown assets. The experiment's primary mission was to discover MCP limitations and enhance the plugin/server capabilities to match what a human can do with the Unreal Engine editor.

## Key Principles

1. **MCP-First Development**: When encountering limitations, prioritize fixing/extending MCP functionality over working around constraints
2. **Visual Verification**: Have human operator verify progress at key stages through screenshots
3. **Iterative Enhancement**: Each blocker becomes an opportunity to improve MCP
4. **Minimal Human Intervention**: Only ask user to perform actions that cannot be automated via MCP

## Important: Unreal Engine Coordinate System

**Note**: UE's coordinate system is counterintuitive!
- **X- = NORTH** (X decreases going North)
- **X+ = SOUTH** (X increases going South)  
- **Y- = EAST** (Y decreases going East)
- **Y+ = WEST** (Y increases going West)
- **Z+ = UP** (Z increases going Up)

## Key Lessons Learned

### 1. Actor Pivot Points ⚠️
- **Critical Discovery**: ModularOldTown assets use CENTER pivot points, not corner pivots
- **Impact**: All placement calculations must account for half-dimensions
- **Example**: A 300x100 wall at position (X,Y) extends from (X-150, Y-50) to (X+150, Y+50)

### 2. Actor Naming Requirements 🏷️
- **Problem**: Spawned actors get generic names like "UEMCP_Actor_1753576458"
- **Solution**: Must provide meaningful names when spawning
- **Naming Convention**:
  - Unique: `[Type]_F[FloorNumber]_[Cardinality]` (e.g. Corner_F1_SW)
  - Repeating: `[Type]_F[FloorNumber]_[Cardinality]_[Number]` (e.g. Wall_F1_S_1)

### 3. Folder Organization Requirements 📁
- **Requirement**: All house actors must be organized in folder structure
- **Path**: `Estate/House/[Component]`
- **Structure**:
  ```
  Estate/
  └── House/
      ├── GroundFloor/
      │   ├── Walls/
      │   ├── Corners/
      │   └── Doors/
      ├── SecondFloor/
      └── Roof/
  ```
- **Implementation**: Use `folder` parameter in actor_spawn

### 4. Viewport Camera Control 📸
- **Rotation Array**: [Roll, Pitch, Yaw] - NOT [X, Y, Z] as indices might suggest
- **Common Mistake**: Setting Roll (first value) instead of Yaw (third value) creates tilted horizon
- **Correct Views**:
  - Top-down: `[0, -90, 0]` (Pitch=-90)
  - Perspective: `[0, -30, 45]` (Pitch=-30, Yaw=45)
  - NEVER modify Roll unless creating Dutch angle

### 5. Asset Path Discoveries 📁
- **Window walls**: Use `SM_FlatWall_2m_SquareWin` (not Window_Square)
- **Door walls**: Use `SM_FlatWall_3m_SquareDoor` (not Door_Square)
- **All paths**: Must include subfolder like `/Walls/` or `/Ground/`

## ModularOldTown Asset Reference

### Analysis from Old_Town Map

After studying the ModularOldTown/Maps/Old_Town example map, key observations:

1. **Building Construction Pattern**:
   - Buildings use a combination of corner pieces and wall segments
   - Corners are placed first to establish building footprint
   - Walls fill the gaps between corners with precise 300cm intervals
   - Multiple floor levels stack directly on top of each other (Z+282 per floor)

2. **Common Building Components**:
   - **SM_FlatWall_3m**: Standard 3m wall segment
   - **SM_FlatWall_1m_Corner**: Corner pieces for building edges
   - **SM_FlatWall_3m_SquareDoor**: Wall with door opening
   - **SM_FlatWall_3m_ArchedDoorWin**: Wall with arched door and window
   - **SM_FlatWall_3m_SquareDWin**: Wall with square door and window
   - **SM_Floor_2m/1m**: Floor tiles for interior surfaces
   - **SM_SimpleBalcony_A**: Decorative balcony elements

3. **Naming Convention in Old_Town**:
   - Walls: SM_FlatWall_3m2, SM_FlatWall_3m3 (numbered instances)
   - Corners: SM_FlatWall_1m_Corner2, SM_FlatWall_1m_Corner3
   - Floors: SM_Floor_2m10, SM_Floor_2m11 (sequential numbering)

### Standard Dimensions

| Asset Type | Dimensions (cm) | Grid Size | Notes |
|------------|-----------------|-----------|-------|
| Corner (1m) | 100 x 100 x 282 | 1m x 1m | Used at all building corners |
| Wall 2m | 200 x 100 x 282 | 2m x 1m | For smaller openings |
| Wall 3m | 300 x 100 x 282 | 3m x 1m | Standard wall segment |
| Floor 1m | 100 x 100 x ~7 | 1m x 1m | Thin floor tiles |
| Floor 2m | 200 x 200 x ~7 | 2m x 2m | Larger floor sections |

### Rotation Rules

**CRITICAL - Rotation Array Format**: 
- The rotation array is **[Roll, Pitch, Yaw]** matching Unreal Engine's Rotator constructor
- Roll = rotation around forward X axis (tilting sideways)
- Pitch = rotation around right Y axis (looking up/down)
- Yaw = rotation around up Z axis (turning left/right)

**Wall Orientation Guidelines**:
- **Always use [0, 0, Yaw]** - Only modify the third value (Yaw) for wall orientation
- **Roll and Pitch must be 0** - Non-zero values cause walls to tilt or lay flat
- **Wall Yaw values** (may vary based on mesh default orientation):
  - North walls (facing south): Yaw = 270° (-90°)
  - South walls (facing north): Yaw = 90°
  - East walls (facing west): Yaw = 180°  
  - West walls (facing east): Yaw = 0°

**Safe rotation patterns**:
- **North-South walls** (along X-axis): `[0, 0, 0]` or `[0, 0, 180]`
- **East-West walls** (along Y-axis): `[0, 0, -90]` or `[0, 0, 90]`
- **Corner rotations** (based on Old_Town observations):
  - NE Corner: `[0, 0, -90]` (faces into building)
  - SE Corner: `[0, 0, 0]` 
  - SW Corner: `[0, 0, 90]`
  - NW Corner: `[0, 0, 180]`

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

### 3. Python API Workarounds
```python
# Finding actors by display name (since get_actor_reference doesn't work):
def get_actor_by_display_name(name):
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        if actor.get_actor_label() == name:
            return actor
    return None

# Setting rotation (use set_actor_rotation instead of broken methods):
actor.set_actor_rotation(unreal.Rotator(0, 0, 90))
```

### 4. Debugging Workflow
```python
# When something looks wrong:
1. Check actor list and positions
2. Use python_proxy to inspect transforms
3. Take wireframe screenshots
4. Calculate expected vs actual positions
5. Use actor_modify to fix issues
```

### 5. Wall Placement Algorithm
```javascript
// Account for center pivot and corner inset
const cornerSize = 100;
const wallThickness = 100;
const inset = cornerSize / 2;

// Example: Front wall placement
const frontY = foundation.y - (houseDepth/2) + (wallThickness/2);
const wallX = foundation.x - (houseWidth/2) + cornerSize + (wallWidth/2);
```

## Discovered Issues & Solutions

### 1. MCP actor_modify Mesh Replacement Bug 🐛
- **Issue**: actor_modify tool reports success but mesh changes don't always apply
- **Symptoms**: 
  - Tool returns success status
  - Logs show no errors
  - level_actors shows old mesh still in use
  - Direct python_proxy execution works correctly
- **Workaround**: Use python_proxy for mesh replacement until fixed
- **Root Cause**: Unknown - needs investigation

### 2. Viewport Rotation Bug
- **Issue**: Roll/Pitch confusion caused tilted camera views
- **Solution**: Always set Roll=0, only modify Pitch and Yaw
- **Fixed**: Python listener now uses correct [Roll, Pitch, Yaw] format

### 3. Actor Reference System Issues
- **Problem**: `get_actor_reference()` doesn't work with display names
- **Solution**: Use `get_actor_label()` to find actors by name
- **Impact**: Must iterate through all actors to find by name

### 4. Screenshot Detection Timing
- **Issue**: Screenshots may not appear immediately after creation
- **Solution**: Add small delay or check for file existence
- **Cause**: File system lag between UE and OS

### 5. Python API Method Inconsistencies
- **Working**: `get_actor_label()`, `set_actor_rotation()`, `set_actor_location()`
- **Broken**: `get_actor_reference()`, `editor_play_in_viewport()`, deprecated viewport methods
- **Solution**: Use alternative methods documented in workarounds

## MCP Enhancement Priority List

Based on the house building experiment, these enhancements would significantly improve the workflow:

### Critical Features (Block house construction):
1. **Asset Snapping System**: Detect and use socket points for precise placement
2. **Asset Query Enhancement**: Get dimensions, sockets, collision bounds
3. **Batch Operations**: Place multiple similar assets efficiently
4. **Actor Reference Fix**: Reliable actor identification
5. **Placement Validation**: Detect gaps and overlaps

### Important Features (Improve workflow):
1. **Blueprint Actor Spawning**: Spawn interactive elements
2. **Material Instance Creation**: Customize asset appearance
3. **Selection Groups**: Work with multiple actors together
4. **Grid Snap Tool**: Enable/disable grid snapping

### Nice-to-Have Features (Polish):
1. **Lighting Preview**: See lighting changes in real-time
2. **Physics Simulation**: Test structural integrity
3. **Weather/Time of Day**: Environmental testing
4. **Performance Metrics**: Track frame rate and complexity
5. **Export/Import**: Save house as reusable asset

## Success Metrics

The house building experiment achieved:
- ✅ Ground floor complete with proper alignment
- ✅ All actors have meaningful names
- ✅ All actors organized in Estate/House folders
- ✅ Critical viewport control issues fixed
- ✅ Actor placement mathematics corrected for center pivots
- ✅ All gaps eliminated between modular pieces

## Example Map Reference

**ModularOldTown Example**: The package includes `/Content/ModularOldTown/Maps/Old_Town` - a complete example town demonstrating proper usage of all assets. This map is valuable for:
- Learning correct asset placement and rotation patterns
- Understanding how modular pieces connect seamlessly
- Discovering creative combinations and architectural patterns
- Copying specific actor configurations for reuse

**Tip**: Open the Old_Town map to inspect how professionals use these assets, then apply similar patterns to your house construction.