# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UEMCP (Unreal Engine Model Context Protocol) is an MCP server that bridges AI assistants with Unreal Engine development. The project is in active development with a working implementation.

## Architecture

The system consists of three main layers:
- **MCP Server** (TypeScript/Node.js): Implements Model Context Protocol, handles AI assistant requests
- **Python Bridge** (Python 3.11): Interfaces with Unreal Engine's Python API via HTTP (matches UE 5.4+ built-in Python)
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
plugin/     - Unreal Engine plugin (Python-only, no C++)
python/     - Python utilities for development (not used at runtime)
docs/       - Documentation
tests/      - Test suites for all components
```

## Plugin Development Workflow

**IMPORTANT**: The plugin directory is symlinked from the git repository to the UE project:
```bash
# Symlink already exists:
/Users/antic/Documents/Unreal Projects/Home/Plugins/UEMCP -> /Users/antic/github.com/atomantic/UEMCP_dev/plugin
```

This means:
1. **Edit directly in git repository** - changes are immediately reflected in UE
2. **No copying needed** - the symlink handles file synchronization
3. **Just reload in UE** after making changes:
   ```python
   restart_listener()  # Reloads changes without restarting UE
   ```

When making changes to the plugin:

1. **Edit in git repository**:
   ```bash
   # Make changes in /Users/antic/github.com/atomantic/UEMCP_dev/plugin/
   ```

2. **Reload in Unreal Engine** (Python console):
   ```python
   restart_listener()  # Reloads changes without restarting UE
   ```

3. **Commit changes**:
   ```bash
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
5. **Line Endings**: Always use LF (Unix-style) line endings, never CRLF (Windows-style)

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

The project has a working implementation with the following MCP tools:
- `project_create` - Create new UE projects (mock implementation)
- `project_info` - Get project information
- `asset_list` - List and filter project assets
- `asset_info` - Get asset dimensions and properties
- `actor_spawn` - Spawn actors (static meshes and blueprints)
- `actor_delete` - Delete actors by name
- `actor_modify` - Modify actor transforms
- `level_actors` - List actors in the current level
- `level_save` - Save the current level
- `viewport_screenshot` - Capture viewport screenshots
- `viewport_camera` - Control viewport camera position
- `test_connection` - Test connection to Python listener
- `restart_listener` - Restart Python listener for hot reload

## Current Working Environment

- **Active UE Project**: /Users/antic/Documents/Unreal Projects/Home/
- **Plugin Location**: /Users/antic/Documents/Unreal Projects/Home/Plugins/UEMCP/
- **Python Listener**: Running on http://localhost:8765
- **Available Assets**: ModularOldTown building components in /Game/ModularOldTown/Meshes/

## Accessing Logs

### Unreal Engine Logs
UE logs are typically found in:
- **Editor Log**: Window → Developer Tools → Output Log (in UE Editor)
- **File Location**: `[Project]/Saved/Logs/[ProjectName].log`
- **Python Output**: Look for lines starting with `LogPython:` in the Output Log

### UEMCP Debug Logging
To enable verbose UEMCP logging:
1. Set environment variable: `export UEMCP_DEBUG=1`
2. Or in UE Python console: `os.environ['UEMCP_DEBUG'] = '1'`
3. Then `restart_listener()` to apply

### MCP Server Logs
- Run with debug: `DEBUG=uemcp:* npm start`
- Logs appear in the terminal where the MCP server is running

**Note**: Claude can access log files directly via the filesystem if you provide the path. No special MCP tool is needed for log access.

## Code Style Guidelines

### Line Endings
**IMPORTANT**: Always use LF (Unix-style) line endings, not CRLF (Windows-style):
- Git is configured to warn about CRLF line endings
- All files should use `\n` not `\r\n`
- This prevents cross-platform issues and git warnings

### File Formatting
- Use spaces, not tabs (except in Makefiles)
- 2 spaces for JavaScript/TypeScript
- 4 spaces for Python
- No trailing whitespace
- Files should end with a single newline

## Troubleshooting Common Issues

1. **Port 8765 in use**: 
   ```python
   import uemcp_port_utils
   uemcp_port_utils.force_free_port(8765)
   ```

2. **Changes not reflected**: Always use `restart_listener()` after modifying Python files

3. **Audio buffer underrun**: This has been addressed by reducing command processing rate and screenshot resolution

4. **Deprecation warnings**: Fixed by using `UnrealEditorSubsystem()` instead of deprecated APIs

5. **Git CRLF warnings**: If you see "CRLF will be replaced by LF" warnings, the file has Windows line endings that need to be fixed