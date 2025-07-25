# UEMCP Complete Testing Guide

## Setup Complete! 🎉

The UEMCP system is now ready for testing. Here's everything you need to know:

## What We've Built

1. **UEMCP Plugin** - Loaded in your DemoMaze project
2. **MCP Server** - Ready with tools for:
   - `asset.list` - List project assets
   - `blueprint.create` - Create new blueprints
   - `project.info` - Get project information
3. **Python Bridge** - Scripts ready in `/Content/Python/`

## Testing Steps

### Step 1: Test Python Integration in Unreal

1. In Unreal Editor (with DemoMaze open):
2. Open **Window → Developer Tools → Output Log**
3. In the command field at the bottom, type: `py` and press Enter
4. Copy and paste this test:

```python
# Load the UEMCP server
import sys
sys.path.append('<YOUR_UE_PROJECT>/Content/Python')
import uemcp_server

# Test the server
print("Testing UEMCP Server...")
result = uemcp_server.execute_mcp_command('{"type":"project.info","params":{}}')
print(result)
```

### Step 2: Configure Claude Desktop

Add this to your Claude Desktop configuration:

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

### Step 3: Test the MCP Server

```bash
# Test the server directly
cd <PATH_TO_UEMCP>/server
node dist/index.js
```

The server should start and show: "UEMCP server started - ready to control Unreal Engine!"

### Step 4: Test with Claude Desktop

1. Restart Claude Desktop after adding the configuration
2. In a new conversation, you can now ask:
   - "List all assets in my Unreal project"
   - "Create a new blueprint called BP_TestActor"
   - "Show me information about the current project"

## Available MCP Tools

### 1. List Assets
```
Tool: asset.list
Parameters:
- path: Asset path (default: "/Game")
- assetType: Filter by type (e.g., "Blueprint", "Material")
- recursive: Search subdirectories (default: true)
```

### 2. Create Blueprint
```
Tool: blueprint.create
Parameters:
- name: Blueprint name (required)
- path: Where to create it (default: "/Game/Blueprints")
- parentClass: "Actor", "Pawn", "Character", or "GameMode"
```

### 3. Project Info
```
Tool: project.info
Parameters: none
```

## Manual Python Testing

You can test what the MCP server will do by running these in the UE Python console:

### Create Multiple Blueprints
```python
import uemcp_server
import json

# Create a character blueprint
cmd = {
    "type": "blueprint.create",
    "params": {
        "name": "BP_MyCharacter",
        "path": "/Game/Characters",
        "parentClass": "Character"
    }
}
result = uemcp_server.execute_mcp_command(json.dumps(cmd))
print(result)

# List all blueprints
cmd = {
    "type": "asset.list",
    "params": {
        "path": "/Game",
        "assetType": "Blueprint",
        "recursive": True
    }
}
result = uemcp_server.execute_mcp_command(json.dumps(cmd))
print(result)
```

### Spawn Actors in Level
```python
import uemcp_server
import json

# Spawn a cube
cmd = {
    "type": "actor.spawn",
    "params": {
        "actorClass": "/Engine/BasicShapes/Cube",
        "location": [0, 0, 100],
        "scale": [2, 2, 0.5]
    }
}
result = uemcp_server.execute_mcp_command(json.dumps(cmd))
print(result)
```

## Current Status

- ✅ Plugin compiled and loaded
- ✅ Python scripts ready
- ✅ MCP server with mock responses
- ⚠️ Real Python execution needs to be connected (currently using mock data)

## Next Steps for Full Integration

To connect real Python execution:

1. Update the Python bridge to actually spawn Python processes
2. Or use Unreal's HTTP server to receive commands
3. Or implement a TCP socket connection

For now, the mock implementation shows what will be possible, and you can test all functionality manually through the Python console.

## Troubleshooting

### MCP Server doesn't start
- Check Node.js is installed: `node --version`
- Verify path in Claude Desktop config

### Python scripts not found
- Ensure you're in the correct project
- Check the Python path is added correctly

### Tools not showing in Claude
- Restart Claude Desktop
- Check the Output panel for errors

## Demo: Create a Simple Game Element

Try asking Claude (once connected):
"Create a new enemy blueprint called BP_Enemy with Character as parent class, then list all blueprints in the project"

Or run manually:
```python
import uemcp_server
import json

# Create enemy
cmd1 = {"type": "blueprint.create", "params": {"name": "BP_Enemy", "parentClass": "Character"}}
print(uemcp_server.execute_mcp_command(json.dumps(cmd1)))

# List blueprints  
cmd2 = {"type": "asset.list", "params": {"assetType": "Blueprint"}}
print(uemcp_server.execute_mcp_command(json.dumps(cmd2)))
```

The foundation is complete! You can now experiment with controlling Unreal Engine through Python and see what will be possible with the full MCP integration.