# UEMCP Examples & Experiments

This document showcases interesting experiments and advanced use cases for UEMCP.

## House Building Experiment

Demonstrates complex modular construction using the ModularOldTown asset pack.

### Key Learnings
- Modular assets require precise 300-unit grid alignment
- Corner pieces need specific rotations to connect properly
- Use `placement_validate` to detect gaps and overlaps
- Wireframe view is essential for debugging placement

### Example: Two-Story House
```javascript
// Floor 1: 4 walls, 4 corners, 1 door
batch_spawn({
  actors: [
    { assetPath: "/Game/ModularOldTown/Meshes/SM_Wall_A", location: [0, 150, 0], rotation: [0, 0, 90] },
    { assetPath: "/Game/ModularOldTown/Meshes/SM_Wall_A", location: [0, -150, 0], rotation: [0, 0, 90] },
    { assetPath: "/Game/ModularOldTown/Meshes/SM_Wall_Door_A", location: [150, 0, 0], rotation: [0, 0, 0] },
    { assetPath: "/Game/ModularOldTown/Meshes/SM_Wall_A", location: [-150, 0, 0], rotation: [0, 0, 180] },
    // Corners require specific rotations
    { assetPath: "/Game/ModularOldTown/Meshes/SM_Corner_A", location: [150, 150, 0], rotation: [0, 0, 90] },
    { assetPath: "/Game/ModularOldTown/Meshes/SM_Corner_A", location: [150, -150, 0], rotation: [0, 0, 0] },
    { assetPath: "/Game/ModularOldTown/Meshes/SM_Corner_A", location: [-150, -150, 0], rotation: [0, 0, -90] },
    { assetPath: "/Game/ModularOldTown/Meshes/SM_Corner_A", location: [-150, 150, 0], rotation: [0, 0, 180] }
  ]
})

// Floor 2: Duplicate floor 1 with Z offset
actor_duplicate({ sourceName: "Wall_Floor1", offset: { z: 300 } })
```

## Asset Import from FAB

Import and configure FAB marketplace assets with custom settings.

### Example: Import with LODs and Collision
```javascript
asset_import({
  sourcePath: "/path/to/fab/medieval_pack",
  targetFolder: "/Game/ImportedAssets/Medieval",
  importSettings: {
    generateLODs: true,
    lodLevels: 4,
    generateCollision: true,
    importMaterials: true,
    createMaterialInstances: true
  }
})
```

## Placement Validation

Essential for modular building - detects gaps, overlaps, and alignment issues.

### Example: Validate Building Assembly
```javascript
// After placing modular pieces
placement_validate({
  actors: ["Wall_1", "Wall_2", "Corner_1", "Corner_2"],
  modularSize: 300,  // ModularOldTown grid size
  tolerance: 10,     // Allow 10 unit gaps
  checkAlignment: true
})

// Returns:
// {
//   valid: false,
//   gaps: [
//     { actors: ["Wall_1", "Wall_2"], distance: 15, location: [300, 0, 0] }
//   ],
//   overlaps: [],
//   alignmentIssues: [
//     { actor: "Corner_1", offset: [5, 0, 0], suggestion: [295, 0, 0] }
//   ]
// }
```

## Advanced Python Proxy Patterns

While dedicated MCP tools are preferred, `python_proxy` enables complex custom workflows.

### Example: Procedural City Block
```python
python_proxy({
  code: `
import unreal
import random

def create_city_block(center_x, center_y, block_size=3000, building_spacing=600):
    """Generate a procedural city block with random buildings"""
    buildings = []
    
    # Define building types and sizes
    building_types = [
        ("/Game/Buildings/Small", 300),
        ("/Game/Buildings/Medium", 450),
        ("/Game/Buildings/Large", 600)
    ]
    
    # Place buildings in grid
    for x in range(-block_size//2, block_size//2, building_spacing):
        for y in range(-block_size//2, block_size//2, building_spacing):
            if random.random() > 0.3:  # 70% building density
                building_type, size = random.choice(building_types)
                rotation = random.choice([0, 90, 180, 270])
                
                actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
                    unreal.EditorAssetLibrary.load_asset(building_type),
                    unreal.Vector(center_x + x, center_y + y, 0),
                    unreal.Rotator(0, rotation, 0)
                )
                buildings.append(actor.get_name())
    
    return buildings

result = create_city_block(0, 0)
`
})
```

## Tips for Complex Builds

1. **Always validate placement** after batch operations
2. **Use wireframe view** to debug alignment issues
3. **Keep actor names organized** with prefixes (Wall_, Door_, Window_)
4. **Save levels frequently** - UE Python operations can't be undone
5. **Test with small sections** before building entire structures

## Performance Optimization

- **Batch operations**: Use `batch_spawn` for >5 actors (85% faster)
- **Disable validation**: Set `validate: false` for trusted operations
- **Use folders**: Organize actors to improve editor performance
- **Screenshot optimization**: Use lower resolution for debugging (640x360)