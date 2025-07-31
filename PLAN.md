# UEMCP Implementation Plan

## Overview

This document outlines future development plans for the Unreal Engine Model Context Protocol (UEMCP) server.

## Current Status

✅ **Phase 1: Foundation & Scaffolding** - COMPLETE
✅ **Phase 2: Basic MCP Implementation** - COMPLETE  
✅ **Phase 3: Python-UE Bridge** - COMPLETE
✅ **Phase 4: House Building Experiment** - COMPLETE (see [docs/house-building-experiment.md](docs/house-building-experiment.md))
🚧 **Phase 5: Enhanced Features** - IN PLANNING

### Implemented Architecture

The current architecture is stable and production-ready:
- **Working MCP Server** with modular TypeScript implementation
- **Content-only UE Plugin** (no C++ compilation required)
- **Python HTTP Listener** running inside UE on port 8765
- **Full bidirectional communication** between Claude and UE
- **22 working MCP tools** organized by category
- **Hot reload support** via `restart_listener()`
- **Comprehensive error handling** and diagnostics
- **CI/CD pipeline** with automated testing

## Phase 5: FAB Asset Integration

### Overview

**Objective**: Enable UEMCP to import and use FAB marketplace assets that users have downloaded, providing a streamlined workflow for using FAB content in projects.

**Important**: Direct FAB marketplace API access is not available through Unreal Engine's Python API. Users must manually download assets from FAB, then we can automate the import and usage.

### Implementation Plan

#### New MCP Tools Required

1. **Enhanced Asset Import Tool**
```typescript
// asset_import - Import downloaded assets
{
  sourcePath: string,
  targetPath: string,
  importOptions?: {
    generateLightmapUVs?: boolean,
    autoGenerateCollision?: boolean,
    materialImportMethod?: string
  }
}
```

2. **Folder Scanning Tool**
```typescript
// scan_import_folder - Detect downloadable assets
{
  folderPath: string,
  recursive?: boolean,
  fileTypes?: string[]
}
```

### Expected User Experience

```
User: "I just downloaded some medieval furniture from FAB to ~/Downloads/FAB/Medieval. Import them into my project and place a few pieces"

Claude Code:
1. Scanning folder for FAB assets...
   Found: SM_Medieval_Table.fbx, SM_Medieval_Chair.fbx, textures, materials
   
2. Importing assets with collision generation...
   Import successful! Assets are now in /Game/FAB/Medieval/
   
3. Placing furniture in your level...
   [Uses actor_spawn for each asset]
   
4. Here's your medieval furniture setup:
   [Uses viewport_screenshot]
```

## Phase 6: Enhanced MCP Tools

Based on the house building experiment, these tools would significantly improve workflows:

### Critical Priority
1. **Asset Snapping System** - Socket-based placement
2. **Batch Operations** - Spawn/modify multiple actors
3. **Placement Validation** - Detect gaps and overlaps
4. **Enhanced Asset Info** - Sockets, bounds, pivot data

### High Priority
1. **Blueprint Graph Editing** - Modify existing Blueprints
2. **Material Instance Creation** - Runtime material customization
3. **Selection Groups** - Work with multiple actors
4. **Grid Snap Control** - Toggle and configure grid snapping

### Future Considerations
1. **Lighting Preview** - Real-time lighting changes
2. **Physics Simulation** - Test structural integrity
3. **Performance Metrics** - FPS and complexity tracking
4. **Level Streaming** - Handle large worlds

## Development Principles

1. **MCP-First**: Always prefer dedicated tools over python_proxy workarounds
2. **User Experience**: Clear error messages and intuitive APIs
3. **Performance**: Optimize for common workflows
4. **Maintainability**: Modular architecture with comprehensive tests
5. **Documentation**: Keep docs in sync with implementation

## Success Metrics

- **Tool Coverage**: 90%+ of common editor operations available as MCP tools
- **Performance**: Sub-second response time for most operations
- **Reliability**: 99%+ success rate for standard operations
- **Developer Experience**: New contributors can add tools in < 1 hour
- **User Satisfaction**: AI assistants can complete complex tasks without manual intervention

## References

- [House Building Experiment](docs/house-building-experiment.md) - Learnings from real-world usage
- [Python API Workarounds](docs/python-api-workarounds.md) - Known issues and solutions
- [MCP Enhancement Needs](docs/mcp-enhancement-needs.md) - Detailed tool requirements