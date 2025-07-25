# Claude Code MCP Configuration Guide

This guide covers how to configure UEMCP for use with Claude Code (claude.ai/code), which uses a different configuration method than Claude Desktop.

## Prerequisites

- Claude Code account with MCP access
- Node.js installed on your system
- UEMCP server files from this repository

## Configuration Steps for Claude Code

### 1. Open Claude Code Settings

1. Go to [claude.ai/code](https://claude.ai/code)
2. Click on your profile icon → Settings
3. Navigate to the "Developer" or "MCP Servers" section

### 2. Add MCP Server Configuration

In Claude Code, you'll use the MCP configuration interface:

```json
{
  "name": "uemcp",
  "command": "node",
  "args": ["<PATH_TO_UEMCP>/server/dist/index.js"],
  "env": {
    "DEBUG": "uemcp:*"
  }
}
```

### 3. Alternative: Using claude-mcp CLI

If you have access to the `claude-mcp` CLI tool:

```bash
# Install claude-mcp if not already installed
npm install -g @anthropic/claude-mcp

# Add the UEMCP server
claude-mcp add uemcp \
  --command "node" \
  --args "<PATH_TO_UEMCP>/server/dist/index.js" \
  --env "DEBUG=uemcp:*"

# List configured servers
claude-mcp list

# Test the server
claude-mcp test uemcp
```

### 4. Manual Configuration File

Claude Code may use a configuration file at:

```bash
# macOS/Linux
~/.config/claude/mcp_servers.json

# Windows
%APPDATA%\claude\mcp_servers.json
```

Create or edit this file:

```json
{
  "servers": {
    "uemcp": {
      "command": "node",
      "args": ["<PATH_TO_UEMCP>/server/dist/index.js"],
      "env": {
        "DEBUG": "uemcp:*"
      },
      "enabled": true
    }
  }
}
```

## Verifying the Connection

### In Claude Code:

1. Start a new conversation
2. Look for the MCP indicator (usually shows connected servers)
3. Test with: "What MCP tools are available?"

### Expected Tools:

- `asset_list` - List Unreal Engine assets
- `blueprint_create` - Create new blueprints
- `project_create` - Create new projects (mock)

## Usage Examples

Once connected, you can use natural language:

### List Assets
```
"Show me all blueprints in my Unreal project"
"List assets in /Game/Characters"
"What materials are in the project?"
```

### Create Blueprints
```
"Create a new Actor blueprint called BP_Platform"
"Make a Character blueprint named BP_Enemy in /Game/Enemies"
"Create a GameMode blueprint"
```

### Project Information
```
"What Unreal Engine version is my project using?"
"Show me the project directory"
```

## Troubleshooting

### Server Not Connecting

1. **Verify Node.js is accessible:**
   ```bash
   which node
   node --version
   ```

2. **Test the server manually:**
   ```bash
   cd <PATH_TO_UEMCP>/server
   node dist/index.js
   ```
   You should see: "UEMCP server started"

3. **Check the server path:**
   - Ensure the full path to `index.js` is correct
   - Use absolute paths, not relative

### Tools Not Appearing

1. **Refresh Claude Code:**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Clear site data if needed

2. **Check browser console:**
   - Open Developer Tools (F12)
   - Look for MCP-related errors

3. **Verify server response:**
   ```bash
   # Test the server responds to MCP protocol
   echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node /path/to/server/dist/index.js
   ```

### Permission Issues

If you get permission errors:

```bash
# Make sure the server is executable
chmod +x <PATH_TO_UEMCP>/server/dist/index.js

# Check file ownership
ls -la <PATH_TO_UEMCP>/server/dist/
```

## Differences from Claude Desktop

| Feature | Claude Desktop | Claude Code |
|---------|---------------|-------------|
| Config Location | `~/Library/Application Support/Claude/` | `~/.config/claude/` or UI |
| Config Format | `claude_desktop_config.json` | `mcp_servers.json` or UI |
| Server Management | File-based | UI or CLI-based |
| Hot Reload | Requires restart | May support hot reload |

## Advanced Configuration

### Environment Variables

You can pass additional environment variables:

```json
{
  "env": {
    "DEBUG": "uemcp:*",
    "UE_PROJECT_PATH": "<PATH_TO_YOUR_UE_PROJECT>",
    "UE_ENGINE_PATH": "/Users/Shared/Epic Games/UE_5.6"
  }
}
```

### Custom Python Path

If Python isn't in the default location:

```json
{
  "env": {
    "PYTHON_PATH": "/usr/local/bin/python3",
    "UE_PYTHON_PATH": "/Users/Shared/Epic Games/UE_5.6/Engine/Binaries/ThirdParty/Python3/Mac/bin/python3"
  }
}
```

## Next Steps

1. **Test Basic Operations:**
   - List assets in your project
   - Create a test blueprint
   
2. **Enable Python Bridge:**
   - Ensure Unreal Editor is running
   - Python Script Plugin must be enabled

3. **Extend Functionality:**
   - Add more tools to the server
   - Implement real Python execution

## Support

- Report issues: [GitHub Issues](https://github.com/yourusername/UEMCP/issues)
- Documentation: [UEMCP Wiki](https://github.com/yourusername/UEMCP/wiki)
- MCP Protocol: [Model Context Protocol Docs](https://modelcontextprotocol.io)