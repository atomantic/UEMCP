# UEMCP Implementation Plan

## Overview

This document outlines future development plans for the Unreal Engine Model Context Protocol (UEMCP) server.

## Current Status

✅ **Phase 1: Foundation & Scaffolding** - COMPLETE
✅ **Phase 2: Basic MCP Implementation** - COMPLETE  
✅ **Phase 3: Python-UE Bridge** - COMPLETE
✅ **Phase 4: House Building Experiment** - COMPLETE (see [docs/house-building-experiment.md](docs/house-building-experiment.md))
✅ **Phase 5: Core Enhancement Tools** - COMPLETE
🚧 **Phase 6: Next Development Phase** - IN PLANNING

### Implemented Architecture

The current architecture is stable and production-ready:
- **Working MCP Server** with modular TypeScript implementation
- **Content-only UE Plugin** (no C++ compilation required)
- **Python HTTP Listener** running inside UE on port 8765
- **Full bidirectional communication** between Claude and UE
- **25 working MCP tools** organized by category
- **Hot reload support** via `restart_listener()`
- **Comprehensive error handling** and diagnostics
- **CI/CD pipeline** with automated testing

### Recently Completed Tools (Phase 5)

1. ✅ **Enhanced asset_info** - Comprehensive bounds, pivot, socket, and collision data
2. ✅ **batch_spawn** - Efficient multi-actor spawning with 4-5x performance improvement
3. ✅ **placement_validate** - Gap/overlap detection for modular building validation
4. ✅ **asset_import** - FAB marketplace and local asset import with advanced settings

## Phase 6: Next Development Options

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
**Objective**: Generate 3D models from text/images using local AI models and import them into UE

**New MCP Tools**:
1. **diffusion_generate_image** - Generate images from text prompts using local Stable Diffusion
2. **image_to_3d_model** - Convert 2D images to 3D models using TripoSR or similar
3. **mesh_cleanup** - Optimize and clean generated meshes
4. **auto_uv_unwrap** - Generate UV maps for texturing
5. **texture_from_image** - Create textures from generated images

**Integration Requirements**:
- Local Stable Diffusion setup (ComfyUI, A1111, or similar)
- Image-to-3D model (TripoSR, Shap-E, or similar)
- Mesh processing tools (trimesh, pymeshlab)
- Format conversion (OBJ/PLY to FBX)

**Workflow Example**:
```
User: "Create a fantasy sword and place it in the scene"

Claude Code:
1. Generating concept art with Stable Diffusion...
   Prompt: "fantasy sword, game asset, orthographic view, white background"
   
2. Converting to 3D model with TripoSR...
   Generated mesh with 5,000 triangles
   
3. Cleaning up mesh and generating UVs...
   Optimized to 2,500 triangles, UV unwrapped
   
4. Creating textures from concept art...
   Diffuse, normal, and metallic maps generated
   
5. Importing to Unreal Engine...
   Asset created at: /Game/Generated/FantasySword
   
6. Placing in scene...
   [Shows screenshot of placed sword]
```

**Use Cases**:
- Rapid prototyping of unique assets
- Creating placeholder meshes for level design
- Generating variations of existing assets
- Building custom props from descriptions
- Creating stylized environment pieces

**Technical Challenges**:
- Integration with local AI services (not cloud-based for privacy/control)
- Mesh quality and topology cleanup
- UV mapping for generated meshes
- Texture projection and material setup
- Performance optimization of generated assets

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
1. **diffusion_generate_image** - Text-to-image foundation
2. **image_to_3d_model** - Core 3D generation capability
3. **mesh_cleanup** - Essential for usable meshes
4. **auto_uv_unwrap** - Required for texturing
5. **texture_from_image** - Complete the asset pipeline

## Technical Considerations

### For Blueprint Tools:
- Blueprint manipulation requires careful handling of the UE reflection system
- Need to ensure proper compilation and validation after modifications
- Should provide templates for common patterns (door, switch, trigger, etc.)
- Must handle Blueprint inheritance chains correctly

### For AI Asset Pipeline:
- Requires local GPU with sufficient VRAM (8GB+ recommended)
- Need to handle async operations for AI generation (can take 30s-2min per asset)
- Mesh topology from AI models often needs significant cleanup
- Should implement quality checks and automatic retries
- Consider caching generated assets to avoid regeneration
- Need robust error handling for AI model failures

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