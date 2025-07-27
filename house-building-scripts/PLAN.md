# House Building Plan and Progress

## Overview

This document consolidates all house building documentation, lessons learned, and the plan for completing the house construction using UEMCP.

## Current Status: Ground Floor Complete ✅

### What's Been Built
- **4 corner pieces** properly placed and rotated
- **14 wall pieces** positioned with correct 100-unit inset
- **3 door pieces** (includes duplicates at same position)
- All components properly aligned with no gaps or overlaps

### Screenshot Evidence
- Ground floor structure verified from multiple angles
- Wireframe view confirmed proper alignment
- All pieces connect seamlessly

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

### 2. Viewport Camera Control 📸
- **Rotation Array**: [Pitch, Yaw, Roll] - NOT [X, Y, Z]
- **Common Mistake**: Using Roll instead of Pitch creates tilted horizon
- **Correct Views**:
  - Top-down: `[-90, 0, 0]` (Pitch=-90)
  - Perspective: `[-30, 45, 0]` (Pitch=-30, Yaw=45)
  - NEVER modify Roll unless creating Dutch angle

### 3. Actor Naming Issue 🏷️
- **Problem**: Spawned actors get generic names like "UEMCP_Actor_1753576458"
- **Impact**: Custom names not applied, making verification difficult
- **Workaround**: Track actors by position or use organization scripts

### 4. Asset Path Discoveries 📁
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

### Phase 1: Second Floor (Next)
1. **Floor/Ceiling Separator**
   - Place SM_Floor_1m tiles (100x100) in 10x8 grid
   - Total: 80 floor pieces at Z = 140 + 282 = 422

2. **Second Floor Walls**
   - Duplicate ground floor pattern
   - More windows, fewer solid walls
   - Same corner configuration

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

- ⬜ Ground floor complete with no gaps
- ⬜ Second floor with windows
- ⬜ Roof properly attached
- ⬜ Interior details added
- ⬜ All actors organized in World Outliner
- ⬜ MCP enhancements documented and implemented