# UEMCP Development Roadmap

**Purpose**: Development roadmap for UEMCP (Unreal Engine Model Context Protocol).

## Completed

### v2.1.0 — Modernization & UE 5.5+ Compatibility

- [x] Update MCP SDK from 1.26.0 to 1.28.0
- [x] Migrate deprecated `EditorLevelLibrary` calls to `EditorActorSubsystem`/`UnrealEditorSubsystem` APIs (UE 5.5+ compat)
- [x] Add per-operation configurable timeout (was hardcoded 10s, now supports long ops like screenshots/imports)
- [x] Update dev dependencies (TypeScript, ESLint plugins, tsx, ts-jest)
- [x] Bump version to 2.1.0

## v3.0.0 — Blueprint Graph Editing & Game Logic ✅

The #1 gap vs competitors: we can create/compile/document Blueprints but cannot edit the visual graph. This transforms AI from "scene builder" to "game logic builder."

### Phase 1: Blueprint Node & Graph Manipulation

- [x] `blueprint_add_node` — Add nodes to Blueprint event graphs
  - Event nodes (BeginPlay, Tick, EndPlay, custom events)
  - Function call nodes (any BlueprintCallable function)
  - Control flow (Branch, Sequence, ForEachLoop)
  - Math/utility operations (Kismet Math Library)
  - Variable get/set nodes
- [x] `blueprint_connect_nodes` — Connect output pins to input pins between nodes
- [x] `blueprint_disconnect_pin` — Break pin connections
- [x] `blueprint_get_graph` — Get node graph structure with connections
  - Support detail levels: `summary`, `flow`, `full`
- [x] `blueprint_remove_node` — Remove nodes from graphs
- [x] `blueprint_add_variable` — Add typed variables with instance editability and expose-on-spawn flags
- [x] `blueprint_remove_variable` — Remove variables from Blueprints
- [x] `blueprint_add_event_dispatcher` — Create multicast delegates
- [x] `blueprint_add_function` — Create custom functions with inputs/outputs
- [x] `blueprint_remove_function` — Remove custom functions from Blueprints
- [x] `blueprint_add_component` — Add components with transform & hierarchy support

### Phase 2: Enhanced Compilation

- [x] `blueprint_compile_enhanced` — Return structured errors (node-level, graph-level, component-level) to enable AI self-correction
- [x] `blueprint_discover_actions` — Query UE's reflection system for available nodes
  - Discover functions on any UE class (including inherited)
  - Search across function libraries (Math, System, Gameplay, String, etc.)
  - List available events and flow control nodes
  - Filter by category, search term, and context class

### Phase 3: Blueprint Interfaces & Console

- [x] `blueprint_implement_interface` — Add interface to existing Blueprint
- [x] `console_command` — Execute UE console commands
- [x] `blueprint_create_interface` — Create Blueprint interface assets
- [x] `blueprint_modify_component` — Set any component property via reflection
- [x] `blueprint_set_variable_default` — Set default values on CDO

## v3.1.0 — UMG Widget System ✅

Full UI building capability — essential for any real game.

- [x] `widget_create` — Create Widget Blueprint with parent class
- [x] `widget_add_component` — Add UI components (TextBlock, Button, Image, Slider, Checkbox, ProgressBar, etc.)
- [x] `widget_set_layout` — Position, size, anchors, z-order, alignment
- [x] `widget_set_property` — Set component properties (text, color, font, opacity)
- [x] `widget_bind_event` — Bind events (OnClicked, OnHovered, OnValueChanged, input events)
- [x] `widget_set_binding` — Property bindings for dynamic data
- [x] `widget_get_metadata` — Comprehensive widget inspection (components, layout, hierarchy, bindings)
- [x] `widget_screenshot` — Capture widget preview for visual verification

## v3.2.0 — Niagara VFX System ✅

Visual effects are a common AI-assisted task.

- [x] `niagara_create_system` — Create Niagara systems (with templates)
- [x] `niagara_add_emitter` — Add emitters to systems
- [x] `niagara_add_module` — Add modules (spawn, update, render) to emitters
- [x] `niagara_configure_module` — Set module parameters (float, vector, curve, enum)
- [x] `niagara_set_renderer` — Configure sprite/mesh/ribbon renderers
- [x] `niagara_compile` — Compile and save systems
- [x] `niagara_spawn` — Create VFX actors in the world
- [x] `niagara_get_metadata` — Inspect system structure

## v3.3.0 — Performance Profiling & Console ✅

Low effort, high utility.

