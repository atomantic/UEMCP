# UEMCP Implementation Plan

## Overview

This document outlines the implementation roadmap and future development plans for the Unreal Engine Model Context Protocol (UEMCP) server.

## Current Status (December 2024)

✅ **Phase 1: Foundation & Scaffolding** - COMPLETE
✅ **Phase 2: Basic MCP Implementation** - COMPLETE  
✅ **Phase 3: Python-UE Bridge** - COMPLETE
✅ **Phase 4: House Building Experiment** - COMPLETE (see [docs/examples/house-building.md](docs/examples/house-building.md))
✅ **Phase 5: Core Enhancement Tools** - COMPLETE
✅ **Phase 6: Material Management Tools** - COMPLETE
🚧 **Phase 7: Next Development Phase** - IN PLANNING

### Implemented Architecture

The current architecture is stable and production-ready:
- **Working MCP Server** with modular TypeScript implementation
- **Content-only UE Plugin** (no C++ compilation required)
- **Python HTTP Listener** running inside UE on port 8765
- **Full bidirectional communication** between Claude and UE
- **29 working MCP tools** organized by category
- **Hot reload support** via `restart_listener()`
- **Comprehensive error handling** and diagnostics
- **CI/CD pipeline** with automated testing

### Recently Completed Tools (Phases 5-6)

**Phase 5 - Core Enhancements (Completed November 2024):**
1. ✅ **Enhanced asset_info** - Comprehensive bounds, pivot, socket, and collision data
2. ✅ **batch_spawn** - Efficient multi-actor spawning with 4-5x performance improvement
3. ✅ **placement_validate** - Gap/overlap detection for modular building validation
4. ✅ **asset_import** - FAB marketplace and local asset import with advanced settings

**Phase 6 - Material Management (Completed December 2024):**
1. ✅ **material_list** - List and filter materials in project
2. ✅ **material_info** - Get detailed material information including parameters
3. ✅ **material_create** - Create new materials and material instances
4. ✅ **material_apply** - Apply materials to actors and components

## Recently Completed Fixes (December 2024)

### Major Bug Fixes Completed
1. ✅ **Fixed restart_listener crashes**
   - Removed double-start issue on plugin initialization
   - Implemented safe automatic restart using UE tick callbacks
   - Fixed thread deadlock that was freezing Unreal Engine
   - Restart now completes reliably in ~2 seconds

2. ✅ **Fixed asset_info material retrieval**
   - Replaced deprecated `get_static_materials()` with proper API detection
   - Now checks for `static_materials` attribute first (UE 5.6)
   - Falls back to `get_static_mesh_materials()` method
   - Final fallback to `get_material()` for section materials
   - Properly handles different material slot data structures

3. ✅ **Enhanced error handling**
   - Asset info returns clear message for non-existent assets
   - Graceful handling of missing collision/socket methods
   - Better error messages throughout the system

### Verified Working Tools
All 29 MCP tools are now functioning correctly:
- **restart_listener** - Hot reloads without crashes
- **asset_info** - Returns complete asset data including materials
- **batch_spawn** - Efficient multi-actor spawning
- **placement_validate** - Gap/overlap detection for modular building
- All other tools tested and operational

## Phase 7: Next Development Options

Based on our house building experiment and current capabilities, here are the next potential development phases:

### Option A: Blueprint Tools
**Objective**: Enable programmatic creation and modification of Blueprint classes

**New MCP Tools**:
1. **blueprint_create** - Create new Blueprint classes from C++ or Blueprint parents
2. **blueprint_add_component** - Add components to Blueprint actors
3. **blueprint_set_variable** - Create and modify Blueprint variables
4. **blueprint_add_function** - Add custom functions with parameters
5. **blueprint_create_event_graph** - Set up event-driven logic

**Use Cases**:
- Create interactive doors/windows with open/close functionality
- Build reusable gameplay mechanics
- Set up trigger volumes with custom events
- Create UI widgets programmatically

