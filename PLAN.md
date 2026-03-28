# UEMCP Development Roadmap

**Purpose**: Development roadmap for UEMCP (Unreal Engine Model Context Protocol).

## Completed

### v2.1.0 — Modernization & UE 5.5+ Compatibility

- [x] Update MCP SDK from 1.26.0 to 1.28.0
- [x] Migrate deprecated `EditorLevelLibrary` calls to `EditorActorSubsystem`/`UnrealEditorSubsystem` APIs (UE 5.5+ compat)
- [x] Add per-operation configurable timeout (was hardcoded 10s, now supports long ops like screenshots/imports)
- [x] Update dev dependencies (TypeScript, ESLint plugins, tsx, ts-jest)
- [x] Bump version to 2.1.0

## Current Focus: v3.0.0 — Blueprint Graph Editing & Game Logic

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

## v3.1.0 — UMG Widget System

Full UI building capability — essential for any real game.

- [ ] `widget_create` — Create Widget Blueprint with parent class
- [ ] `widget_add_component` — Add UI components (TextBlock, Button, Image, Slider, Checkbox, ProgressBar, etc.)
- [ ] `widget_set_layout` — Position, size, anchors, z-order, alignment
- [ ] `widget_set_property` — Set component properties (text, color, font, opacity)
- [ ] `widget_bind_event` — Bind events (OnClicked, OnHovered, OnValueChanged, input events)
- [ ] `widget_set_binding` — Property bindings for dynamic data
- [ ] `widget_get_metadata` — Comprehensive widget inspection (components, layout, hierarchy, bindings)
- [ ] `widget_screenshot` — Capture widget preview for visual verification

## v3.2.0 — Niagara VFX System

Visual effects are a common AI-assisted task.

- [ ] `niagara_create_system` — Create Niagara systems (with templates)
- [ ] `niagara_add_emitter` — Add emitters to systems
- [ ] `niagara_add_module` — Add modules (spawn, update, render) to emitters
- [ ] `niagara_configure_module` — Set module parameters (float, vector, curve, enum)
- [ ] `niagara_set_renderer` — Configure sprite/mesh/ribbon renderers
- [ ] `niagara_compile` — Compile and save systems
- [ ] `niagara_spawn` — Create VFX actors in the world
- [ ] `niagara_get_metadata` — Inspect system structure

## v3.3.0 — Performance Profiling & Console

Low effort, high utility.

- [ ] `perf_rendering_stats` — Draw calls, VRAM usage, instance breakdown
- [ ] `perf_gpu_stats` — GPU timing and memory
- [ ] `perf_scene_breakdown` — Per-mesh rendering costs, LOD breakdown
- [ ] `console_command` — Execute any UE console command directly

## v3.4.0 — Animation Blueprint System

Required for character-driven games.

- [ ] `anim_create_blueprint` — Create Animation Blueprint with skeleton reference
- [ ] `anim_create_state_machine` — Build state machines programmatically
- [ ] `anim_add_state` — Add states with animation references
- [ ] `anim_add_transition` — Connect states with transition rules
- [ ] `anim_add_variable` — Add typed variables to ABP
- [ ] `anim_get_metadata` — Inspect states, variables, montages
- [ ] `anim_create_montage` — Create animation montages
- [ ] `anim_link_layer` — Animation layer stacking

## v3.5.0 — Advanced Materials & Audio

### Material Graph Editing

- [ ] `material_add_expression` — Add expression nodes (texture sample, math, parameters, custom HLSL)
- [ ] `material_connect_expressions` — Link expression inputs/outputs
- [ ] `material_set_expression_property` — Configure expression settings
- [ ] `material_create_function` — Reusable material node graphs
- [ ] `material_get_graph` — Inspect material expression structure and connections

### MetaSound/Audio

- [ ] `audio_import` — Import WAV, MP3, OGG, FLAC, AIFF
- [ ] `audio_create_metasound` — Create MetaSound source/patch assets
- [ ] `audio_add_node` — Add audio nodes (oscillators, filters, envelopes)
- [ ] `audio_connect_nodes` — Audio routing between nodes
- [ ] `audio_set_parameter` — Configure audio parameters

## v3.6.0 — Data & Procedural Systems

### DataTable CRUD

- [ ] `datatable_create` — Create DataTables with struct definition
- [ ] `datatable_add_rows` — Add rows with property mapping
- [ ] `datatable_get_rows` — Query rows by name
- [ ] `datatable_update_row` — Modify existing rows
- [ ] `datatable_delete_row` — Remove rows

### Struct & Enum Creation

- [ ] `struct_create` — Create custom UE structs with typed properties
- [ ] `struct_update` — Modify existing structs
- [ ] `enum_create` — Create enum definitions
- [ ] `enum_get_values` — List enum values

### Enhanced Input System

- [ ] `input_create_mapping` — Create input mappings with modifier support
- [ ] `input_list_actions` — List available input actions
- [ ] `input_get_metadata` — Input system introspection

## v3.7.0 — PCG & StateTree AI

### Procedural Content Generation

- [ ] `pcg_create_graph` — Create PCG graphs (with built-in templates)
- [ ] `pcg_add_node` — Add nodes from 195+ available types
- [ ] `pcg_connect_nodes` — Wire node connections
- [ ] `pcg_set_node_property` — Configure node settings
- [ ] `pcg_search_palette` — Discover available node types
- [ ] `pcg_spawn_actor` — Create PCG component actors
- [ ] `pcg_execute` — Run procedural generation

### StateTree AI

- [ ] `statetree_create` — Create StateTree assets with schema
- [ ] `statetree_add_state` — Add execution states
- [ ] `statetree_add_transition` — State transition logic
- [ ] `statetree_add_task` — Task execution nodes
- [ ] `statetree_add_evaluator` — Global evaluators
- [ ] `statetree_add_binding` — Property and target bindings
- [ ] `statetree_get_metadata` — Full structure inspection

## v3.8.0 — Mesh & LOD Management

- [ ] `mesh_get_metadata` — LOD count, vertices, triangles, bounds, materials, Nanite support
- [ ] `mesh_import_lod` — Import FBX into LOD slots
- [ ] `mesh_set_lod_screen_size` — Set LOD transition thresholds
- [ ] `mesh_auto_generate_lods` — Built-in mesh reduction
- [ ] `mesh_get_instance_breakdown` — Rendering cost per LOD

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
