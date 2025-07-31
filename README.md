# UEMCP - Unreal Engine Model Context Protocol

![Unreal Engine](https://img.shields.io/badge/Unreal%20Engine-5.x-blue?logo=unrealengine)
![MCP](https://img.shields.io/badge/MCP-Compatible-green)
![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)

UEMCP bridges AI assistants with Unreal Engine, enabling intelligent control of game development workflows through the Model Context Protocol (MCP).

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

📊 **[See detailed comparison of MCP tools vs python_proxy →](docs/mcp-tools-vs-python-proxy.md)** (average 80%+ code reduction!)

> Note: This project was made because I wanted to have my own UE MCP since Epic does not have plans to create one (or at least has not alluded to one being on the roadmap)--and I wanted this to do some things that other WIP UE MCP projects didn't support. This is working for me on my macbook with UE 5.6. As I test it with other environments and unreal versions (I do have plans to do so), I will update it. If you happen to want to use it and find it doesn't work in another environment or version of unreal, please open a pull-request. This project is entirely coded with Claude Code so feel free to use the CLAUDE.md and other files in here that can aid in development and testing. Or file issues, and I (or claude, or codex) will take a look.

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

## 🛠 Available Tools

UEMCP provides 25 tools to Claude for controlling Unreal Engine:

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

## 🔧 Installation Options

### Option 1: Automated Setup (Recommended)
```bash
node init.js
```

### Option 2: Manual Setup
```bash
# Install dependencies
cd server && npm install
pip install -r requirements.txt

# Build server
npm run build

# Configure Claude Desktop
# Copy claude-desktop-config.example.json to:
# macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
# Windows: %APPDATA%\Claude\claude_desktop_config.json
# Update paths in the config

# Set environment
export UE_PROJECT_PATH="/path/to/your/project"
```

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

### Natural Language Commands
Ask Claude:
- "Show me all wall meshes in the ModularOldTown folder"
- "Spawn a cube at location 1000, 500, 0"
- "Take a screenshot of the current viewport"
- "List all actors with 'Door' in their name"
- "Focus the camera on the player start"
- "Check the UE logs for any errors"

### Python Proxy for Advanced Control
```python
# Claude can execute any UE Python API command:
"Use python_proxy to get all actors of type StaticMeshActor"
"Execute Python to change all lights to blue"
"Run Python code to analyze material usage in the level"
```

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

See [Modular Architecture Documentation](docs/modularization/MODULAR_ARCHITECTURE.md) for implementation details.

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

**Important**: Due to UE's Python environment, `restart_listener()` requires manual completion to prevent crashes:

```python
# Step 1: Run restart_listener() - this stops the server
restart_listener()

# Step 2: Complete the restart manually (prevents crashes)
import importlib
importlib.reload(uemcp_listener)
uemcp_listener.start_listener()
```

This two-step process is necessary because:
- Reloading Python modules while they're running can crash UE
- The HTTP server can't safely restart itself while handling requests
- Manual completion ensures a clean restart in a fresh Python context

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

### Setup & Configuration
- [Quick Start Guide](docs/quickstart.md) - Detailed setup instructions
- [Environment Setup](docs/environment-setup.md) - Environment variables and configuration
- [Claude Desktop Setup](docs/claude-desktop-setup-current.md) - Manual Claude Desktop configuration
- [Claude Code Setup](docs/claude-code-mcp-setup.md) - Setup for claude.ai/code
- [Plugin Installation](docs/plugin-installation.md) - Installing the UE plugin

### Development & Testing
- [Development Guide](CLAUDE.md) - Core development patterns and workflow
- [Code Standards](docs/code-standards.md) - TypeScript and Python coding standards
- [Architecture & Communication](docs/architecture-communication.md) - System design details
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions

### Reference
- [MCP Enhancement Needs](docs/mcp-enhancement-needs.md) - Future roadmap ideas
- [House Building Experiment](docs/house-building-experiment.md) - Learnings from complex construction
- [Python API Workarounds](docs/python-api-workarounds.md) - Solutions for UE Python limitations

## ⚠️ Known Limitations

While UEMCP provides comprehensive UE control, there are some current limitations:

### MCP Tool Limitations
- **No Asset Snapping**: Manual coordinate calculation required (no socket-based placement)
- **Blueprint Creation Only**: Can create but not edit Blueprint graphs
- **No Material Editing**: Cannot create material instances or modify materials
- **No Undo/Redo**: Operations cannot be undone programmatically

### Python API Issues
- **Actor References**: `get_actor_reference()` doesn't work with display names
- **Viewport Methods**: Several deprecated (see [Python API Workarounds](docs/python-api-workarounds.md))
- **No Placement Validation**: Cannot detect collisions or gaps between actors
- **Limited Asset Info**: No socket, bounds, or pivot data from asset_info

### Workarounds Available
Most limitations can be worked around using the `python_proxy` tool. See our documentation:
- [Python API Workarounds](docs/python-api-workarounds.md) - Common fixes
- [House Building Experiment](docs/house-building-experiment.md) - Real-world solutions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test in Unreal Engine
4. Submit a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file
