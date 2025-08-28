# Manual Testing Guide for UEMCP

## Testing with Claude Desktop

1. Add this configuration to your Claude Desktop settings:

```json
{
  "mcpServers": {
    "uemcp": {
      "command": "node",
      "args": ["<PATH_TO_UEMCP>/server/dist/index.js"],
      "env": {
        "DEBUG": "uemcp:*"
      }
    }
  }
}
```

2. Restart Claude Desktop

3. In a new conversation, you should be able to use the UEMCP tools:
   - Ask Claude to "create a new Unreal Engine project called TestProject"
   - The server will respond with the mock creation result

## Testing with MCP Inspector

You can also test using the MCP inspector tool:

```bash
npx @modelcontextprotocol/inspector node <PATH_TO_UEMCP>/server/dist/index.js
```

## Current Status

- ✅ Server starts successfully
- ✅ Proper MCP protocol implementation
- ✅ Error handling

## Example Project Configuration

For testing, ensure you have an Unreal Engine project available and set the `UE_PROJECT_PATH` environment variable:

```bash
export UE_PROJECT_PATH="/path/to/your/unreal/project"
```

## Socket Snapping Tests

### Prerequisites
- Unreal Engine project with UEMCP plugin installed
- ModularOldTown assets or similar modular building assets with sockets
- MCP server running and connected

### Running Socket Snapping Tests

There are two test suites available for socket snapping:

#### 1. Quick Test Script
Run the simple test script to verify basic functionality:
```bash
node scripts/test-socket-snap.js
```

This script will:
- Spawn test walls with sockets
- Snap doors and windows to their sockets
- Verify placement with validation
- Clean up test actors

#### 2. Comprehensive Integration Tests
For thorough testing with multiple scenarios:
```bash
node tests/integration/test-socket-snapping.js
```

This comprehensive test covers:
- Basic socket snapping
- Socket snapping with offsets
- Socket-to-socket alignment
- Error handling for non-existent sockets
- Complex multi-actor snapping scenarios

#### 3. Python Unit Tests (Run in UE Console)
For testing the mathematical operations directly in Unreal Engine:

```python
# In Unreal Engine Python console:
exec(open('/path/to/UEMCP/tests/python/test_socket_snapping.py').read())
```

Or import and run:
```python
import sys
sys.path.append('/path/to/UEMCP/tests/python')
from test_socket_snapping import run_socket_tests
run_socket_tests()
```

### Manual Testing Steps

1. **Basic Socket Test**:
   ```javascript
   // Spawn a wall with door socket
   actor_spawn({ assetPath: "/Game/ModularOldTown/Meshes/SM_MOT_Wall_Plain_Door_01", name: "TestWall" })
   
   // Spawn a door
   actor_spawn({ assetPath: "/Game/ModularOldTown/Meshes/SM_MOT_Door_01", name: "TestDoor", location: [500,500,0] })
   
   // Snap door to wall
   actor_snap_to_socket({ sourceActor: "TestDoor", targetActor: "TestWall", targetSocket: "DoorSocket" })
   ```

2. **Verify Socket Discovery**:
   ```javascript
   // Try invalid socket to see available sockets
   actor_snap_to_socket({ sourceActor: "TestDoor", targetActor: "TestWall", targetSocket: "InvalidSocket" })
   // Should return available sockets list
   ```

3. **Test with Offset**:
   ```javascript
   // Snap with vertical offset
   actor_snap_to_socket({ 
     sourceActor: "Window_01", 
     targetActor: "Wall_01", 
     targetSocket: "WindowSocket",
     offset: [0, 0, 50]  // Raise by 50 units
   })
   ```

### Expected Results

✅ **Success Indicators**:
- Actors snap to exact socket positions
- Rotations align correctly
- Validation confirms placement
- Available sockets listed when socket not found

❌ **Failure Indicators**:
- Actors remain at original positions
- Error messages about missing actors/sockets
- Validation reports gaps or overlaps

## Next Steps

The server is ready for basic testing. In the next development phases, we'll:
1. Add more tools (asset management, blueprint operations, etc.)
2. Implement the Python bridge to connect to actual Unreal Engine
3. Replace mock implementations with real UE operations