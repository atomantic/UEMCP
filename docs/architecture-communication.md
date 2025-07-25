# MCP to Unreal Engine Communication Architecture

## Overview

The UEMCP system uses a multi-layer approach to communicate with Unreal Engine:

```
Claude/Cursor → MCP Server (Node.js) → Python Bridge → UE Plugin → Unreal Engine
```

## Communication Flow

### 1. **MCP Server (Node.js)**
- Receives commands from AI assistants via Model Context Protocol
- Validates and routes commands
- Currently location: `server/`

### 2. **Python Bridge**
- Communicates with MCP server via subprocess/IPC
- Uses Unreal's Python API for editor operations
- Location: `python/`

### 3. **Unreal Engine Plugin (C++)**
- Provides additional functionality not available in Python API
- Handles performance-critical operations
- Exposes new Python bindings
- Location: `plugin/` → will be installed to UE project

## Plugin Architecture

### Why We Need a Plugin

1. **Python API Limitations**
   - Some UE operations aren't exposed to Python
   - Performance-critical operations need C++
   - Custom editor tools and panels

2. **Extended Capabilities**
   - Real-time communication with MCP server
   - Custom asset importers
   - Build system integration
   - Advanced Blueprint manipulation

3. **Better Integration**
   - Custom editor notifications
   - Progress tracking for long operations
   - Error handling and recovery

## Implementation Plan

### Phase 1: Python-Only (Week 2)
- Use UE's built-in Python plugin
- Implement basic operations via Python API
- No custom plugin needed initially

### Phase 2: Hybrid Approach (Week 3-4)
- Create UEMCP plugin for extended features
- Plugin provides additional Python bindings
- Mix of Python scripts and C++ code

### Phase 3: Full Integration (Week 5-6)
- Complete plugin with all features
- Optional: Direct IPC from plugin to MCP server
- Performance optimizations

## Communication Methods

### Current Plan: Python Script Execution
```
MCP Server → spawn Python process → unreal.py script → UE Python API
```

### Future Enhancement: Direct Plugin Communication
```
MCP Server ← HTTP/WebSocket → UEMCP Plugin (C++) → UE Core
```

## Plugin Installation

The plugin will be installed in either:
1. **Project-specific**: `<UE_PROJECT_PATH>/Plugins/UEMCP/`
2. **Engine-wide**: `<UE_ENGINE_PATH>/Engine/Plugins/UEMCP/`

Project-specific is recommended for development.