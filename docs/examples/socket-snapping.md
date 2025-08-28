# Socket-Based Actor Placement

This example demonstrates how to use the `actor_snap_to_socket` tool for precise modular building placement using Unreal Engine's socket system.

## What are Sockets?

Sockets are named attachment points on meshes that define:
- **Position**: Where to attach objects relative to the mesh
- **Rotation**: Which direction attached objects should face
- **Scale**: Optional scaling for attached objects

They're standard Unreal Engine features used for modular building, weapon attachments, and any scenario requiring precise placement.

## Basic Socket Snapping

### Example 1: Snapping a Door to a Wall

```javascript
// Spawn a wall with a door socket
await actor_spawn({
  assetPath: "/Game/ModularOldTown/Meshes/SM_MOT_Wall_Plain_Door_01",
  location: [0, 0, 0],
  name: "Wall_01"
});

// Spawn a door somewhere else
await actor_spawn({
  assetPath: "/Game/ModularOldTown/Meshes/SM_MOT_Door_01",
  location: [500, 500, 0],  // Temporary location
  name: "Door_01"
});

// Snap the door to the wall's socket
await actor_snap_to_socket({
  sourceActor: "Door_01",
  targetActor: "Wall_01",
  targetSocket: "DoorSocket"
});
// Result: Door perfectly aligned with wall opening
```

### Example 2: Window Placement with Offset

```javascript
// Snap a window to a wall socket with vertical offset
await actor_snap_to_socket({
  sourceActor: "Window_01",
  targetActor: "Wall_02",
  targetSocket: "WindowSocket",
  offset: [0, 0, 10]  // Raise window by 10 units
});
```

### Example 3: Connecting Modular Walls

```javascript
// Connect walls using their connection sockets
await actor_snap_to_socket({
  sourceActor: "Wall_02",
  targetActor: "Wall_01",
  targetSocket: "WallSocket_Right",
  sourceSocket: "WallSocket_Left"  // Align socket-to-socket
});
```

## Advanced Usage

### Building a Complete Wall Section

```javascript
async function buildWallSection(startX, startY) {
  // Spawn base wall
  await actor_spawn({
    assetPath: "/Game/ModularOldTown/Meshes/SM_MOT_Wall_Plain_01",
    location: [startX, startY, 0],
    name: "BaseWall"
  });

  // Add door wall to the right
  await actor_spawn({
    assetPath: "/Game/ModularOldTown/Meshes/SM_MOT_Wall_Plain_Door_01",
    location: [0, 0, 0],  // Temporary - will snap
    name: "DoorWall"
  });

  // Snap door wall to base wall's right socket
  await actor_snap_to_socket({
    sourceActor: "DoorWall",
    targetActor: "BaseWall",
    targetSocket: "WallSocket_Right"
  });

  // Add window wall to the right of door wall
  await actor_spawn({
    assetPath: "/Game/ModularOldTown/Meshes/SM_MOT_Wall_Window_01",
    location: [0, 0, 0],
    name: "WindowWall"
  });

  await actor_snap_to_socket({
    sourceActor: "WindowWall",
    targetActor: "DoorWall",
    targetSocket: "WallSocket_Right"
  });

  // Add door to door wall
  await actor_spawn({
    assetPath: "/Game/ModularOldTown/Meshes/SM_MOT_Door_01",
    location: [0, 0, 0],
    name: "Door"
  });

  await actor_snap_to_socket({
    sourceActor: "Door",
    targetActor: "DoorWall",
    targetSocket: "DoorSocket"
  });

  // Add window to window wall
  await actor_spawn({
    assetPath: "/Game/ModularOldTown/Meshes/SM_MOT_Window_01",
    location: [0, 0, 0],
    name: "Window"
  });

  await actor_snap_to_socket({
    sourceActor: "Window",
    targetActor: "WindowWall",
    targetSocket: "WindowSocket"
  });
}
```

## Discovering Available Sockets

Use `asset_info` to discover sockets on a mesh:

```javascript
const info = await asset_info({
  assetPath: "/Game/ModularOldTown/Meshes/SM_MOT_Wall_Plain_Door_01"
});

// Response includes:
// Sockets:
//   • DoorSocket: [0.0, 15.0, 0.0] | Rotation: [0.0, 0.0, 0.0]
//   • WallSocket_Left: [-150.0, 0.0, 0.0] | Rotation: [0.0, 0.0, 0.0]  
//   • WallSocket_Right: [150.0, 0.0, 0.0] | Rotation: [0.0, 0.0, 0.0]
```

