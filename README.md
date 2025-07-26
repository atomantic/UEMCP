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

# Restart Claude Desktop and test:
# "List available UEMCP tools"
# "Show me the assets in my Unreal project"
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

UEMCP provides these tools to Claude for controlling Unreal Engine:

### Project & Assets
- **project_info** - Get current project information
- **project_create** - Create new UE projects
- **asset_list** - List and filter project assets
- **asset_info** - Get detailed asset information (dimensions, materials, etc.)

### Level Editing
- **actor_spawn** - Spawn actors from any mesh or blueprint
- **actor_delete** - Delete actors by name
- **actor_modify** - Change actor transform and organization
- **actor_organize** - Organize actors into World Outliner folders
- **level_actors** - List all actors in the current level
- **level_save** - Save the current level
- **level_outliner** - View World Outliner folder structure

### Viewport Control
- **viewport_screenshot** - Capture viewport screenshots
- **viewport_camera** - Control camera position and orientation
- **viewport_mode** - Switch between perspective/orthographic views
- **viewport_focus** - Focus on specific actors
- **viewport_render_mode** - Change rendering mode (wireframe, unlit, etc.)

### Advanced
- **python_proxy** - Execute Python code with full [UE API access](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/?application_version=5.6)
- **test_connection** - Test connection to UE Python listener
- **restart_listener** - Hot reload Python code changes
- **ue_logs** - Read recent lines from UE console log file (useful for debugging)

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
```

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
# In UE Python console, reload changes without restarting:
restart_listener()  # Hot reload your changes

# Available helpers:
status()            # Check if running
stop_listener()     # Stop listener
start_listener()    # Start listener
```

### Adding New Tools
1. Add command handler in `plugin/Content/Python/uemcp_listener_fixed.py`
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
- [Architecture & Communication](docs/architecture-communication.md) - System design details
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions

### Reference
- [MCP Enhancement Needs](docs/mcp-enhancement-needs.md) - Future roadmap ideas

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test in Unreal Engine
4. Submit a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file
