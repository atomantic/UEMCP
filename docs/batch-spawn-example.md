# Batch Spawn Tool Example

The `batch_spawn` tool enables efficient spawning of multiple actors in a single operation, significantly improving performance when placing many actors.

## Benefits

1. **Performance**: Disables viewport updates during batch operation
2. **Organization**: Common folder support for all spawned actors
3. **Validation**: Optional validation to ensure all actors spawned correctly
4. **Timing**: Provides execution time for performance monitoring

## Example: Building a Wall Section

Instead of multiple individual spawn commands:

```python
# ❌ Inefficient: Multiple individual spawns
actor_spawn({ assetPath: "/Game/Wall", location: [0, 0, 0], name: "Wall_1" })
actor_spawn({ assetPath: "/Game/Wall", location: [300, 0, 0], name: "Wall_2" })
actor_spawn({ assetPath: "/Game/Wall", location: [600, 0, 0], name: "Wall_3" })
actor_spawn({ assetPath: "/Game/Corner", location: [900, 0, 0], rotation: [0, 0, 90], name: "Corner_1" })
# ... many more individual calls
```

Use batch spawn:

```python
# ✅ Efficient: Single batch operation
batch_spawn({
  actors: [
    { assetPath: "/Game/Wall", location: [0, 0, 0], name: "Wall_1" },
    { assetPath: "/Game/Wall", location: [300, 0, 0], name: "Wall_2" },
    { assetPath: "/Game/Wall", location: [600, 0, 0], name: "Wall_3" },
    { assetPath: "/Game/Corner", location: [900, 0, 0], rotation: [0, 0, 90], name: "Corner_1" }
  ],
  commonFolder: "Building/FirstFloor/Walls",
  validate: true
})
```

## Complex Example: Multi-Story Building

```python
# Generate floor plan for a building
floors = []
for floor_num in range(3):
  z_offset = floor_num * 282  # Standard floor height
  
  # North wall
  for x in range(0, 1200, 300):
    floors.append({
      assetPath: "/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m",
      location: [x, 0, z_offset],
      rotation: [0, 0, 270],  # Face south
      name: f"Wall_N_{floor_num}_{x//300}"
    })
  
  # South wall with door
  for x in range(0, 1200, 300):
    if x == 600:  # Door position
      floors.append({
        assetPath: "/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareDoor",
        location: [x, 900, z_offset],
        rotation: [0, 0, 90],  # Face north
        name: f"Door_S_{floor_num}"
      })
    else:
      floors.append({
        assetPath: "/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m",
        location: [x, 900, z_offset],
        rotation: [0, 0, 90],  # Face north
        name: f"Wall_S_{floor_num}_{x//300}"
      })
  
  # Add corners
  corners = [
    { location: [0, 0, z_offset], rotation: [0, 0, 0] },
    { location: [1200, 0, z_offset], rotation: [0, 0, 90] },
    { location: [1200, 900, z_offset], rotation: [0, 0, 180] },
    { location: [0, 900, z_offset], rotation: [0, 0, 270] }
  ]
  
  for i, corner in enumerate(corners):
    floors.append({
      assetPath: "/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner",
      location: corner['location'],
      rotation: corner['rotation'],
      name: f"Corner_{floor_num}_{i}"
    })

# Spawn entire building in one operation
batch_spawn({
  actors: floors,
  commonFolder: "Building/Structure",
  validate: true
})
```

## Performance Comparison

For a building with 100 actors:
- Individual spawns: ~12-15 seconds (with viewport updates)
- Batch spawn: ~2-3 seconds (viewport updates disabled)

## Response Format

```
Batch Spawn Results: 95/100 actors spawned successfully

Successfully spawned:
  ✓ Wall_N_0_0 at [0, 0, 0]
  ✓ Wall_N_0_1 at [300, 0, 0]
  ✓ Wall_N_0_2 at [600, 0, 0]
  ... (90 more)

Failed to spawn:
  ✗ /Game/MissingAsset: Failed to load asset: /Game/MissingAsset
  ✗ /Game/Wall: Spawn failed - check location for collisions

Execution time: 2.34s
```

## Best Practices

1. **Pre-validate Assets**: Check that all asset paths exist before batch spawn
2. **Organize by Function**: Use commonFolder to group related actors
3. **Name Consistently**: Use systematic naming for easier management
4. **Monitor Performance**: Check execution time for large batches
5. **Handle Failures**: Check failedSpawns array and handle appropriately