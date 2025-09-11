# UEMCP - Unreal Engine Model Context Protocol

![Unreal Engine](https://img.shields.io/badge/Unreal%20Engine-5.x-blue?logo=unrealengine)
![MCP](https://img.shields.io/badge/MCP-Compatible-green)
![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)

UEMCP bridges AI assistants with Unreal Engine through a two-tier architecture that separates the MCP server (Node.js) from the Python Editor Plugin, enabling remote deployment of Unreal Engine editors. This implementation provides optimized wrappers around common UE Python API operations, reducing code generation by up to 85%. The repository includes automated setup for AI clients, comprehensive development context, and three specialized Claude agents for enhanced UE workflows. Unlike package-managed MCP servers, this repo is designed to be cloned and potentially forked for maximum customization and development flexibility.

<img src="https://github.com/atomantic/UEMCP/releases/download/v1.0.0/uemcp-demo.gif" alt="UEMCP Demo" width="100%">


## 🚀 Quick Start (2 minutes)

```bash
# Clone and setup
git clone https://github.com/atomantic/UEMCP.git
cd UEMCP
./setup.sh

# Restart Claude Desktop or Claude Code and test:
# "List available UEMCP tools"
# "Organize the actors in the current map into a sensible folder structure and naming convention"
```

The setup script automatically:
- ✅ Checks and installs Node.js if needed (via Homebrew, apt, yum, or nvm)
- ✅ Installs dependencies and builds the server
- ✅ **Detects and configures AI development tools** (Claude Desktop, Claude Code, Amazon Q, Gemini Code Assist, OpenAI Codex)
- ✅ Sets up your Unreal Engine project path
- ✅ Optionally installs the UEMCP plugin to your project

The script will detect which AI tools you have installed and offer to configure them:
- **Claude Desktop & Claude Code**: Native MCP support
- **Amazon Q**: MCP support via `~/.aws/amazonq/agents/default.json`
- **Google Gemini (CLI & Code Assist)**: MCP support via `~/.gemini/settings.json`
- **OpenAI Codex**: Trusted projects via `~/.codex/config.toml`
- **GitHub Copilot**: Usage instructions provided

### 📝 Windows Users

**Recommended: Use WSL (Windows Subsystem for Linux)**
```bash
# Install WSL if you haven't already
wsl --install

# In WSL/Ubuntu terminal:
git clone https://github.com/atomantic/UEMCP.git
cd UEMCP
./setup.sh
```

**Alternative: Git Bash**
- Install [Git for Windows](https://git-scm.com/download/win) which includes Git Bash
- Run `./setup.sh` in Git Bash terminal

**Note:** The setup script will copy (not symlink) the plugin to your UE project on Windows to avoid permission issues.

**Advanced options:**
```bash
# Specify UE project (automatically installs plugin via copy)
./setup.sh --project "/path/to/project.uproject"

# Install with symlink for UEMCP plugin development
./setup.sh --project "/path/to/project.uproject" --symlink

# Non-interactive mode (for CI/CD)
./setup.sh --project "/path/to/project.uproject" --no-interactive
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

UEMCP provides **36 MCP tools** across 7 categories for comprehensive Unreal Engine control:

### 📦 Project & Asset Management (3 tools)
- **project_info** - Get current UE project information
- **asset_list** - List project assets with filtering
- **asset_info** - Get detailed asset information (bounds, sockets, materials)

### 🎭 Actor Management (8 tools)
- **actor_spawn** - Spawn actors in the level
- **actor_duplicate** - Duplicate existing actors with offset
- **actor_delete** - Delete actors by name
- **actor_modify** - Modify actor properties (location, rotation, scale, mesh)
- **actor_organize** - Organize actors into World Outliner folders
- **actor_snap_to_socket** - Snap actors to socket positions for modular building
- **batch_spawn** - Efficiently spawn multiple actors in one operation
- **placement_validate** - Validate modular component placement (gaps, overlaps)

### 🏗️ Level Operations (3 tools)
- **level_actors** - List all actors in level with properties
- **level_save** - Save the current level
- **level_outliner** - Get World Outliner folder structure

### 📹 Viewport Control (8 tools)
- **viewport_screenshot** - Capture viewport images
- **viewport_camera** - Set camera position and rotation
- **viewport_mode** - Switch to standard views (top, front, side, perspective)
- **viewport_focus** - Focus camera on specific actor
- **viewport_render_mode** - Change rendering mode (lit, wireframe, etc.)
- **viewport_bounds** - Get current viewport boundaries
- **viewport_fit** - Fit actors in viewport automatically
- **viewport_look_at** - Point camera at specific coordinates/actor

### 🎨 Material System (4 tools)
- **material_list** - List project materials with filtering
- **material_info** - Get detailed material information and parameters
- **material_create** - Create new materials or material instances
- **material_apply** - Apply materials to actor mesh components

### 🔷 Blueprint System (5 tools)
- **blueprint_create** - Create new Blueprint classes
- **blueprint_list** - List project Blueprints with metadata
- **blueprint_info** - Get Blueprint structure (components, variables, functions)
- **blueprint_compile** - Compile Blueprints and report errors
- **blueprint_document** - Generate comprehensive Blueprint documentation

### ⚙️ System & Advanced (5 tools)
- **python_proxy** ⭐ - Execute arbitrary Python code with full UE API access
- **test_connection** - Test Python listener connection and status
- **restart_listener** - Restart Python listener (hot reload)
- **ue_logs** - Fetch recent Unreal Engine log entries
- **help** 📚 - Get comprehensive help and tool documentation

### 🔧 MCP Server Layer Tools (Additional tools handled by Node.js)
- **undo** - Undo last operation(s)
- **redo** - Redo previously undone operations
- **history_list** - Show operation history with timestamps
- **checkpoint_create** - Create named save points
- **checkpoint_restore** - Restore to named checkpoints
- **batch_operations** - Execute multiple operations in single request

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

### 🚀 Batch Operations

The `batch_operations` tool allows you to execute multiple operations in a single HTTP request, reducing overhead by 80-90% for bulk operations:

```javascript
// Execute multiple operations efficiently
batch_operations({
  operations: [
    {
      operation: "actor_spawn",
      params: { assetPath: "/Game/Meshes/Wall", location: [0, 0, 0] },
      id: "wall_1"
    },
    {
      operation: "actor_spawn", 
      params: { assetPath: "/Game/Meshes/Wall", location: [300, 0, 0] },
      id: "wall_2"
    },
    {
      operation: "viewport_camera",
      params: { location: [150, -500, 300], rotation: [0, -30, 0] },
      id: "camera_pos"
    },
    {
      operation: "viewport_screenshot",
      params: { width: 800, height: 600 },
      id: "screenshot"
    }
  ]
})
// Returns: success/failure status for each operation with timing info
```

**Benefits:**
- **80-90% faster** than individual tool calls for bulk operations
- **Atomic execution** - all operations processed in one request
- **Detailed results** - individual success/failure status for each operation
- **Performance tracking** - execution time and memory management

---

**Total: 36 MCP Tools** across 7 categories, providing comprehensive Unreal Engine automation and control through the Model Context Protocol interface. 

🚀 **v2.0.0 Dynamic Architecture**: All tool definitions are now dynamically loaded from Python, eliminating code duplication and ensuring Python is the single source of truth for tool capabilities. The tools range from basic project queries to advanced Blueprint manipulation, with the `python_proxy` tool providing unlimited access to Unreal Engine's complete Python API for any operations not covered by the dedicated tools.

### 💡 Getting Started with Help

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

### Blueprint Development Workflow
```javascript
// 1. List existing Blueprints in your project
blueprint_list({ path: "/Game/Blueprints" })

// 2. Create a new interactive door Blueprint
blueprint_create({
  className: "BP_InteractiveDoor",
  parentClass: "Actor",
  components: [
    { name: "DoorMesh", type: "StaticMeshComponent" },
    { name: "ProximityTrigger", type: "BoxComponent" }
  ],
  variables: [
    { name: "IsOpen", type: "bool", defaultValue: false },
    { name: "OpenRotation", type: "rotator", defaultValue: [0, 0, 90] }
  ]
})

// 3. Analyze Blueprint structure 
blueprint_info({ blueprintPath: "/Game/Blueprints/BP_InteractiveDoor" })

// 4. Compile and check for errors
blueprint_compile({ blueprintPath: "/Game/Blueprints/BP_InteractiveDoor" })

// 5. Generate documentation
blueprint_document({ 
  blueprintPath: "/Game/Blueprints/BP_InteractiveDoor",
  outputPath: "/Game/Documentation/BP_InteractiveDoor.md"
})
```


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
- An MCP-compatible AI client (Claude Desktop, Claude Code, Gemini, Codex, Q)

## 💡 Usage Examples

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
AI → Local MCP Server (Node.js) →  Cloud Unreal Engine (Python Listener)
```

### Why Split Node.js MCP Server + Python UE Bridge?

UEMCP uses a **two-tier architecture** that separates the MCP protocol handling from Unreal Engine integration. This allows us to deploy unreal engine editors independently of the clients interacting with them, either locally or in the cloud.

#### 🔄 **Development Workflow**
```bash
# Local development - both tiers on same machine
AI Client ←→ MCP Server (localhost:8080) ←→ UE Python (localhost:8765)

# Remote UE development - UE on cloud/server
AI Client ←→ MCP Server (localhost:8080) ←→ UE Python (remote-server:8765)

# Team development - shared UE instance  
AI Client A ←→ MCP Server A ←→ Shared UE (team-server:8765)
AI Client B ←→ MCP Server B ←→ Shared UE (team-server:8765)
```

### Modular Python Architecture

The Python plugin uses a clean, modular architecture (refactored from a monolithic 2090-line file):

- **Operation Modules**: Focused modules for actors, viewport, assets, level, and system operations
- **Command Registry**: Automatic command discovery and dispatch
- **Validation Framework**: Optional post-operation validation with tolerance-based comparisons
- **Consistent Error Handling**: Standardized across all operations
- **85% Code Reduction**: When using dedicated MCP tools vs python_proxy

📖 **[See detailed architecture documentation →](docs/development/architecture.md)**

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

### Diagnostic Testing

Validate your MCP setup with the diagnostic test scripts:

```bash
# Quick diagnostic checklist
node scripts/mcp-diagnostic.js

# Interactive test suite (requires user verification)
node scripts/diagnostic-test.js
```

The diagnostic tests validate all MCP functionality including:
- Connection and project info
- Asset management (list, info)  
- Level operations (spawn, modify, delete actors)
- Viewport control (camera, screenshots, render modes)
- Material system (list, create, apply)
- Advanced features (python_proxy, batch operations)

**Expected success rate: 100%** for a properly configured system.

## 📚 Documentation

- **[Setup Reference](docs/setup.md)** - Manual setup and configuration details
- **[Architecture](docs/development/architecture.md)** - System design and components
- **[Troubleshooting](docs/development/troubleshooting.md)** - Common issues and solutions
- **[Examples](docs/examples.md)** - Advanced usage patterns and experiments
- **[MCP vs Python](docs/reference/mcp-tools-vs-python-proxy.md)** - 85% code reduction comparison
- **[Python Workarounds](docs/reference/python-api-workarounds.md)** - Known UE Python limitations
- **[Contributing](docs/CONTRIBUTING.md)** - How to contribute
- **[Development](CLAUDE.md)** - For AI assistants and developers

## ⚠️ Known Limitations

### Current MCP Tool Limitations
- **Blueprint Graph Editing**: Cannot programmatically edit Blueprint node graphs (visual scripting logic) - but can create, analyze, compile, and document Blueprints
- **Animation Blueprints**: No direct animation state machine or blend tree manipulation
- **Level Streaming**: No dynamic level loading/unloading control

### Python API Issues
- **Actor References**: `get_actor_reference()` doesn't work with display names (workaround implemented)
- **Viewport Methods**: Several deprecated (see [Python API Workarounds](docs/python-api-workarounds.md))

### Workarounds Available
Most remaining limitations can be worked around using the `python_proxy` tool. See our documentation:
- [Python API Workarounds](docs/python-api-workarounds.md) - Common fixes
- [House Building Experiment](docs/house-building-experiment.md) - Real-world solutions

## 🗺️ Roadmap

See [PLAN.md](PLAN.md) for detailed roadmap and release criteria.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test in Unreal Engine
4. Submit a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file
