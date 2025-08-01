# Batch Spawn Tool Example

The `batch_spawn` tool enables efficient spawning of multiple actors in a single operation, significantly improving performance when placing many actors.

## Benefits

1. **Performance**: Disables viewport updates during batch operation
2. **Organization**: Common folder support for all spawned actors
3. **Validation**: Optional validation to ensure all actors spawned correctly
4. **Timing**: Provides execution time for performance monitoring

### Performance Note on Validation

The `validate` parameter defaults to `true` for safety, but for large batches (>100 actors), validation can add 0.5-2 seconds to execution time. If you're confident in your spawn parameters and need maximum performance, set `validate: false`.

## Example: Building a Wall Section

Instead of multiple individual spawn commands:

```javascript
// ❌ Inefficient: Multiple individual spawns
actor_spawn({ assetPath: "/Game/Wall", location: [0, 0, 0], name: "Wall_1" })
actor_spawn({ assetPath: "/Game/Wall", location: [300, 0, 0], name: "Wall_2" })
actor_spawn({ assetPath: "/Game/Wall", location: [600, 0, 0], name: "Wall_3" })
actor_spawn({ assetPath: "/Game/Corner", location: [900, 0, 0], rotation: [0, 0, 90], name: "Corner_1" })
// ... many more individual calls
```

Use batch spawn:

```javascript
// ✅ Efficient: Single batch operation
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

```javascript
// Generate floor plan for a building
const floors = [];
for (let floor_num = 0; floor_num < 3; floor_num++) {
  const z_offset = floor_num * 282;  // Standard floor height
  
  // North wall
  for (let x = 0; x < 1200; x += 300) {
    floors.push({
      assetPath: "/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m",
      location: [x, 0, z_offset],
      rotation: [0, 0, 270],  // Face south
      name: `Wall_N_${floor_num}_${Math.floor(x/300)}`
    });
  }
  
  // South wall with door
  for (let x = 0; x < 1200; x += 300) {
    if (x === 600) {  // Door position
      floors.push({
        assetPath: "/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareDoor",
        location: [x, 900, z_offset],
        rotation: [0, 0, 90],  // Face north
        name: `Door_S_${floor_num}`
      });
    } else {
      floors.push({
        assetPath: "/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m",
        location: [x, 900, z_offset],
        rotation: [0, 0, 90],  // Face north
        name: `Wall_S_${floor_num}_${Math.floor(x/300)}`
      });
    }
  }
  
  // Add corners
  const corners = [
    { location: [0, 0, z_offset], rotation: [0, 0, 0] },
    { location: [1200, 0, z_offset], rotation: [0, 0, 90] },
    { location: [1200, 900, z_offset], rotation: [0, 0, 180] },
    { location: [0, 900, z_offset], rotation: [0, 0, 270] }
  ];
  
  corners.forEach((corner, i) => {
    floors.push({
      assetPath: "/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner",
      location: corner.location,
      rotation: corner.rotation,
      name: `Corner_${floor_num}_${i}`
    });
  });
}

// Spawn entire building in one operation
batch_spawn({
  actors: floors,
  commonFolder: "Building/Structure",
  validate: true
});
```

## Performance Comparison

For a building with 100 actors:
- Individual spawns: ~12-15 seconds (with viewport updates)
- Batch spawn with validation: ~2-3 seconds (viewport updates disabled)
- Batch spawn without validation: ~1.5-2 seconds (maximum performance)

Example for performance-critical operations:
```javascript
// Spawn 500 actors for a large building complex
batch_spawn({
  actors: large_actor_array,  // 500 actors
  commonFolder: "LargeComplex",
  validate: false  // Skip validation for 20-30% faster execution
})
```

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