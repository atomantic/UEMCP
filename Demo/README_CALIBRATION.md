# Simple Calibration Grid - Demo Project

## Overview

The Demo project now uses a **simple calibration grid** made of colored geometric shapes instead of complex text rendering. This approach is:
- Much easier to manipulate programmatically
- More performant 
- Free from text rendering complications
- Visually clearer for calibration purposes

## Grid Structure

### Main Grid
- **7x7 grid** of colored cubes
- **200 units** spacing between elements
- **Center sphere** at position (3,3) for orientation
- **8 distinct colors**: Red, Green, Blue, Yellow, Cyan, Magenta, Orange, White

### Markers
- **4 corner cones** (NW, NE, SW, SE) in yellow
- Help with orientation and grid boundaries

### Ground Plane
- Dark gray plane for visual reference
- 20x20 scale units

## Color Manipulation

### Available Functions in UE Python Console

```python
# Apply rainbow pattern
create_rainbow_pattern()

# Create checkerboard pattern  
create_checkerboard()

# Set all elements to a single color
set_all_to_color(1.0, 0.0, 0.0)  # All red
set_all_to_color(0.0, 1.0, 0.0)  # All green
set_all_to_color(0.0, 0.0, 1.0)  # All blue
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

## Restoring Original Colors

If you want to restore the original color pattern:

```python
# In UE Python console
exec(open('/Users/antic/github.com/atomantic/UEMCP/Demo/update_calibration_grid.py').read())
```

Or use the apply_colors_to_grid() function to restore based on element names.

## Customization

You can easily modify the grid by changing these parameters in the creation script:

- `GRID_SIZE`: Number of rows/columns (currently 7)
- `CELL_SIZE`: Spacing between elements (currently 200 units)
- `CUBE_SCALE`: Size of each element (currently 0.8)

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