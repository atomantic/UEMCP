# House Building Plan and Progress

## Overview

This document consolidates all house building documentation, lessons learned, and the plan for completing the house construction using UEMCP.

## Current Status: Ground Floor Complete with Correct Cardinal Naming ✅

### What's Been Built
- **4 corner pieces** properly positioned and named with cardinal directions:
  - Corner_F1_NW at [10260, 260] (North-West)
  - Corner_F1_NE at [11260, 260] (North-East)
  - Corner_F1_SE at [11260, 1060] (South-East)
  - Corner_F1_SW at [10260, 1060] (South-West)
- **11 wall pieces** seamlessly connected (no gaps)
- **1 door** centered on the front wall
- **Foundation** at [10760, 660, 80]
- **All actors properly named** (e.g., Wall_Front_1, Corner_F1_SE)
- **All actors organized** in Estate/House/GroundFloor folders
- **Correct corner rotations** with sharp angles pointing outward (SE=0°)

### Phase 0 Completed Tasks
1. ✅ Deleted 2 underground actors at Z=-1000
2. ✅ Removed 4 duplicate corners (Corner_ versions)
3. ✅ Fixed all 4 corner positions to foundation ±500, ±400
4. ✅ Fixed all 12 wall positions to eliminate gaps
5. ✅ Added missing walls and door
6. ✅ Renamed all actors with descriptive names
7. ✅ Organized all actors in proper folder hierarchy
8. ✅ Saved the level
9. ✅ Verified no gaps remain in wireframe view

## Original Design Specification

### House Parameters
- **Foundation Location**: [10760, 690, 80] (already placed in scene)
- **Total Size**: 10m x 8m (1000cm x 800cm)
- **Floors**: 2 stories + roof
- **Grid Unit**: 100cm (1 meter)
- **Wall Height**: 282cm per floor

### Architectural Layout
```
Ground Floor Layout (Top View):

    Corner_Back_Left -------- Back Walls -------- Corner_Back_Right
           |                                              |
     Left Walls                                    Right Walls
           |                                              |
    Corner_Front_Left -- Front Walls + Door -- Corner_Front_Right
```

## Key Lessons Learned

### 1. Actor Pivot Points ⚠️
- **Critical Discovery**: ModularOldTown assets use CENTER pivot points, not corner pivots
- **Impact**: All placement calculations must account for half-dimensions
- **Example**: A 300x100 wall at position (X,Y) extends from (X-150, Y-50) to (X+150, Y+50)

### 2. Actor Naming Requirements 🏷️
- **Problem**: Spawned actors get generic names like "UEMCP_Actor_1753576458"
- **Solution**: Must provide meaningful names when spawning
- **Naming Convention**:
  - Walls: `Wall_[Side]_[Number]` (e.g., `Wall_Front_1`, `Wall_West_2`)
  - Corners: `Corner_[Position]` (e.g., `Corner_Front_Left`, `Corner_Back_Right`)
  - Doors: `Door_[Location]_[Number]` (e.g., `Door_Front_1`)
  - Windows: `Window_[Side]_[Number]` (e.g., `Window_East_1`)

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
- **Implementation**: Use `folderPath` parameter in actor_spawn

### 4. Viewport Camera Control 📸
- **Rotation Array**: [Pitch, Yaw, Roll] - NOT [X, Y, Z]
- **Common Mistake**: Using Roll instead of Pitch creates tilted horizon
- **Correct Views**:
  - Top-down: `[-90, 0, 0]` (Pitch=-90)
  - Perspective: `[-30, 45, 0]` (Pitch=-30, Yaw=45)
  - NEVER modify Roll unless creating Dutch angle

### 5. Asset Path Discoveries 📁
- **Window walls**: Use `SM_FlatWall_2m_SquareWin` (not Window_Square)
- **Door walls**: Use `SM_FlatWall_3m_SquareDoor` (not Door_Square)
- **All paths**: Must include subfolder like `/Walls/` or `/Ground/`

## ModularOldTown Asset Reference

### Standard Dimensions
| Asset Type | Dimensions (cm) | Grid Size |
|------------|-----------------|-----------|
| Corner | 100 x 100 x 282 | 1m x 1m |
| Wall 2m | 200 x 100 x 282 | 2m x 1m |
| Wall 3m | 300 x 100 x 282 | 3m x 1m |
| Floor 1m | 100 x 100 x 7 | 1m x 1m |

### Rotation Rules
- **North-South walls** (along X-axis): `[0, 0, 0]`
- **East-West walls** (along Y-axis): `[0, 0, -90]`
- **Corner rotations**:
  - Front-Left: `[0, 0, 0]`
  - Front-Right: `[0, 0, -90]`
  - Back-Right: `[0, 0, 180]`
  - Back-Left: `[0, 0, 90]`