- [x] `perf_rendering_stats` — Draw calls, VRAM usage, instance breakdown
- [x] `perf_gpu_stats` — GPU timing and memory
- [x] `perf_scene_breakdown` — Per-mesh rendering costs, LOD breakdown
- [x] `console_command` — Execute any UE console command directly

## v3.4.0 — Animation Blueprint System ✅

Required for character-driven games.

- [x] `anim_create_blueprint` — Create Animation Blueprint with skeleton reference
- [x] `anim_create_state_machine` — Build state machines programmatically
- [x] `anim_add_state` — Add states with animation references
- [x] `anim_add_transition` — Connect states with transition rules
- [x] `anim_add_variable` — Add typed variables to ABP
- [x] `anim_get_metadata` — Inspect states, variables, montages
- [x] `anim_create_montage` — Create animation montages
- [x] `anim_link_layer` — Animation layer stacking

## v3.5.0 — Advanced Materials & Audio ✅

### Material Graph Editing

- [x] `material_add_expression` — Add expression nodes (texture sample, math, parameters, custom HLSL)
- [x] `material_connect_expressions` — Link expression inputs/outputs
- [x] `material_set_expression_property` — Configure expression settings
- [x] `material_create_function` — Reusable material node graphs
- [x] `material_get_graph` — Inspect material expression structure and connections

### MetaSound/Audio

- [x] `audio_import` — Import WAV, MP3, OGG, FLAC, AIFF
- [x] `audio_create_metasound` — Create MetaSound source/patch assets
- [x] `audio_add_node` — Add audio nodes (oscillators, filters, envelopes)
- [x] `audio_connect_nodes` — Audio routing between nodes
- [x] `audio_set_parameter` — Configure audio parameters

## v3.6.0 — Data & Procedural Systems ✅

### DataTable CRUD

- [x] `datatable_create` — Create DataTables with struct definition
- [x] `datatable_add_rows` — Add rows with property mapping
- [x] `datatable_get_rows` — Query rows by name
- [x] `datatable_update_row` — Modify existing rows
- [x] `datatable_delete_row` — Remove rows

### Struct & Enum Creation

- [x] `struct_create` — Create custom UE structs with typed properties
- [x] `struct_update` — Modify existing structs
- [x] `enum_create` — Create enum definitions
- [x] `enum_get_values` — List enum values

### Enhanced Input System

- [x] `input_create_mapping` — Create input mappings with modifier support
- [x] `input_list_actions` — List available input actions
- [x] `input_get_metadata` — Input system introspection

## v3.7.0 — PCG & StateTree AI ✅

### Procedural Content Generation

- [x] `pcg_create_graph` — Create PCG graphs (with built-in templates)
- [x] `pcg_add_node` — Add nodes from 195+ available types
- [x] `pcg_connect_nodes` — Wire node connections
- [x] `pcg_set_node_property` — Configure node settings
- [x] `pcg_search_palette` — Discover available node types
- [x] `pcg_spawn_actor` — Create PCG component actors
- [x] `pcg_execute` — Run procedural generation

### StateTree AI

- [x] `statetree_create` — Create StateTree assets with schema
- [x] `statetree_add_state` — Add execution states
- [x] `statetree_add_transition` — State transition logic
- [x] `statetree_add_task` — Task execution nodes
- [x] `statetree_add_evaluator` — Global evaluators
- [x] `statetree_add_binding` — Property and target bindings
- [x] `statetree_get_metadata` — Full structure inspection

## v3.8.0 — Mesh & LOD Management ✅

- [x] `mesh_get_metadata` — LOD count, vertices, triangles, bounds, materials, Nanite support
- [x] `mesh_import_lod` — Import FBX into LOD slots
- [x] `mesh_set_lod_screen_size` — Set LOD transition thresholds
- [x] `mesh_auto_generate_lods` — Built-in mesh reduction
- [x] `mesh_get_instance_breakdown` — Rendering cost per LOD

## Backlog

- [ ] Streamable HTTP transport (MCP SDK supports this)
- [ ] Return richer MCP content types for media outputs
- [ ] MCP resource support for project/level metadata
- [ ] WebSocket transport option behind env flag
- [ ] Landscape and terrain manipulation
- [ ] Multi-user editing support
- [ ] Sequencer/cinematics tools
- [ ] Font management tools

## Prerequisites

- Node >= 20, npm
- Python 3.11+
- Unreal Engine 5.4+ (5.5+ recommended)

## Validation Checklist

```bash
./test-ci-locally.sh              # Must pass with zero warnings
VERBOSE=true node test-e2e.js     # E2E against Demo project
```
