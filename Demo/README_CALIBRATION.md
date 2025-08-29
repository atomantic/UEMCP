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

### Using Python in UE Console

You can manipulate the grid colors directly in the UE Python console:

```python
import unreal

# Get all calibration grid actors
actors = unreal.EditorLevelLibrary.get_all_level_actors()
grid_actors = [a for a in actors if 'CalibCube' in a.get_actor_label()]

# Change colors using dynamic materials
for actor in grid_actors:
    mesh_comp = actor.get_component_by_class(unreal.StaticMeshComponent)
    if mesh_comp:
        material = mesh_comp.get_material(0)
        dynamic_mat = mesh_comp.create_dynamic_material_instance(0)
        # Set to red (R=1, G=0, B=0)
        dynamic_mat.set_vector_parameter_value("BaseColor", unreal.LinearColor(1, 0, 0, 1))
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

## Modifying the Grid

The grid is built into the Demo project's Calibration.umap level. To modify it:

1. Open the level in Unreal Engine
2. Select grid actors in the World Outliner (under CalibrationGrid folder)
3. Adjust properties like position, scale, or materials
4. Save the level to preserve changes

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