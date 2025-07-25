# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UEMCP (Unreal Engine Model Context Protocol) is an MCP server that bridges AI assistants with Unreal Engine development. The project is in active development with a working implementation.

## Architecture

The system consists of three main layers:
- **MCP Server** (TypeScript/Node.js): Implements Model Context Protocol, handles AI assistant requests
- **Python Bridge** (Python 3.8+): Interfaces with Unreal Engine's Python API via HTTP
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
```

## Project Structure

```
server/     - MCP server implementation (TypeScript)
plugin/     - Unreal Engine plugin (C++)
python/     - Python bridge layer and utilities
docs/       - Documentation
tests/      - Test suites for all components
```

## Plugin Development Workflow

When making changes to the plugin:

1. **Edit in git repository**:
   ```bash
   # Make changes in /Users/antic/github.com/atomantic/UEMCP_dev/plugin/
   ```

2. **Copy to UE project for testing**:
   ```bash
   cp -r plugin/* "/Users/antic/Documents/Unreal Projects/Home/Plugins/UEMCP/"
   ```

3. **Reload in Unreal Engine** (Python console):
   ```python
   restart_listener()  # Reloads changes without restarting UE
   ```

4. **After testing, sync back to git**:
   ```bash
   cp -r "/Users/antic/Documents/Unreal Projects/Home/Plugins/UEMCP/"* plugin/
   git add -A && git commit -m "your changes"
   ```

## Helper Functions

Available in UE Python console after plugin loads:
- `restart_listener()` - Reload the listener with code changes
- `reload_uemcp()` - Alias for restart_listener()
- `status()` - Check if listener is running
- `stop_listener()` - Stop the listener
- `start_listener()` - Start the listener

## Key Development Patterns

1. **Content-Only Plugin**: No C++ compilation needed, all functionality via Python
2. **Tool-Based Architecture**: Each UE operation exposed as a discrete MCP tool
3. **Hot Reload**: Use `restart_listener()` to test changes without restarting UE
4. **Sync Pattern**: Always sync changes between UE project and git repository

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

The project has a working implementation with the following capabilities:
- Project information retrieval
- Asset listing and filtering
- Actor spawning (static meshes and blueprints)
- Level actor management
- Level saving

## Current Working Environment

- **Active UE Project**: /Users/antic/Documents/Unreal Projects/Home/
- **Plugin Location**: /Users/antic/Documents/Unreal Projects/Home/Plugins/UEMCP/
- **Python Listener**: Running on http://localhost:8765
- **Available Assets**: ModularOldTown building components in /Game/ModularOldTown/Meshes/