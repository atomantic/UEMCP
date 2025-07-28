# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UEMCP (Unreal Engine Model Context Protocol) is an MCP server that bridges AI assistants with Unreal Engine development. The project is in active development with a working implementation.

## Architecture

The system consists of three main layers:
- **MCP Server** (TypeScript/Node.js): Implements Model Context Protocol, handles AI assistant requests
- **Python Bridge** (Python 3.11): Interfaces with Unreal Engine's Python API via HTTP (matches UE 5.4+ built-in Python)
- **UE Plugin** (Content-only): Python listener that runs inside Unreal Engine (no C++ compilation required)

## Development Commands

### Setup
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# The plugin is content-only and doesn't require building
# Simply copy the plugin folder to your UE project's Plugins directory
```

### Running
```bash
# Start MCP server
npm start

# Start with debug logging
DEBUG=uemcp:* npm start
```

### Testing
```bash
# Run JavaScript/TypeScript tests
npm test

# Run Python tests
python -m pytest tests/

# Run linting and CI checks before committing
./test-ci-locally.sh
```

## Project Structure

```
server/     - MCP server implementation (TypeScript)
plugin/     - Unreal Engine plugin (Python-only, no C++)
python/     - Legacy Python utilities (deprecated, not included in releases)
docs/       - Documentation
tests/      - Test suites for all components
```

## Plugin Development Workflow

When making changes to the plugin:

1. **Edit in git repository**:
   ```bash
   # Make changes in ./plugin/
   ```

2. **Reload in Unreal Engine** (Python console):
   ```python
   restart_listener()  # Reloads changes without restarting UE
   ```

3. **Commit changes**:
   ```bash
   git add -A && git commit -m "your changes"
   ```

## Helper Functions

To use helper functions in UE Python console:
```python
from uemcp_helpers import *
```

Available functions:
- `restart_listener()` - Hot reload the listener with code changes (stops, reloads, restarts automatically)
- `reload_uemcp()` - Alias for restart_listener()
- `status()` - Check if listener is running
- `stop_listener()` - Send stop signal to listener (non-blocking)
- `start_listener()` - Start the listener

### Hot Reload Workflow
To reload code changes without restarting Unreal Engine:
```python
restart_listener()  # One command does it all!
```

This will:
1. Signal the server to stop
2. Wait for it to stop
3. Clean up the port if needed
4. Reload the Python module with your changes
5. Start a fresh listener

The whole process takes about 2-3 seconds and doesn't freeze UE.

**Important**: Uses `uemcp_thread_tracker.py` to track threads across module reloads.

## Key Development Patterns

1. **Content-Only Plugin**: No C++ compilation needed, all functionality via Python
2. **Tool-Based Architecture**: Each UE operation exposed as a discrete MCP tool
3. **Hot Reload**: Use `restart_listener()` to test changes without restarting UE
4. **Sync Pattern**: Always sync changes between UE project and git repository
5. **Line Endings**: Always use LF (Unix-style) line endings, never CRLF (Windows-style)

## CRITICAL: MCP Tool Development Philosophy

**DO NOT TOLERATE BROKEN OR INCOMPLETE MCP TOOLS!**

When you encounter a situation where an MCP tool cannot accomplish what you need:

1. **NEVER resort to python_proxy as a workaround** - This defeats the purpose of having dedicated tools
2. **ALWAYS improve or create MCP tools** instead of writing complex Python code at runtime
3. **Identify patterns** - If you're using python_proxy for something, it's a sign we need a new tool

### Examples of when to create/fix tools:

❌ **WRONG**: Using python_proxy to get actor's asset path and rotation
✅ **RIGHT**: Enhance `level_actors` or create `actor_info` tool to return complete actor details

❌ **WRONG**: Using python_proxy to duplicate an actor
✅ **RIGHT**: Create `actor_duplicate` tool or enhance `actor_spawn` to accept a source actor

❌ **WRONG**: Using python_proxy to get material information
✅ **RIGHT**: Create `material_info` or enhance `asset_info` for materials

### Benefits of proper MCP tools:
- **85% less code** on average (see docs/mcp-tools-vs-python-proxy.md)
- **Better error handling** with meaningful messages
- **Type safety** and parameter validation
- **Consistent API** across all operations
- **Self-documenting** with clear parameter descriptions

### When to use python_proxy:
- **One-off debugging** or exploration
- **Testing new functionality** before creating a tool
- **Complex multi-step operations** that don't fit a single tool pattern
- **Never for common operations** that could be tools

## Important Configuration

For Claude Desktop integration:
```json
{
  "mcpServers": {
    "uemcp": {
      "command": "node",
      "args": ["/path/to/UEMCP/server/index.js"]
    }
  }
}
```

## Current Status

The project has a working implementation with the following MCP tools:
- `project_info` - Get project information
- `asset_list` - List and filter project assets
- `asset_info` - Get asset dimensions and properties
- `actor_spawn` - Spawn actors with folder organization
- `actor_delete` - Delete actors by name
- `actor_modify` - Modify actor transforms and folder paths
- `level_actors` - List actors in the current level
- `level_save` - Save the current level
- `level_outliner` - Get World Outliner folder structure
- `viewport_screenshot` - Capture viewport screenshots
- `viewport_camera` - Control viewport camera position
- `viewport_mode` - Switch between perspective/orthographic views
- `viewport_focus` - Focus viewport on specific actor
- `viewport_render_mode` - Change rendering mode (wireframe, unlit, etc)
- `python_proxy` - Execute arbitrary Python code with full [UE API access](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/?application_version=5.6). Can run ANY Python code including imports, loops, functions, classes. Has complete access to the unreal module for editor automation, asset manipulation, level editing, etc.
- `test_connection` - Test connection to Python listener
- `restart_listener` - Restart Python listener for hot reload
- `ue_logs` - Read recent lines from UE console log file

## Current Working Environment

- **Active UE Project**: /Users/antic/Documents/Unreal Projects/Home/
- **Plugin Location**: /Users/antic/Documents/Unreal Projects/Home/Plugins/UEMCP/
- **Python Listener**: Running on http://localhost:8765
- **Available Assets**: ModularOldTown building components in /Game/ModularOldTown/Meshes/

## Important Unreal Engine Conventions

### Viewport Camera Control

**CRITICAL**: Understanding viewport camera positioning:

1. **Camera Rotation [Roll, Pitch, Yaw]**:
   - **Pitch**: Tilt up/down (-90 = looking straight down, 0 = horizontal, 90 = looking straight up)
   - **Yaw**: Turn left/right (0 = north, 90 = east, 180 = south, -90 = west)
   - **Roll**: Tilt sideways (KEEP AT 0 for normal viewing - non-zero creates tilted horizon!)

2. **Focusing on Actors**:
   ```python
   # Method 1: Use viewport_focus tool
   viewport_focus({ actorName: 'HouseFoundation' })
   
   # Method 2: Use python_proxy for more control
   target_actor = unreal.EditorLevelLibrary.get_actor_reference('ActorName')
   unreal.EditorLevelLibrary.set_actor_selection_state(target_actor, True)

