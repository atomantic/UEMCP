# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UEMCP (Unreal Engine Model Context Protocol) is an MCP server that bridges AI assistants with Unreal Engine development. The project is in initial development phase with a planned multi-layer architecture.

## Architecture

The system consists of three main layers:
- **MCP Server** (TypeScript/Node.js): Implements Model Context Protocol, handles AI assistant requests
- **Python Bridge** (Python 3.8+): Interfaces with Unreal Engine's Python API
- **C++ Plugin** (C++17): Native UE plugin for performance-critical operations

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

## Key Development Patterns

1. **Mock-First Development**: Implement mock systems before real UE integration to enable testing
2. **Tool-Based Architecture**: Each UE operation exposed as a discrete MCP tool
3. **Bridge Pattern**: Python layer mediates between TypeScript server and C++ plugin

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

The project is in initial scaffolding phase. Refer to PLAN.md for the implementation roadmap and README.md for feature specifications.