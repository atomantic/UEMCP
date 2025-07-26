# Claude Code MCP Configuration Guide

This guide covers how to configure UEMCP for use with Claude Code (claude.ai/code).

## Prerequisites

- Claude Code CLI installed (`claude` command)
- Node.js 18+ installed
- UEMCP repository cloned and built
- Unreal Engine project (optional for initial testing)

## Quick Setup

### Option 1: Using Claude CLI (Recommended)

1. **Build UEMCP first:**
   ```bash
   cd /path/to/UEMCP
   cd server
   npm install
   npm run build
   ```

2. **Add UEMCP server to Claude Code:**
   ```bash
   # From the UEMCP directory
   UEMCP_DIR=$(pwd)
   
   # Add the server
   claude mcp add uemcp node "${UEMCP_DIR}/server/dist/index.js" \
     -e "UE_PROJECT_PATH=/path/to/your/project.uproject"
   
   # Verify it was added
   claude mcp list
   ```

3. **Test the connection:**
   ```bash
   # This will show if the server is working
   claude mcp test uemcp
   ```

### Option 2: Manual Configuration File

1. **Create/edit the MCP configuration file:**
   ```bash
   # macOS/Linux
   mkdir -p ~/.config/claude
   nano ~/.config/claude/mcp_settings.json
   
   # Windows
   # Create %APPDATA%\claude\mcp_settings.json
   ```

2. **Add UEMCP configuration:**
   ```json
   {
     "mcpServers": {
       "uemcp": {
         "command": "node",
         "args": ["/absolute/path/to/UEMCP/server/dist/index.js"],
         "env": {
           "UE_PROJECT_PATH": "/path/to/your/project.uproject"
         }
       }
     }
   }
   ```

## Environment Variables

Configure UEMCP with these environment variables:

```bash
# Required if you want to work with a specific project
UE_PROJECT_PATH="/path/to/your/UnrealProject.uproject"

# Optional
DEBUG="uemcp:*"                    # Enable debug logging
UE_INSTALL_LOCATION="/path/to/UE"  # Custom UE installation
```

## Verifying the Connection

### In Claude Code Web Interface:

1. Visit [claude.ai/code](https://claude.ai/code)
2. Start a new conversation
3. Ask: "What UEMCP tools are available?"

You should see a list of available tools like:
- `project_info`
- `asset_list`
- `actor_spawn`
- `level_save`
- etc.

### Using Claude CLI:

```bash
# List all MCP servers
claude mcp list

# Test UEMCP specifically
claude mcp test uemcp

# Remove if needed
claude mcp remove uemcp
```

## Available Tools

Once connected, UEMCP provides these tools:

### Project & Assets
- **project_info** - Get project information
- **asset_list** - List and filter assets
- **asset_info** - Get asset details

### Level Editing
- **actor_spawn** - Spawn actors in the level
- **actor_delete** - Delete actors
- **actor_modify** - Modify actor properties
- **level_actors** - List level actors
- **level_save** - Save the current level

### Viewport Control
- **viewport_screenshot** - Capture screenshots
- **viewport_camera** - Control camera
- **viewport_focus** - Focus on actors

### Advanced
- **python_proxy** - Execute Python in UE
- **restart_listener** - Restart Python listener

## Usage Examples

```
"Show me all static meshes in the ModularOldTown folder"
"Spawn a cube at location 1000, 500, 0"
"Take a screenshot of the current viewport"
"List all actors with 'Wall' in their name"
"Save the current level"
```

## Troubleshooting

### Server Not Found

1. **Check the path is absolute:**
   ```bash
   # Good
   /Users/username/Projects/UEMCP/server/dist/index.js
   
   # Bad
   ~/UEMCP/server/dist/index.js
   ./server/dist/index.js
   ```

2. **Verify the server was built:**
   ```bash
   ls -la /path/to/UEMCP/server/dist/index.js
   # Should exist and be readable
   ```

3. **Test manually:**
   ```bash
   node /path/to/UEMCP/server/dist/index.js
   # Should output: UEMCP MCP Server running on stdio
   ```

### Connection Issues

1. **Check Claude CLI version:**
   ```bash
   claude --version
   # Should be recent version with MCP support
   ```

2. **View Claude logs:**
   ```bash
   # Location varies by OS
   # macOS: ~/Library/Logs/Claude/
   # Check for MCP-related errors
   ```

3. **Enable debug mode:**
   ```bash
   claude mcp remove uemcp
   claude mcp add uemcp node /path/to/server/dist/index.js \
     -e "DEBUG=uemcp:*" \
     -e "UE_PROJECT_PATH=/path/to/project.uproject"
   ```

### Python Listener Issues

If UE integration isn't working:

1. **Ensure UE is running** with your project open
2. **Check Python is enabled** in UE (Edit → Plugins → Python)
3. **Restart the listener** in UE Python console:
   ```python
   restart_listener()
   ```

## Differences from Claude Desktop

| Feature | Claude Desktop | Claude Code |
|---------|---------------|-------------|
| Config Method | JSON file | CLI or JSON |
| Config Location | App Support folder | ~/.config/claude/ |
| Management | Manual editing | `claude mcp` commands |
| Updates | Restart required | Automatic |

## Advanced Configuration

### Multiple Projects

Add multiple UEMCP instances for different projects:

```bash
# Project 1
claude mcp add uemcp-home node /path/to/UEMCP/server/dist/index.js \
  -e "UE_PROJECT_PATH=/path/to/Home.uproject"

# Project 2  
claude mcp add uemcp-game node /path/to/UEMCP/server/dist/index.js \
  -e "UE_PROJECT_PATH=/path/to/MyGame.uproject"
```

### Custom Python Path

If using custom Python installation:

```bash
claude mcp add uemcp node /path/to/server/dist/index.js \
  -e "PYTHON_PATH=/usr/local/bin/python3" \
  -e "UE_PROJECT_PATH=/path/to/project.uproject"
```

## Next Steps

1. **Test basic operations:**
   - "Show project info"
   - "List assets in /Game"
   
2. **Install plugin in UE:**
   - Copy plugin folder to your project
   - Enable in UE and restart
   
3. **Try advanced features:**
   - Spawn actors
   - Take screenshots
   - Execute Python code

## Support

- GitHub Issues: [github.com/atomantic/UEMCP/issues](https://github.com/atomantic/UEMCP/issues)
- Documentation: See README.md and CLAUDE.md
- Discord: [Join our community](https://discord.gg/uemcp)