## Technical Fixes Applied

### 1. Viewport API Updates
- Fixed deprecated `editor_set_camera_look_at_location` calls
- Updated to use `UnrealEditorSubsystem()` methods
- Removed invalid wireframe mode method calls

### 2. Wall Placement Algorithm
```javascript
// Account for center pivot and corner inset
const cornerSize = 100;
const wallThickness = 100;
const inset = cornerSize / 2;

// Example: Front wall placement
const frontY = foundation.y - (houseDepth/2) + (wallThickness/2);
const wallX = foundation.x - (houseWidth/2) + cornerSize + (wallWidth/2);
```

### 3. Gap Elimination Strategy
1. Delete overlapping walls
2. Calculate precise positions with corner insets
3. Verify with wireframe screenshots
4. Adjust as needed

## Completion Plan

### Phase 0: Fix Current Issues (Immediate)
1. **Clean up misplaced actors**
   - Delete actors at Z=-1000
   - Identify and remove duplicate/overlapping pieces

2. **Fix actor naming and organization**
   - Rename all UEMCP_Actor_* to proper names
   - Move all house actors to Estate/House folder structure
   - Use actor_organize tool or python_proxy

3. **Fix wall gaps and rotations**
   - Identify gap locations
   - Adjust wall positions for seamless connections
   - Fix corner rotations (use rotation guide above)

4. **Verify ground floor completion**
   - Take screenshots from multiple angles
   - Ensure all walls connect properly
   - Check corner alignments

### Phase 1: Second Floor (After fixes)
1. **Floor/Ceiling Separator**
   - Place SM_Floor_1m tiles (100x100) in 10x8 grid
   - Total: 80 floor pieces at Z = 140 + 282 = 422
   - Use proper naming: `Floor_Tile_[X]_[Y]`
   - Organize in `Estate/House/SecondFloor/Floor`

2. **Second Floor Walls**
   - Duplicate ground floor pattern
   - More windows, fewer solid walls
   - Same corner configuration
   - Proper naming and organization

### Phase 2: Roof Structure
1. **Roof Base**
   - SM_Roof_3m_Top pieces for main coverage
   - SM_Roof_1m_Edge for perimeter

2. **Roof Details**
   - Corner pieces for proper angles
   - Chimneys if available
   - Decorative elements

### Phase 3: Details & Polish
1. **Interior Elements**
   - Interior walls for rooms
   - Stairs between floors
   - Basic furniture placement

2. **Exterior Enhancement**
   - Balconies on second floor
   - Window shutters
   - Garden/fence around house

## MCP Enhancement Needs

### Critical Issues Found
1. **Asset Snapping**: Need socket-based placement
2. **Batch Operations**: Placing 80 floor tiles individually is tedious
3. **Actor Naming**: Custom names not being applied
4. **Screenshot Detection**: Files created but MCP reports failure
5. **Viewport Modes**: Need orthographic view support

### Proposed Solutions
1. Implement `actor_spawn_batch` for multiple placements
2. Add socket query to `asset_info`
3. Fix actor naming in spawn command
4. Add proper file detection timing
5. Implement `viewport_mode` tool

## Helper Scripts Available

### Verification Scripts
- `verify_house_build.js` - Check all components
- `ground-floor-verification.js` - Verify ground floor only
- `final-verification.js` - Multi-angle screenshots

### Placement Scripts
- `execute_house_plan.js` - Run TSV placement plan
- `fix-house-walls.js` - Fix wall gaps
- `fix-corners.js` - Correct corner rotations

### Organization Scripts
- `organize_all_house_actors.py` - Create World Outliner folders
- `cleanup-underground.js` - Remove misplaced actors

### Data Files
- `modular_dimensions.json` - Asset dimensions database
- `house_placement_plan_final.tsv` - Corrected placement coordinates

## Next Steps

1. **Test Second Floor Placement**
   ```javascript
   // Use execute_house_plan.js with new TSV for floor tiles
   ```

2. **Verify Current State**
   ```javascript
   node house-building-scripts/verify_house_build.js
   ```

3. **Continue Construction**
   - Follow Phase 1-3 plan above
   - Document any new issues
   - Update helper scripts as needed

## Success Metrics

- ✅ Ground floor complete with no gaps
- ✅ All actors have meaningful names
- ✅ All actors organized in Estate/House folders
- ⬜ Second floor with windows
- ⬜ Roof properly attached
- ⬜ Interior details added
- ⬜ MCP enhancements documented and implemented

## Immediate Action Items

1. **Create cleanup script** to fix current issues
2. **Update actor_spawn** to support custom names
3. **Update actor_spawn** to support folder paths
4. **Create batch placement helper** for floor tiles
5. **Document proper spawn parameters** in CLAUDE.md