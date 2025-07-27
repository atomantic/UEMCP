# House Building Scripts Documentation

This folder contains helper scripts and documentation created during the house building experiment with UEMCP. These scripts can be reused when resuming the house construction task.

## Overview Documents

### `HOUSE_BUILD_SUMMARY.md`
Summary of the entire house building experiment, including challenges faced and lessons learned.

### `GROUND_FLOOR_COMPLETE.md`
Documentation of the completed ground floor state, including all actor placements and their coordinates.

### `house_design_plan.md`
Original design plan for the house structure, including room layout and architectural details.

### `modular_building_reference.md`
Reference guide for ModularOldTown assets, including dimensions, naming conventions, and usage patterns.

### `analyze_placement_issues.md`
Analysis of placement problems encountered, including pivot point misunderstandings and rotation issues.

## Data Files

### `modular_dimensions.json`
JSON file containing precise dimensions and pivot point information for ModularOldTown assets.

### `house_placement_plan.tsv`
Initial TSV-based placement plan with actor positions and rotations.

### `house_placement_plan_final.tsv`
Updated placement plan accounting for center pivot points.

### `house_placement_corrected.tsv`
Corrected placement plan after analyzing actual asset behavior.

## Verification Scripts

### `verify_house_build.js`
Main verification script that checks all house components are properly placed.

### `ground-floor-verification.js`
Specific verification for ground floor completion, checking walls, corners, doors, and windows.

### `final-verification.js`
Final verification script that takes screenshots from multiple angles to confirm placement.

### `check-actor-details.js`
Script to check detailed information about specific actors in the scene.

## Placement and Fix Scripts

### `execute_house_plan.js`
Main script to execute the TSV-based house placement plan.

### `fix-house-walls.js`
Script to fix wall placement issues, including gaps and misalignments.

### `fix-corners.js`
Specific script for fixing corner piece rotations and positions.

### `fix-gaps-direct.js`
Direct approach to fixing gaps between walls by repositioning actors.

### `fix-wall-placement-final.js`
Final comprehensive fix for all wall placement issues.

### `fix-walls-properly.js`
Alternative approach to fixing walls with proper mathematical calculations.

### `place-missing-walls.js`
Script to place any missing wall pieces that were overlooked.

### `cleanup-underground.js`
Cleanup script to remove actors that were accidentally placed underground.

## Python Helper Scripts

### `check_back_walls.py`
Python script to verify back wall placement and alignment.

### `organize_house_actors.py`
Script to organize all house actors into proper World Outliner folders.

### `organize_all_house_actors.py`
Comprehensive organization script for all actors in the house structure.

### `find_viewport_method.py`
Script to discover available viewport control methods in UE Python API.

### `restart_and_test_viewport.py`
Script to restart the listener and test viewport functionality.

### `test_viewport_commands.py`
Test various viewport camera control commands.

## Viewport Testing Scripts

### `test-viewport.js`
Initial viewport testing script to understand camera control.

### `test-viewport-fixed.js`
Updated viewport test with fixes for rotation issues.

### `test_viewport_and_placement.js`
Comprehensive test of viewport control and actor placement behavior.

### `check_house_properly.js`
Script to properly check house from multiple viewport angles.

## Key Learnings

1. **Pivot Points**: ModularOldTown assets use center pivot points, not corner pivots
2. **Rotations**: Use [Roll, Pitch, Yaw] array, but for building typically only modify Yaw
3. **Wall Dimensions**: Standard walls are 300x20x340 units (3m x 0.2m x 3.4m)
4. **Corner Pieces**: Corners are 100x100x340 units and need specific rotations
5. **Viewport Control**: Never use Roll for normal viewing - causes tilted horizon

## Usage Pattern

When resuming house building:

1. Review `HOUSE_BUILD_SUMMARY.md` and `GROUND_FLOOR_COMPLETE.md` for current state
2. Use `verify_house_build.js` to check what's already placed
3. Reference `modular_dimensions.json` for accurate asset dimensions
4. Use placement scripts like `execute_house_plan.js` with TSV files
5. Run verification scripts to check placement
6. Use fix scripts to correct any issues
7. Organize actors with `organize_all_house_actors.py`

## Common Commands

```javascript
// Verify current state
node house-building-scripts/verify_house_build.js

// Execute placement plan
node house-building-scripts/execute_house_plan.js

// Fix placement issues
node house-building-scripts/fix-house-walls.js

// Take verification screenshots
node house-building-scripts/final-verification.js
```

```python
# In UE Python console
exec(open('/path/to/house-building-scripts/organize_all_house_actors.py').read())
```