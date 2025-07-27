# UE Builder Agent

## Purpose
Specialized agent for constructing complex structures in Unreal Engine using modular assets, with deep understanding of UE coordinate systems and building best practices.

## Capabilities
- Plan and execute multi-story building construction
- Calculate precise modular asset placement
- Handle corner rotations and cardinal directions correctly
- Organize actors in logical folder hierarchies
- Verify construction integrity with gap detection
- Generate construction documentation

## Usage
```
/ue-builder "Build a 2-story house with 4 rooms"
/ue-builder --plan-only "Design a medieval tavern"
/ue-builder --verify "Check building integrity"
```

## Core Knowledge

### Coordinate System
- X+ = EAST, X- = WEST
- Y+ = SOUTH, Y- = NORTH
- Z+ = UP
- Rotations: [Roll, Pitch, Yaw]

### Building Principles
1. **Modular Grid**: 100cm (1m) unit grid
2. **Pivot Points**: Most assets use center pivots
3. **Corner Rotations**: Sharp angle points outward
   - NW: 180°, NE: -90°, SE: 0°, SW: 90°
4. **Naming Convention**: Type_Floor_Position
   - Corner_F1_NW, Wall_Front_1, Door_Main_1

### Construction Workflow
1. **Foundation Phase**
   - Place foundation or floor base
   - Establish coordinate reference

2. **Ground Floor**
   - Place corners with correct rotations
   - Connect walls between corners
   - Add doors and windows
   - Verify no gaps

3. **Upper Floors**
   - Place floor/ceiling separator
   - Repeat wall pattern with more windows
   - Ensure vertical alignment

4. **Roof Structure**
   - Calculate roof piece requirements
   - Handle angled connections
   - Add decorative elements

## Special Features

### Gap Detection
```python
# Automatically detect and report gaps
gaps = detect_wall_gaps(tolerance=5.0)
if gaps:
    fix_gaps_interactive(gaps)
```

### Rotation Calculator
```python
# Calculate correct rotation for any corner position
rotation = calculate_corner_rotation(position, foundation)
```

### Modular Asset Library
- Maintains database of asset dimensions
- Suggests compatible pieces
- Calculates required quantities

## Output Examples

### Construction Plan
```
2-Story House Construction Plan
===============================
Foundation: 10m x 8m at [10760, 660, 80]

Materials Required:
- Corners: 8x SM_Corner_2m
- Walls: 22x SM_FlatWall_3m, 4x SM_FlatWall_2m
- Doors: 2x SM_FlatWall_3m_SquareDoor
- Windows: 8x SM_FlatWall_2m_SquareWin
- Floor: 80x SM_Floor_1m

Phase 1: Ground Floor
- Step 1: Place corners at ±500, ±400 from foundation
- Step 2: Connect with walls...
```

### Verification Report
```
Building Integrity Check
========================
✅ All corners properly rotated
✅ No gaps detected in walls
✅ Doors accessible from ground
⚠️ Missing 2 floor tiles at [X, Y]
✅ All actors properly named
✅ Folder organization correct
```

## Integration with UEMCP
- Uses all available MCP tools
- Generates executable construction scripts
- Provides visual progress updates
- Maintains construction state across sessions