### Option B: Material & Rendering Tools
**Objective**: Dynamic material creation and modification

**New MCP Tools**:
1. **material_create_instance** - Create material instances from parent materials
2. **material_set_parameter** - Modify scalar/vector/texture parameters
3. **material_apply_to_actor** - Apply materials to specific actors/components
4. **render_settings_modify** - Adjust post-processing and rendering settings

**Use Cases**:
- Change building colors/textures dynamically
- Create weather effects (wet surfaces, snow accumulation)
- Adjust lighting mood and atmosphere
- Optimize material usage across many actors

### Option C: Level & World Composition Tools
**Objective**: Advanced level management and world building

**New MCP Tools**:
1. **level_create** - Create new levels/sublevels
2. **level_stream** - Set up level streaming volumes
3. **world_partition_setup** - Configure world partition settings
4. **landscape_sculpt** - Basic landscape modification tools
5. **foliage_paint** - Procedural foliage placement

**Use Cases**:
- Create large open worlds with streaming
- Organize complex projects into sublevels
- Set up interior/exterior transitions
- Build natural environments

### Option D: Animation & Sequencer Tools
**Objective**: Create cinematics and animated sequences

**New MCP Tools**:
1. **sequencer_create** - Create new level sequences
2. **sequencer_add_track** - Add animation tracks for actors
3. **camera_animate** - Create camera movements and cuts
4. **sequencer_export** - Export cinematics as video

**Use Cases**:
- Create architectural walkthroughs
- Build cutscenes for games
- Animate doors, elevators, moving platforms
- Generate marketing videos of levels

### Option E: Physics & Simulation Tools
**Objective**: Add physics-based interactions and simulations

**New MCP Tools**:
1. **physics_enable** - Enable physics simulation on actors
2. **constraint_create** - Create physics constraints between actors
3. **destructible_setup** - Configure destructible meshes
4. **physics_simulate** - Run physics simulations

**Use Cases**:
- Create destructible environments
- Build physics puzzles
- Simulate structural integrity
- Add realistic object interactions

### Option F: AI-Generated 3D Asset Pipeline
**Objective**: Generate 3D models from text/images using ComfyUI and ComfyUI-3D-Pack

**New MCP Tools**:
1. **comfyui_connect** - Connect to local ComfyUI API server
2. **comfyui_workflow_execute** - Execute custom ComfyUI workflows
3. **comfyui_generate_image** - Generate images using Stable Diffusion workflows
4. **comfyui_image_to_3d** - Convert images to 3D using ComfyUI-3D-Pack nodes
5. **mesh_import_cleanup** - Import and optimize generated meshes for UE

