# MCP to Unreal Engine Communication Architecture

## Overview

The UEMCP system uses a multi-layer approach to communicate with Unreal Engine:

```
Claude/AI Assistant → MCP Server (Node.js) → HTTP → Python Listener (in UE) → Unreal Engine
```

## Communication Flow

### 1. **MCP Server (Node.js)**
- Receives commands from AI assistants via Model Context Protocol
- Validates and routes commands through HTTP requests
- Location: `server/`
- Runs on port 8080 (configurable)

### 2. **Python Bridge Layer**
- Makes HTTP POST requests to the Python listener in UE
- Handles retries and error responses
- Location: `server/src/services/python-bridge.ts`

### 3. **Python HTTP Listener (Content-Only Plugin)**
- Runs inside Unreal Engine on port 8765
- Receives HTTP commands and queues them for main thread execution
- Uses Unreal's Python API for all operations
- Location: `plugin/Content/Python/uemcp_listener.py`

## Current Architecture

### Content-Only Plugin Design

The UEMCP plugin is now a **content-only plugin** that requires no C++ compilation:

1. **No C++ Required**
   - All functionality implemented through Python scripts
   - Eliminates compilation requirements
   - Works immediately after copying to UE project

2. **HTTP Communication**
   - Python listener runs an HTTP server inside UE
   - Commands sent as JSON over HTTP POST
   - Asynchronous command queue for thread safety

3. **Hot Reload Support**
   - Use `restart_listener()` to reload changes without restarting UE
   - Instant development iteration

## Communication Flow Details

### Request Flow:
```
1. AI Assistant calls MCP tool
2. MCP Server receives tool request
3. Python Bridge sends HTTP POST to localhost:8765
4. Python Listener queues command
5. Main thread processes command using UE Python API
6. Result returned via HTTP response
7. MCP Server returns result to AI
```

### Command Structure:
```json
{
  "type": "project.info",
  "params": {},
  "requestId": "unique-id"
}
```

## Implementation Status

### ✅ Completed Features:
- Content-only plugin (no C++ compilation)
- HTTP listener with command queue
- 11 working MCP tools
- Hot reload functionality
- Comprehensive error handling
- Rate limiting protection

### 🚧 Future Enhancements:
- WebSocket support for real-time updates
- Batch command processing
- Command history and undo
- Performance metrics collection

## Plugin Installation

The plugin will be installed in either:
1. **Project-specific**: `<UE_PROJECT_PATH>/Plugins/UEMCP/`
2. **Engine-wide**: `<UE_ENGINE_PATH>/Engine/Plugins/UEMCP/`

Project-specific is recommended for development.