### Python Proxy Examples

The `python_proxy` tool provides unlimited Python execution capabilities:

```python
# Example 1: Complex actor manipulation
import unreal
import math

# Find all actors in a radius and rotate them
center = unreal.Vector(0, 0, 0)
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

for actor in all_actors:
    loc = actor.get_actor_location()
    distance = (loc - center).size()
    
    if distance < 1000:
        # Rotate based on distance
        rotation = actor.get_actor_rotation()
        rotation.yaw += distance * 0.1
        actor.set_actor_rotation(rotation)

# Example 2: Batch asset operations
assets = unreal.EditorAssetLibrary.list_assets("/Game/MyFolder")
for asset_path in assets:
    asset = unreal.EditorAssetLibrary.load_asset(asset_path)
    # Process each asset...

# Example 3: Custom editor automation
def place_actors_in_grid(asset_path, grid_size=5, spacing=200):
    """Place actors in a grid pattern"""
    for x in range(grid_size):
        for y in range(grid_size):
            location = unreal.Vector(x * spacing, y * spacing, 0)
            unreal.EditorLevelLibrary.spawn_actor_from_object(
                unreal.EditorAssetLibrary.load_asset(asset_path),
                location
            )

place_actors_in_grid("/Game/MyMesh", 3, 300)
```
   unreal.EditorLevelLibrary.focus_viewport_on_actors([target_actor])
   ```

3. **Common Camera Views**:
   - **Top-down**: Rotation = [-90, 0, 0] (Pitch=-90, looking straight down)
   - **Front view**: Rotation = [0, 0, 0] (horizontal, facing north)
   - **Isometric**: Rotation = [-30, 45, 0] (angled down, turned northeast)
   - **NEVER use Roll unless creating Dutch angle effects**

4. **Setting Proper Views**:
   ```python
   # CORRECT top-down view
   camera_location = unreal.Vector(10760, 690, 2000)  # Above target
   camera_rotation = unreal.Rotator(-90, 0, 0)  # Pitch=-90, Yaw=0, Roll=0
   
   # WRONG (creates sideways view with tilted horizon)
   camera_rotation = unreal.Rotator(0, 0, -90)  # This uses Roll instead of Pitch!
   ```

5. **IMPORTANT - Rotator Constructor Bug**:
   The `unreal.Rotator(a, b, c)` constructor has confusing parameter ordering that can cause Roll issues.
   **Always set rotation properties explicitly** to avoid problems:
   ```python
   # CORRECT - Set properties explicitly
   rotation = unreal.Rotator()
   rotation.pitch = -90.0  # Look down
   rotation.yaw = 0.0      # Face north
   rotation.roll = 0.0     # No tilt
   
   # AVOID - Constructor can cause Roll confusion
   rotation = unreal.Rotator(-90, 0, 0)  # May set Roll=-90 instead of Pitch=-90!
   ```

### Coordinate System
**CRITICAL**: Unreal Engine's coordinate system is counterintuitive:
- **X- = NORTH** (X decreases going North)
- **X+ = SOUTH** (X increases going South)
- **Y- = EAST** (Y decreases going East)
- **Y+ = WEST** (Y increases going West)
- **Z+ = UP** (Z increases going Up)

### Rotation and Location Arrays
**CRITICAL**: Understanding Unreal Engine rotation arrays:

**Location [X, Y, Z]**: Position in 3D space
- X axis: North (-) to South (+)
- Y axis: East (-) to West (+)
- Z axis: Down (-) to Up (+)

**Rotation [Roll, Pitch, Yaw]**: 
- **Roll** (index 0): Rotation around the forward X axis (tilting sideways)
- **Pitch** (index 1): Rotation around the right Y axis (looking up/down)  
- **Yaw** (index 2): Rotation around the up Z axis (turning left/right)

Common rotation examples for building:
- `[0, 0, 0]` - No rotation (default orientation)
- `[0, 0, 90]` - Rotate 90° clockwise around Z axis (turn right)
- `[0, 0, -90]` - Rotate 90° counter-clockwise around Z axis (turn left)
- `[0, 90, 0]` - Rotate 90° around Y axis (face up)
- `[90, 0, 0]` - Rotate 90° around X axis (tilt sideways)

**For modular building pieces**:
- Walls running along X-axis (North-South): Use rotation `[0, 0, 0]`
- Walls running along Y-axis (East-West): Use rotation `[0, 0, -90]`
- Corner pieces may need specific rotations like `[0, 0, 90]` or `[0, 90, 0]`

**Note**: The rotation array is [Roll, Pitch, Yaw], NOT [X, Y, Z] as the indices might suggest!

### Correct Wall Rotations for ModularOldTown

**CRITICAL**: The correct Yaw rotations for walls to face into the building:
- **North walls**: Yaw = 270° (-90°) - faces south into building
- **South walls**: Yaw = 90° - faces north into building  
- **East walls**: Yaw = 180° - faces west into building
- **West walls**: Yaw = 0° - faces east into building

**Note**: The default wall orientation faces a specific direction, so these rotations ensure windows/doors face inward.

### Best Practices for Actor Placement

**CRITICAL**: Always verify actor placement from multiple angles:

1. **Use Multiple Viewpoints**:
   - Take screenshots from perspective view first
   - Then switch to top/wireframe view to check alignment
   - Wireframe mode reveals gaps and overlaps clearly

2. **Modular Asset Snapping**:
   - ModularOldTown assets are typically 300 units (3m) wide
   - Corner pieces need specific rotations to connect properly
   - Check for gaps between walls - they should connect seamlessly

3. **Common Placement Issues**:
   - **Corner Rotation**: Corners must be rotated to match adjacent walls
   - **Wall Gaps**: Ensure walls are placed at exact 300-unit intervals
   - **Overlapping**: Check wireframe view for overlapping geometry
   - **Missing Actors**: Keep track of all placed actors (doors, windows)

4. **Verification Steps**:
   ```python
   # 1. List all actors to verify nothing is missing
   level_actors(filter="Wall")
   level_actors(filter="Door")
   
   # 2. Take wireframe screenshot from top
   viewport_render_mode(mode="wireframe")
   viewport_mode(mode="top")
   viewport_screenshot()
   
   # 3. Check actor positions mathematically
   # Walls should be at exact 300-unit intervals
   # Corners need proper rotation values
   ```

5. **Debugging Placement**:
   - If walls don't align, check both position AND rotation
   - Corner pieces often need 90° rotations
   - Use `actor_modify` to fix misaligned actors
   - Save level frequently to preserve progress

## Accessing Logs

### Unreal Engine Logs
UE logs are typically found in:
- **Editor Log**: Window → Developer Tools → Output Log (in UE Editor)
- **File Location**: `/Users/antic/Library/Logs/Unreal Engine/HomeEditor/Home.log`
- **Python Output**: Look for lines starting with `LogPython:` in the Output Log

**IMPORTANT**: Always check the UE log file when MCP commands report failure but may have actually succeeded (e.g., screenshot creation). The log file provides ground truth about what actually happened in Unreal Engine.

### UEMCP Debug Logging
To enable verbose UEMCP logging:
1. Set environment variable: `export UEMCP_DEBUG=1`
2. Or in UE Python console: `os.environ['UEMCP_DEBUG'] = '1'`
3. Then `restart_listener()` to apply

### MCP Server Logs
- Run with debug: `DEBUG=uemcp:* npm start`
- Logs appear in the terminal where the MCP server is running

**Note**: Claude can access log files directly via the filesystem if you provide the path. No special MCP tool is needed for log access.

## Screenshot Optimization

### File Size Reduction
The `viewport_screenshot` tool has been optimized to produce much smaller files for debugging:

**Default Settings (90-95% smaller files):**
- Resolution: 640×360 (down from 1280×720)
- Screen percentage: 50% (renders at half quality)
- Compression: Enabled (PNG → JPEG @ 60% quality)
- Expected size: ~50-100KB (down from 1MB+)

**Custom Parameters:**
```typescript
viewport_screenshot({
  width: 800,           // Custom width (default: 640)
  height: 450,          // Custom height (default: 360)  
  screenPercentage: 75, // Higher quality (default: 50)
  compress: false,      // Disable compression (default: true)
  quality: 80          // Higher JPEG quality (default: 60)
})
```

### Wireframe Mode for Better Detail
For debugging placement and structure, switch to wireframe view before screenshots:

```typescript
// Switch to wireframe for clearer structural detail
viewport_render_mode({ mode: 'wireframe' })

