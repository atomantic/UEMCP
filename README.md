# UEMCP - Unreal Engine Model Context Protocol

![Unreal Engine](https://img.shields.io/badge/Unreal%20Engine-5.x-blue?logo=unrealengine)
![MCP](https://img.shields.io/badge/MCP-Compatible-green)
![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)

UEMCP bridges AI assistants with Unreal Engine, enabling intelligent control of game development workflows through the Model Context Protocol (MCP).


## 🚀 Quick Start (2 minutes)

```bash
# Clone and setup
git clone https://github.com/atomantic/UEMCP.git
cd UEMCP
node init.js

# Restart Claude Desktop or Claude Code and test:
# "List available UEMCP tools"
# "Organize the actors in the current map into a sensible folder structure and naming convention"
```

The init script automatically:
- ✅ Installs dependencies and builds the server
- ✅ Configures Claude Desktop (or Claude Code with `--claude-code` flag)
- ✅ Sets up your Unreal Engine project path
- ✅ Optionally installs the UEMCP plugin to your project

**Advanced options:**
```bash
# Configure for Claude Code (claude.ai/code)
node init.js --claude-code

# Specify UE project (automatically installs plugin to specified unreal engine project)
node init.js --project "/path/to/project.uproject"

# Install with symlink for plugin development
node init.js --project "/path/to/project.uproject" --symlink

# Non-interactive with all options
node init.js --claude-code --project "/path/to/project.uproject" --no-interactive
```

## Prompt Examples

The sky is the limit with what you can ask the agent to do. Here are example prompts organized by complexity:

### Basic Commands
- Show me all wall meshes in the ModularOldTown folder
- Spawn a cube at location 1000, 500, 0
- Take a screenshot of the current viewport
- List all actors with 'Door' in their name
- Focus the camera on the player start
- Check the UE logs for any errors

### Complex Tasks
- Add the Rive Unreal plugin to this project: https://github.com/rive-app/rive-unreal
- Use the OldModularTown assets in this project to build the first floor of a house
- Find all the maze walls and invert them on the X axis to flip the maze over
- Add a textured and colored material to the HorseArena floor

### Advanced Python Control
- Use python_proxy to get all actors of type StaticMeshActor
- Execute Python to change all lights to blue
- Run Python code to analyze material usage in the level
- Batch rename all actors to follow a consistent naming convention
- Create a custom layout algorithm for procedural level generation


## 🎯 Key Feature: Full Python Access in Editor Mode

**The `python_proxy` tool provides complete, unrestricted access to Unreal Engine's Python API.** This means AI assistants can execute ANY Python code within the UE editor - from simple queries to complex automation scripts. All other MCP tools are essentially convenience wrappers around common operations that could be done through `python_proxy`.

### Why have other tools if python_proxy can do everything?

1. **Efficiency**: Specific tools like `actor_spawn` or `viewport_screenshot` are optimized shortcuts for common tasks that remove the need for your AI to write larger amounts of python code.
2. **Clarity**: Named tools make AI intent clearer (e.g., "spawn an actor" vs "execute Python code")
3. **Error Handling**: Dedicated tools provide better validation and error messages
4. **Performance**: Less overhead than parsing and executing arbitrary Python for simple operations
5. **Discoverability**: AI assistants can easily see available operations without knowing the UE Python API

### Example: Taking a Screenshot

**Using the convenient `viewport_screenshot` mcp tool:**
```javascript
// One line, clear intent, automatic file handling
viewport_screenshot({ width: 1920, height: 1080, quality: 80 })
```

**Using `python_proxy` for the same task:**
```python
# Much more complex, requires knowing UE Python API
import unreal
import os
import time

# Get project paths
project_path = unreal.Paths.project_saved_dir()
screenshot_dir = os.path.join(project_path, "Screenshots", "MacEditor")

# Ensure directory exists
if not os.path.exists(screenshot_dir):
    os.makedirs(screenshot_dir)

# Generate filename with timestamp
timestamp = int(time.time() * 1000)
filename = f"uemcp_screenshot_{timestamp}.png"
filepath = os.path.join(screenshot_dir, filename)

# Take screenshot with proper settings
unreal.AutomationLibrary.take_high_res_screenshot(
    1920, 1080,
    filepath,
    camera=None,
    capture_hdr=False,
    comparison_tolerance=unreal.ComparisonTolerance.LOW
)

# Would need additional error handling, JPEG conversion for quality, etc.
result = f"Screenshot saved to: {filepath}"
```

Think of it like this: `python_proxy` is the powerful command line, while other tools are the convenient GUI buttons.

📊 **[See detailed comparison of MCP tools vs python_proxy →](docs/reference/mcp-tools-vs-python-proxy.md)** (average 80%+ code reduction!)

## 🛠 Available Tools

UEMCP provides 30 tools to Claude for controlling Unreal Engine:

### Project & Assets
- **project_info** - Get current project information
- **asset_list** - List and filter project assets
- **asset_info** - Get detailed asset information (dimensions, materials, etc.)
- **asset_import** - Import assets from FAB marketplace or local files with advanced settings

### Level Editing
- **actor_spawn** - Spawn actors from any mesh or blueprint
- **batch_spawn** - Spawn multiple actors efficiently in one operation
- **actor_duplicate** - Duplicate existing actors with optional offset
- **actor_delete** - Delete actors by name
- **actor_modify** - Change actor transform and organization
- **actor_organize** - Organize actors into World Outliner folders
- **actor_snap_to_socket** - Snap actors to socket points for precise modular placement
- **placement_validate** - Validate modular building placement to detect gaps, overlaps, and alignment issues
- **level_actors** - List all actors in the current level
- **level_save** - Save the current level
- **level_outliner** - View World Outliner folder structure

### Viewport Control
- **viewport_screenshot** - Capture viewport screenshots
- **viewport_camera** - Control camera position and orientation
- **viewport_mode** - Switch between perspective/orthographic views
- **viewport_focus** - Focus on specific actors
- **viewport_render_mode** - Change rendering mode (wireframe, unlit, etc.)
- **viewport_bounds** - Get current viewport boundaries and visible area
- **viewport_fit** - Auto-frame actors in viewport
- **viewport_look_at** - Point camera at specific coordinates or actor with automatic Yaw calculation

### Material Management
- **material_list** - List and filter materials in the project
- **material_info** - Get detailed material information including parameters and parent material
- **material_create** - Create new materials or material instances with customizable parameters
- **material_apply** - Apply materials to actors' static mesh components

### 🔍 Validation Feature

All actor manipulation tools (`actor_spawn`, `actor_modify`, `actor_delete`, `actor_duplicate`) now support automatic validation to ensure operations succeeded as expected:

- **validate** parameter (default: `true`) - Verifies changes were applied correctly in Unreal Engine
- Checks location, rotation, scale, mesh, and folder values match requested values
- Returns validation results including any errors or warnings
- Set `validate: false` for "reckless mode" to skip validation for performance

Example with validation:
```javascript
// Spawn with automatic validation
actor_spawn({ 
  assetPath: "/Game/Meshes/Wall", 
  location: [1000, 0, 0],
  rotation: [0, 0, 90]
})
// Response includes: validated: true/false, validation_errors: [...]

// Modify without validation for faster execution
actor_modify({ 
  actorName: "Wall_01", 
  location: [2000, 0, 0],
  validate: false  // Skip validation check
})
```

### Advanced
- **python_proxy** ⭐ - Execute ANY Python code with full [UE API access](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/?application_version=5.6). This is the most powerful tool - it can do everything the other tools can do and more!
- **test_connection** - Test connection to UE Python listener
- **restart_listener** - Stop listener for hot reload (requires manual restart - see Development section)
- **ue_logs** - Read recent lines from UE console log file (useful for debugging)

### Help & Documentation
- **help** 📚 - Get inline help and examples for all UEMCP tools. This is your **starting point** for learning UEMCP!
  - `help({})` - Overview with categories and common workflows
  - `help({ tool: "actor_spawn" })` - Detailed examples for specific tools
  - `help({ category: "viewport" })` - List all tools in a category


### Example: Using python_proxy for Complex Operations

```python
# With python_proxy, you can do anything you could do in UE's Python console:
import unreal

# Batch operations
actors = unreal.EditorLevelLibrary.get_all_level_actors()
for actor in actors:
    if "Old" in actor.get_actor_label():
        actor.destroy_actor()

# Complex asset queries
materials = unreal.EditorAssetLibrary.list_assets("/Game/Materials", recursive=True)
for mat_path in materials:
    material = unreal.EditorAssetLibrary.load_asset(mat_path)
    # Analyze or modify material properties...

# Editor automation
def auto_layout_actors(spacing=500):
    selected = unreal.EditorLevelLibrary.get_selected_level_actors()
    for i, actor in enumerate(selected):
        actor.set_actor_location(unreal.Vector(i * spacing, 0, 0))
```

## 📋 Prerequisites

- Node.js 18+ and npm
- Unreal Engine 5.1+ (5.4+ recommended)
- Python 3.11 (matches UE's built-in version)
- An MCP-compatible AI client (Claude Desktop, Claude Code, Cursor)

## 💡 Usage Examples

### Getting Started with Help

**The `help` tool is self-documenting!** Start here:

```javascript
// First command to run - shows all tools and workflows
help({})

// Learn about specific tools
help({ tool: "actor_spawn" })
help({ tool: "python_proxy" })

// Explore by category
help({ category: "level" })     // All level editing tools
help({ category: "viewport" })  // Camera and rendering tools
```

### Important: Workflow with Claude Code

When using UEMCP with Claude Code, the proper workflow is:

1. **Start Unreal Engine first** with your project open
2. **Then launch Claude Code** - it will automatically start the MCP server and connect
3. **If you restart Unreal Engine**, the MCP server will automatically reconnect
   - The server runs health checks every 5 seconds for quick reconnection
   - It will detect when UE goes offline and comes back online within seconds
   - You'll see connection status in the Claude Code logs

**Note**: The MCP server is (theoretically) resilient to UE restarts - you don't need to restart Claude Code when restarting Unreal Engine. The connection will automatically restore once UE is running again.

## 🏗 Architecture

```
UEMCP bridges AI ↔ Unreal Engine:
Claude Desktop → MCP Server (Node.js) → Python Listener → Unreal Engine

Key Features:
- Content-only plugin (no C++ compilation needed)
- Hot reload support for rapid development
- Full access to UE Python API
- Background HTTP listener (non-blocking)
- Modular Python architecture for maintainability
```

### Modular Python Architecture

The Python plugin uses a clean, modular architecture (refactored from a monolithic 2090-line file):

- **Operation Modules**: Focused modules for actors, viewport, assets, level, and system operations
- **Command Registry**: Automatic command discovery and dispatch
- **Validation Framework**: Optional post-operation validation with tolerance-based comparisons
- **Consistent Error Handling**: Standardized across all operations
- **85% Code Reduction**: When using dedicated MCP tools vs python_proxy

## 🧑‍💻 Development

### Plugin Development

**Recommended: Use symlinks for hot reloading**

The init script now supports creating symlinks automatically:
```bash
# Install with symlink (recommended for development)
node init.js --project "/path/to/project.uproject" --symlink

# Or let it ask you interactively (defaults to symlink)
node init.js --project "/path/to/project.uproject"
```

Benefits of symlinking:
- ✅ Edit plugin files directly in the git repository
- ✅ Changes reflect immediately after `restart_listener()`
- ✅ No need to copy files back and forth
- ✅ Version control friendly

```bash
# Available helpers in UE Python console:
status()            # Check if running
stop_listener()     # Stop listener
start_listener()    # Start listener
```

### Hot Reloading Code Changes

you can reload the unreal plugin and restart the python server from the mcp or from the unreal engine python command prompt:

```python
restart_listener()
```

### Adding New Tools
1. Add command handler in `plugin/Content/Python/uemcp_listener.py`
2. Create MCP tool wrapper in `server/src/tools/`
3. Register tool in `server/src/index.ts`

### Testing
```bash
# Run full test suite (mimics CI)
./test-ci-locally.sh

# Individual tests
npm test              # JavaScript tests
python -m pytest      # Python tests
npm run lint          # Linting
```

## 📚 Documentation

See the **[Documentation Index](docs/README.md)** for organized access to all documentation.

### Quick Links
- **[Quick Start Guide](docs/setup/quickstart.md)** - Get started in 2 minutes
- **[Development Guide](CLAUDE.md)** - Core development patterns
- **[MCP Tools vs Python Proxy](docs/reference/mcp-tools-vs-python-proxy.md)** - 85% code reduction examples
- **[Troubleshooting](docs/development/troubleshooting.md)** - Common issues and solutions

## ⚠️ Known Limitations

While UEMCP provides comprehensive UE control, there are some current limitations:

### MCP Tool Limitations
- **No Asset Snapping**: Manual coordinate calculation required (no automated socket-based placement)
- **Blueprint Graph Editing**: Can spawn Blueprint actors but cannot programmatically edit Blueprint node graphs
- **No Undo/Redo**: Operations cannot be undone programmatically

### Python API Issues
- **Actor References**: `get_actor_reference()` doesn't work with display names (workaround implemented)
- **Viewport Methods**: Several deprecated (see [Python API Workarounds](docs/python-api-workarounds.md))

### Recently Resolved ✅
These limitations have been addressed in recent updates:
- ✅ **Material Creation & Editing**: Full material management via `material_create`, `material_apply`, etc.
- ✅ **Placement Validation**: Gap/overlap detection via `placement_validate` tool
- ✅ **Asset Information**: Complete bounds, pivot, socket, and collision data via enhanced `asset_info`

### Workarounds Available
Most remaining limitations can be worked around using the `python_proxy` tool. See our documentation:
- [Python API Workarounds](docs/python-api-workarounds.md) - Common fixes
- [House Building Experiment](docs/house-building-experiment.md) - Real-world solutions

## 🗺️ Roadmap

### Upcoming Releases
- **v0.7.0** (Jan 2025) - Socket-based building, batch operations, FAB import
- **v0.8.0** (Feb 2025) - Blueprint manipulation, undo/redo system
- **v0.9.0** (Mar 2025) - Performance optimizations, production readiness
- **v1.0.0** (Apr 2025) - Production release with full feature set

See [PLAN.md](PLAN.md) for detailed roadmap and release criteria.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test in Unreal Engine
4. Submit a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file
