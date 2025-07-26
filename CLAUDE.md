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

# Configure for a UE project
python scripts/setup.py --project-path /path/to/ue/project

# Build the UE plugin
python scripts/build_plugin.py
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
python/     - Python utilities for development (not used at runtime)
docs/       - Documentation
tests/      - Test suites for all components
```

## Plugin Development Workflow

**IMPORTANT**: The plugin directory is symlinked from the git repository to the UE project:
```bash
# Symlink already exists:
/Users/antic/Documents/Unreal Projects/Home/Plugins/UEMCP -> /Users/antic/github.com/atomantic/UEMCP_dev/plugin
```

This means:
1. **Edit directly in git repository** - changes are immediately reflected in UE
2. **No copying needed** - the symlink handles file synchronization
3. **Just reload in UE** after making changes:
   ```python
   restart_listener()  # Reloads changes without restarting UE
   ```

When making changes to the plugin:

1. **Edit in git repository**:
   ```bash
   # Make changes in /Users/antic/github.com/atomantic/UEMCP_dev/plugin/
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
- `project_create` - Create new UE projects (mock implementation)
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
- `python_proxy` - Execute arbitrary Python code with full [UE API access](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/?application_version=5.6)
- `test_connection` - Test connection to Python listener
- `restart_listener` - Restart Python listener for hot reload
- `ue_logs` - Read recent lines from UE console log file

## Current Working Environment

- **Active UE Project**: /Users/antic/Documents/Unreal Projects/Home/
- **Plugin Location**: /Users/antic/Documents/Unreal Projects/Home/Plugins/UEMCP/
- **Python Listener**: Running on http://localhost:8765
- **Available Assets**: ModularOldTown building components in /Game/ModularOldTown/Meshes/

## Important Unreal Engine Conventions

### Rotation and Location Arrays
**CRITICAL**: Understanding Unreal Engine rotation arrays:

**Location [X, Y, Z]**: Position in 3D space (straightforward)

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