// Take screenshot - wireframe creates much smaller files
viewport_screenshot()

// Switch back to lit mode when done
viewport_render_mode({ mode: 'lit' })
```

**Benefits of Wireframe Screenshots:**
- Much smaller file sizes (simpler geometry)
- Clear structural details and edges
- Better for debugging placement and alignment
- Removes visual clutter from materials/lighting

## Code Style Guidelines

### Line Endings
**IMPORTANT**: Always use LF (Unix-style) line endings, not CRLF (Windows-style):
- Git is configured to warn about CRLF line endings
- All files should use `\n` not `\r\n`
- This prevents cross-platform issues and git warnings

### File Formatting
- Use spaces, not tabs (except in Makefiles)
- 2 spaces for JavaScript/TypeScript
- 4 spaces for Python
- No trailing whitespace
- Files should end with a single newline

## Troubleshooting Common Issues

1. **Port 8765 in use**: 
   ```python
   import uemcp_port_utils
   uemcp_port_utils.force_free_port(8765)
   ```

2. **Changes not reflected**: Always use `restart_listener()` after modifying Python files

3. **Audio buffer underrun**: This has been addressed by reducing command processing rate and screenshot resolution

4. **Deprecation warnings**: Fixed by using `UnrealEditorSubsystem()` instead of deprecated APIs

5. **Git CRLF warnings**: If you see "CRLF will be replaced by LF" warnings, the file has Windows line endings that need to be fixed