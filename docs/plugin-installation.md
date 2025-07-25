# UEMCP Plugin Installation Guide

## Overview

The UEMCP system consists of two main components:
1. **MCP Server** (Node.js) - Communicates with AI assistants
2. **UEMCP Plugin** (Content-only) - Python listener that runs inside Unreal Engine

## Key Features

- **No C++ compilation required** - It's a content-only plugin
- **Instant installation** - Just copy the plugin folder
- **Hot reload support** - Update code without restarting UE

## Installation Steps

### 1. Install the UEMCP Plugin

#### Option A: Using init.js (Recommended)
```bash
# Run the init script with --install-plugin flag
node init.js --project "/path/to/your/project.uproject" --install-plugin
```

#### Option B: Manual Installation
```bash
# Create Plugins directory if it doesn't exist
mkdir -p "<YOUR_UE_PROJECT>/Plugins"

# Copy plugin to your project
cp -r <PATH_TO_UEMCP>/plugin "<YOUR_UE_PROJECT>/Plugins/UEMCP"
```

### 2. Enable Required Plugins

In Unreal Editor:
1. Go to Edit → Plugins
2. Enable these plugins:
   - **Python Script Plugin** (built-in) - Required
   - **UEMCP** (our plugin) - Should auto-enable after copying

### 3. Restart Unreal Editor

After installing the plugin, restart Unreal Editor for the changes to take effect.

### 4. Verify Installation

The plugin should start automatically. Check the Output Log for:
```
LogPython: UEMCP: Listener started on http://localhost:8765
```

You can also verify in the Python console:
```python
# Check if listener is running
status()
```

## How It Works

### Communication Flow

```
1. AI Assistant (Claude/Cursor) sends command to MCP Server
2. MCP Server sends HTTP request to Python listener (port 8765)
3. Python listener queues command for main thread execution
4. Command executed using Unreal's Python API
5. Results flow back through HTTP response
```

### Architecture Benefits

- **No compilation** - Pure Python implementation
- **Hot reload** - Use `restart_listener()` to update code
- **Thread-safe** - Commands queued for main thread
- **Reliable** - HTTP communication with retry logic

### Example: Spawning an Actor

1. **AI sends command** → MCP Server receives:
```json
{
  "tool": "actor_spawn",
  "arguments": {
    "assetPath": "/Game/Meshes/SM_Wall",
    "location": [1000, 0, 0]
  }
}
```

2. **MCP Server** → HTTP POST to localhost:8765:
```json
{
  "type": "actor.spawn",
  "params": {
    "assetPath": "/Game/Meshes/SM_Wall",
    "location": [1000, 0, 0]
  },
  "requestId": "unique-id"
}
```

3. **Python Listener** → Executes in UE:
```python
# Queued and executed on main thread
asset = unreal.EditorAssetLibrary.load_asset(asset_path)
actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
    asset, location, rotation
)
```

4. **Result** → Returns to AI:
```json
{
  "success": true,
  "actor": "SM_Wall_2",
  "location": [1000, 0, 0]
}
```

## Plugin Commands

Use these in the UE Python console:

```python
# Check status
status()

# Restart listener (hot reload)
restart_listener()

# Stop listener
stop_listener()

# Start listener
start_listener()

# Enable debug logging
import os
os.environ['UEMCP_DEBUG'] = '1'
restart_listener()
```

## Current Features

- **11 working MCP tools** for asset management, actor spawning, level editing
- **Hot reload** - Update Python code without restarting UE
- **Error handling** - Graceful error recovery and detailed logging
- **Performance optimization** - Reduced command processing to prevent overload

## Troubleshooting

### Listener Not Starting
- Check Output Log for errors
- Ensure Python Script Plugin is enabled
- Try `restart_listener()` in Python console

### Port 8765 Already in Use
```python
# In UE Python console
restart_listener()  # This will clean up and restart
```

### HTTP 529 Errors
- The listener automatically throttles requests
- If persistent, use `restart_listener()`

### Missing File Errors
- Check DefaultEngine.ini for old references
- Ensure plugin files are in correct location