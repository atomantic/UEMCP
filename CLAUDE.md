# CLAUDE.md

Project-wide context for UEMCP - an MCP server bridging AI assistants with Unreal Engine development.

## Architecture Overview

- **MCP Server** (TypeScript/Node.js): Implements Model Context Protocol, handles AI assistant requests
- **Python Bridge** (Python 3.11): Interfaces with Unreal Engine's Python API via HTTP
- **UE Plugin** (Content-only): Python listener that runs inside Unreal Engine

## Quick Start

```bash
# Setup
npm install
pip install -r requirements.txt

# Testing & CI
./test-ci-locally.sh  # Run before committing - MUST pass with zero warnings
npm test              # JavaScript/TypeScript tests
python -m pytest      # Python tests
```

**CRITICAL**: Zero warnings policy enforced by pre-commit hooks

## Module-Specific Context

- **Server Module** (`server/CLAUDE.md`): TypeScript standards, MCP implementation
- **Plugin Module** (`plugin/CLAUDE.md`): UE Python integration, hot reload workflow
- **Documentation** (`docs/`): Detailed comparisons, architecture diagrams

## Core Development Principles

### MCP Tool Usage
- **Claude Code Integration**: MCP server starts automatically with `claude -c`
- **Direct Tool Usage**: Call MCP tools directly, no test scripts needed
- **Hot Reload**: Use `restart_listener()` in UE console for instant updates

### Tool Development Philosophy

**CRITICAL**: Never use `python_proxy` as a workaround for missing tool functionality.
- Fix or create proper MCP tools instead
- Tools provide 85% less code, better error handling, type safety
- Only use `python_proxy` for one-off debugging or exploration

See `docs/mcp-tools-vs-python-proxy.md` for detailed comparisons.

### Code Style Philosophy

- **Line Endings**: Always use LF (Unix-style), never CRLF
- **Exception Handling**: Minimize try/catch - prefer validation
- **Zero Warnings Policy**: Enforced by pre-commit hooks
- **Post-Feature Simplification**: Always run `/simplify` after implementing a feature to catch duplication, quality issues, and efficiency problems before committing

See `docs/code-style-guide.md` for comprehensive standards.

## Unreal Engine Integration

### Coordinate System
- **X-/X+**: North/South
- **Y-/Y+**: East/West
- **Z+**: Up

### Rotation Arrays [Roll, Pitch, Yaw]
- **Roll**: Sideways tilt (keep at 0)
- **Pitch**: Look up/down
- **Yaw**: Turn left/right

See `docs/unreal-engine-conventions.md` for viewport control and placement details.

## Current Working Environment

- **Active UE Project**: /Users/antic/Documents/Unreal Projects/Home/
- **Plugin Location**: /Users/antic/Documents/Unreal Projects/Home/Plugins/UEMCP/
- **Python Listener**: http://localhost:8765


## Debugging & Logs

### Log Locations
- **UE Editor Log**: `/Users/antic/Library/Logs/Unreal Engine/HomeEditor/Home.log`
- **Python Output**: Look for `LogPython:` lines in UE Output Log
- **MCP Debug**: Run with `DEBUG=uemcp:* npm start`

### Enable Verbose Logging
```python
os.environ['UEMCP_DEBUG'] = '1'
restart_listener()
```

## Screenshot Optimization

- **Default**: 640×360, 50% quality, JPEG compression (~50-100KB)
- **Wireframe Mode**: Use for debugging placement (smaller files, clearer structure)

```typescript
// For debugging
viewport_render_mode({ mode: 'wireframe' })
viewport_screenshot()
viewport_render_mode({ mode: 'lit' })
```

## Troubleshooting

- **Port 8765 in use**: `uemcp_port_utils.force_free_port(8765)`
- **Changes not reflected**: Use `restart_listener()` after modifying Python
- **Git CRLF warnings**: File has Windows line endings - convert to LF
- **Screenshot delay**: Wait 1 second after viewport_screenshot for file write