**Integration Requirements**:
- ComfyUI with API enabled (`--enable-cors-header` flag)
- [ComfyUI-3D-Pack](https://github.com/MrForExample/ComfyUI-3D-Pack) installed
- Required 3D models: TripoSR, Zero123Plus, MVDream, etc.
- Python libraries: trimesh, numpy, pillow
- GPU with 8GB+ VRAM (16GB recommended for larger models)

**Workflow Example**:
```
User: "Create a fantasy sword and place it in the scene"

Claude Code:
1. Connecting to ComfyUI API...
   ✓ Connected to localhost:8188
   
2. Loading image generation workflow...
   Using: SD XL + ControlNet for orthographic views
   Prompt: "fantasy sword, game asset, orthographic view, white background"
   
3. Generating multi-view images...
   ✓ Generated 4 views (front, side, top, perspective)
   
4. Running 3D generation with ComfyUI-3D-Pack...
   Model: TripoSR
   ✓ Generated mesh: 8,000 vertices, 15,000 faces
   
5. Post-processing in ComfyUI...
   - Mesh decimation to 3,000 faces
   - UV unwrapping with xatlas
   - Texture baking from input images
   
6. Importing to Unreal Engine...
   ✓ Converted to FBX format
   ✓ Imported to: /Game/Generated/FantasySword
   ✓ Applied generated textures
   
7. Placing in scene...
   [Shows screenshot of placed sword]
```

**ComfyUI Workflow Benefits**:
- Visual node-based workflow creation
- Extensive model support (Stable Diffusion, TripoSR, Zero123Plus, etc.)
- Built-in mesh processing nodes
- Batch processing capabilities
- Easy workflow sharing and version control

**Use Cases**:
- Rapid prototyping of unique assets
- Creating placeholder meshes for level design
- Generating variations of existing assets
- Building custom props from descriptions
- Creating stylized environment pieces

**Technical Architecture**:
```
UEMCP <--> ComfyUI API <--> ComfyUI-3D-Pack
  |            |                    |
  |            |                    +-- TripoSR
  |            |                    +-- Zero123Plus
  |            |                    +-- MVDream
  |            +-- Stable Diffusion +-- Instant3D
  |            +-- ControlNet       +-- Mesh Processing
  |            +-- Custom Workflows
  |
  +-- Asset Import Pipeline
  +-- Material Setup
  +-- Actor Placement
```

**Technical Challenges**:
- ComfyUI API integration and workflow management
- Handling long-running async operations (30s-2min per model)
- Mesh quality varies by model and input image
- Memory management for large models
- Workflow versioning and compatibility

## Recommendation

Based on user needs and maximum impact, I recommend proceeding with **Option A: Blueprint Tools** as the next phase. This would:

1. Enable creation of interactive elements (doors, switches, triggers)
2. Allow building reusable gameplay systems
3. Provide the foundation for more complex automation
4. Have high value for both architectural visualization and game development

The Blueprint tools would complement our existing building tools perfectly, allowing users to not just build structures but make them interactive and functional.

**Alternative High-Impact Option**: The AI-Generated 3D Asset Pipeline (Option F) could be transformative for rapid prototyping and content creation, especially if you already have local AI infrastructure set up. This would be particularly valuable for:
- Indie developers needing unique assets quickly
- Rapid iteration on design concepts
- Creating placeholder content for level blockouts
- Generating variations of existing themes

The choice between Blueprint Tools and AI Asset Pipeline depends on whether your priority is making existing content interactive (Blueprint) or rapidly generating new content (AI Pipeline).

## Implementation Priority

### If proceeding with Blueprint Tools:
1. **blueprint_create** - Foundation for all other Blueprint operations
2. **blueprint_add_component** - Essential for actor composition
3. **blueprint_set_variable** - Enable data-driven Blueprints
4. **blueprint_create_event** - Add interactivity
5. **blueprint_compile** - Ensure changes take effect

### If proceeding with AI Asset Pipeline:
1. **comfyui_connect** - Establish API connection and validate setup
2. **comfyui_workflow_execute** - Core workflow execution engine
3. **comfyui_generate_image** - Stable Diffusion integration
4. **comfyui_image_to_3d** - 3D generation with ComfyUI-3D-Pack
5. **mesh_import_cleanup** - UE-ready asset preparation

## Technical Considerations

### For Blueprint Tools:
- Blueprint manipulation requires careful handling of the UE reflection system
- Need to ensure proper compilation and validation after modifications
- Should provide templates for common patterns (door, switch, trigger, etc.)
- Must handle Blueprint inheritance chains correctly

### For AI Asset Pipeline with ComfyUI:
- Requires ComfyUI server running with API enabled: `python main.py --enable-cors-header`
- GPU with 8GB+ VRAM (16GB recommended for best quality models)
- ComfyUI-3D-Pack installation with model weights downloaded
- Workflow files (.json) for different generation tasks
- WebSocket connection for progress monitoring
- Result polling system for long-running operations
- Proper error handling for ComfyUI node failures
- Consider implementing workflow templates for common asset types

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

- [House Building Experiment](docs/examples/house-building.md) - Learnings from real-world usage
- [Python API Workarounds](docs/reference/python-api-workarounds.md) - Known issues and solutions
- [Enhancement Roadmap](docs/reference/enhancement-roadmap.md) - Detailed tool requirements