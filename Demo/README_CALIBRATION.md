# Simple Calibration Grid - Demo Project

## Overview

The Demo project now uses a **simple calibration grid** made of colored geometric shapes instead of complex text rendering. This approach is:
- Much easier to manipulate programmatically
- More performant 
- Free from text rendering complications
- Visually clearer for calibration purposes

## Grid Structure

### Main Grid
- **8x10 grid** of colored cubes (8 rows × 10 columns)
- **150 units** spacing between elements
- **Center markers** at corners for orientation
- **8 distinct colors**: Red, Green, Blue, Yellow, Cyan, Magenta, Orange, White

### Markers
- **4 corner cones** (NW, NE, SW, SE) in yellow
- Help with orientation and grid boundaries

### Ground Plane
- Dark gray plane for visual reference
- 20x20 scale units

## Color Manipulation

### Using Helper Scripts

The repository includes helper scripts in the `scripts/` folder for manipulating the calibration grid:

```python
# Run from UE Python console:
exec(open('/path/to/UEMCP/scripts/manipulate-calibration-colors.py').read())

# Then use these functions:
create_rainbow_pattern()
create_checkerboard_pattern()
randomize_colors()
create_gradient()
change_all_grid_colors((1, 0, 0))  # All red
```

### Using MCP Tools

```javascript
// Change individual element colors
mcp.python_proxy({
  code: `
    actor = unreal.EditorLevelLibrary.get_actor_reference("CalibCube_3_3_Orange")
    mesh_comp = actor.get_component_by_class(unreal.StaticMeshComponent)
    mid = mesh_comp.create_dynamic_material_instance(0)
    mid.set_vector_parameter_value("BaseColor", unreal.LinearColor(1, 0, 1, 1))
  `
})
```

## Advantages Over Text-Based Calibration

1. **Simple Materials**: Uses basic dynamic material instances with just color parameters
2. **No Font Dependencies**: No text rendering issues or font loading problems
3. **Easy Color Control**: Direct RGB values without complex material graphs
4. **Better Performance**: Geometric shapes render faster than text
5. **Predictable Behavior**: No text alignment or scaling issues

## Element Naming Convention

Each grid element follows this naming pattern:
```
Calib[Shape]_[Row]_[Column]_[ColorName]
```

Examples:
- `CalibCube_0_0_Red` - Top-left red cube
- `CalibSphere_3_3_Orange` - Center orange sphere
- `CalibCube_6_6_Magenta` - Bottom-right magenta cube

## Folder Structure

All calibration elements are organized in the World Outliner:
```
CalibrationGrid/
  ├── CalibCube_* (grid elements)
  ├── CalibSphere_* (center marker)
  ├── CalibrationGround (ground plane)
  └── Markers/
      ├── Marker_NW
      ├── Marker_NE
      ├── Marker_SW
      └── Marker_SE
```

## Creating New Grids

To create different grid configurations, use the scripts in the `scripts/` folder:

```javascript
// Create a 10x10 grid with materials
node scripts/create-simple-calibration-grid.js

// Create ultra-simple grid with basic shapes
node scripts/create-ultra-simple-grid.js
```

Or use Python scripts for plane-based grids:
```python
exec(open('/path/to/UEMCP/scripts/create-plane-calibration-grid.py').read())
```

## Customization

The Demo project's calibration grid uses:

- **Grid Size**: 8 rows × 10 columns  
- **Cell Size**: 150 units spacing between elements
- **Element Scale**: 0.8 scale for each shape

You can modify these values in the creation scripts to suit your needs.

## Troubleshooting

If colors don't appear:
1. Make sure the Python listener is running
2. Try using different parameter names: "BaseColor", "Color", "Base Color"
3. Check that dynamic material instances are being created properly
4. Verify the base material supports color parameters

## Next Steps

This simple calibration grid can be extended with:
- Different shapes per row/column
- Gradient patterns
- Animation through color cycling
- Interactive color picking
- Save/load color configurations

The key benefit is that all manipulation is now straightforward RGB color changes on simple geometric shapes!