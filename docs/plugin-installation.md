# UEMCP Plugin Installation Guide

## Overview

The UEMCP system consists of three components:
1. **MCP Server** (Node.js) - Communicates with AI assistants
2. **Python Bridge** - Executes commands in Unreal Engine
3. **UEMCP Plugin** (C++) - Extends UE functionality

## Installation Steps

### 1. Install the UEMCP Plugin

#### Option A: Project-Specific Installation (Recommended)
```bash
# Copy plugin to your project
cp -r <PATH_TO_UEMCP>/plugin <YOUR_UE_PROJECT>/Plugins/UEMCP
```

#### Option B: Engine-Wide Installation
```bash
# Copy plugin to engine (requires admin)
cp -r <PATH_TO_UEMCP>/plugin "<UE_ENGINE_PATH>/Engine/Plugins/Developer/UEMCP"
```

### 2. Enable Required Plugins

In your project, ensure these plugins are enabled:
- **Python Script Plugin** (built-in)
- **Editor Scripting Utilities** (built-in)
- **UEMCP** (our plugin)

### 3. Configure Python Environment

Set the environment variable to help UEMCP find Unreal:
```bash
export UE_INSTALL_LOCATION="<PATH_TO_UE_ENGINE>"
```

Add to your shell profile (~/.zshrc or ~/.bash_profile) to make permanent.

### 4. Rebuild Project

After installing the plugin:
1. Right-click your .uproject file
2. Select "Generate Xcode project files" (Mac) or "Generate Visual Studio project files" (Windows)
3. Open the project in your IDE and build

### 5. Verify Installation

1. Open your project in Unreal Editor
2. Go to Edit → Plugins
3. Search for "UEMCP" and ensure it's enabled
4. Check Tools menu for "UEMCP Status" option

## How It Works

### Communication Flow

```
1. AI Assistant (Claude/Cursor) sends command to MCP Server
2. MCP Server calls Python Bridge (ue_executor.py)
3. Python Bridge executes command in UE via Python API
4. UEMCP Plugin provides additional functionality
5. Results flow back through the chain
```

### Example: Creating a Blueprint

1. **AI sends command** → MCP Server receives:
```json
{
  "tool": "blueprint.create",
  "arguments": {
    "name": "BP_MyActor",
    "parentClass": "Actor"
  }
}
```

2. **MCP Server** → Calls Python Bridge:
```bash
python3 ue_executor.py '{"type":"blueprint.create","params":{...}}'
```

3. **Python Bridge** → Executes in UE:
```python
# Inside Unreal's Python environment
asset_tools.create_asset(
    asset_name="BP_MyActor",
    package_path="/Game/Blueprints",
    asset_class=unreal.Blueprint,
    factory=bp_factory
)
```

4. **Result** → Returns to AI:
```json
{
  "success": true,
  "blueprintPath": "/Game/Blueprints/BP_MyActor"
}
```

## Current Limitations

1. **Editor Must Be Running**: Most operations require UE Editor to be open
2. **Project-Specific**: Commands operate on the currently open project
3. **Python API Limits**: Some operations may require C++ implementation

## Troubleshooting

### Plugin Not Found
- Ensure plugin is in correct directory
- Regenerate project files
- Check .uproject file includes the plugin

### Python Commands Fail
- Verify Python Script Plugin is enabled
- Check UE_INSTALL_LOCATION environment variable
- Look for errors in Output Log (Window → Developer Tools → Output Log)

### MCP Connection Issues
- Ensure MCP server is running
- Check Claude Desktop configuration
- Verify paths in configuration match your setup