## Error Handling

The tool provides helpful error messages:

```javascript
// If socket doesn't exist
const result = await actor_snap_to_socket({
  sourceActor: "Door_01",
  targetActor: "Wall_01",
  targetSocket: "NonExistentSocket"
});

// Error response includes available sockets:
// {
//   success: false,
//   error: 'Socket "NonExistentSocket" not found on Wall_01',
//   availableSockets: ['DoorSocket', 'WallSocket_Left', 'WallSocket_Right']
// }
```

## Benefits Over Manual Placement

### Before (Manual Calculation)
```javascript
// Complex math to figure out door position
const wallLocation = [1000, 500, 0];
const wallRotation = [0, 0, 90];
const doorOffset = 15;  // How far door is from wall surface
const doorHeight = 0;    // Door ground level

// Calculate door position based on wall rotation
const radians = wallRotation[2] * Math.PI / 180;
const doorX = wallLocation[0] + Math.cos(radians) * doorOffset;
const doorY = wallLocation[1] + Math.sin(radians) * doorOffset;

await actor_spawn({
  assetPath: "/Game/ModularOldTown/Meshes/SM_MOT_Door_01",
  location: [doorX, doorY, doorHeight],
  rotation: wallRotation  // Match wall rotation
});
```

### After (Socket Snapping)
```javascript
// Just snap to the socket!
await actor_snap_to_socket({
  sourceActor: "Door_01",
  targetActor: "Wall_01",
  targetSocket: "DoorSocket"
});
```

## Best Practices

1. **Use Consistent Socket Names**: Establish naming conventions like:
   - `DoorSocket` for door attachments
   - `WindowSocket` for window attachments
   - `WallSocket_Left/Right` for wall connections
   - `FloorSocket_Top` for stacking floors

2. **Validate After Snapping**: Use the `validate` parameter to ensure successful placement:
   ```javascript
   const result = await actor_snap_to_socket({
     sourceActor: "Door_01",
     targetActor: "Wall_01",
     targetSocket: "DoorSocket",
     validate: true  // Confirms placement succeeded
   });
   ```

3. **Batch Operations**: For complex buildings, combine with `batch_spawn`:
   ```javascript
   // Spawn all walls first
   await batch_spawn({ actors: wallConfigs });
   
   // Then snap them together
   for (const connection of wallConnections) {
     await actor_snap_to_socket(connection);
   }
   ```

4. **Use Socket-to-Socket for Precision**: When both actors have sockets, use both:
   ```javascript
   await actor_snap_to_socket({
     sourceActor: "Wall_02",
     targetActor: "Wall_01",
     targetSocket: "WallSocket_Right",
     sourceSocket: "WallSocket_Left"  // Perfect alignment
   });
   ```

## Performance Considerations

- Socket snapping is nearly instantaneous (< 50ms typical)
- No complex math calculations needed
- Validation adds minimal overhead (~10ms)
- More efficient than manual coordinate calculation

## Troubleshooting

### Common Issues

1. **Socket Not Found**: Check socket name spelling and use `asset_info` to list available sockets
2. **Incorrect Orientation**: Ensure socket rotation is set correctly in the Static Mesh Editor
3. **Offset Issues**: Remember offsets are in world space, affected by socket rotation
4. **Actor Not Moving**: Check if actor is locked or has physics enabled

### Debug Workflow

```javascript
// 1. List available sockets
const info = await asset_info({ assetPath: "/Game/MyMesh" });

// 2. Test snap with validation
const result = await actor_snap_to_socket({
  sourceActor: "TestActor",
  targetActor: "TargetActor",
  targetSocket: "SocketName",
  validate: true
});

// 3. Check validation result
if (!result.validation?.success) {
  console.log("Snap may have failed:", result.validation?.message);
}

// 4. Verify with placement validation
await placement_validate({
  actors: ["TestActor", "TargetActor"],
  tolerance: 5
});
```

## Related Tools

- **asset_info**: Discover sockets on meshes
- **placement_validate**: Verify correct modular placement
- **batch_spawn**: Spawn multiple actors before snapping
- **actor_modify**: Fine-tune position after snapping if needed

## Summary

The `actor_snap_to_socket` tool transforms modular building from a mathematical challenge to a simple "connect the dots" operation, leveraging Unreal Engine's built-in socket system for perfect placement every time.