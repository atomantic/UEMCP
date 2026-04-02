# UEMCP Feature Showcase - Demo Project

## Overview

The Demo project is a **walkable feature showcase** organized as a linear corridor of themed zones, each demonstrating a category of MCP tools. Every zone includes a dedicated **E2E test area** where integration tests operate and reset. Press **Play** in the editor to fly through the corridor using WASD + mouse look.

## Layout (Linear Corridor, 2500-unit spacing along X axis)

```
PlayerStart  Hub    Actor   Material  Niagara  Blueprint  Audio   Widget   Anim    Data
X: -1500     0      2500    5000      7500     10000      12500   15000    17500   20000
```

Navigation signs between each zone guide you to the next area.

## Zone Details

### Central Hub (X=0)
- Welcome title and subtitle text
- Globe with emissive material on metallic pedestal
- Forward/back corridor arrows

### Actor Operations (X=2500) - Red
- Shape gallery: Cube, Sphere, Cylinder, Cone
- Wall and pillar demonstrations
- Batch spawn array (3 spheres)
- Organized/rotated cubes
- **Tools**: spawn, modify, duplicate, delete, batch_spawn, organize, snap_to_socket

### Material System (X=5000) - Blue
- Material spheres: Metallic, Rough, Emissive, Gold, Copper, Neon
- Cube variants with metallic/gold finishes
- **Tools**: create_simple_material, create_instance, apply, graph editing

### Niagara VFX (X=7500) - Purple
- 4 live particle effects on pedestals: Fountain, Burst, Explosion, Trails
- **Tools**: create_system, spawn, set_parameter, compile, list_templates

### Blueprint System (X=10000) - Green
- 3 pedestals with demo shapes (Components, Variables, Functions)
- Visual graph wall with node blocks and connection
- **Tools**: create, compile, add_variable, add_component, add_function, graph

### Audio/MetaSound (X=12500) - Orange
- 3 speaker cones
- Sound wave visualization rings
- MetaSound node graph wall (Oscillator, Filter, Output)
- **Tools**: import, create_metasound, add_node, connect_nodes, set_parameter

### Widget/UMG (X=15000) - Cyan
- 2 screen panels
- 3 button blocks
- Slider with knob
- Progress bar
- **Tools**: create, add_component, set_layout, set_property, bind_event

### Animation & AI (X=17500) - Yellow
- 3 humanoid figures (cylinder body + sphere head)
- State machine visualization wall with 3 state nodes
- **Tools**: anim_create_blueprint, state_machine, montage, statetree_create

### Data Systems (X=20000) - Magenta
- DataTable visualization (table + 3 rows)
- Struct block with field layers
- Enum wheel with arrow
- PCG grid (5 procedural cubes)
- **Tools**: datatable, struct, enum, PCG, input, mesh/LOD, performance

## Naming Convention

All showcase elements use these prefixes (preserved during reset):

| Prefix | Purpose |
|--------|---------|
| `Demo_` | Showcase objects (actors, shapes, pedestals) |
| `DemoFloor_` | Zone platform floors |
| `DemoLabel_` | Text labels (zone titles, feature lists, test areas) |
| `DemoTestArea_` | E2E test area platforms |

## E2E Test Areas

Each zone has a grey platform labeled "E2E TEST AREA" where integration tests:
1. Create test actors/assets
2. Perform operations
3. Verify results
4. Clean up (via `reset_demo_scene` or targeted deletion)

Test actors do NOT use the `Demo_` prefix, so `reset_demo_scene` removes them while preserving the showcase.

## Reset Mechanism

```javascript
// Reset to clean showcase state
mcp.level_reset_demo_scene({ save: true, delete_test_assets: true })
```

**Preserved**: All `Demo_*`, `DemoFloor_*`, `DemoLabel_*`, `DemoTestArea_*` actors + lighting/atmosphere
**Removed**: Any actor without these prefixes (test artifacts)

## Materials

### Zone Materials (`/Game/Demo/Materials/`)
M_Demo_Ground, M_Demo_Hub, M_Demo_Actor, M_Demo_Material, M_Demo_Niagara, M_Demo_Blueprint, M_Demo_Audio, M_Demo_Widget, M_Demo_Animation, M_Demo_Data, M_Demo_TestArea

### Showcase Materials (`/Game/Demo/Materials/Showcase/`)
M_Demo_Metallic, M_Demo_Rough, M_Demo_Emissive, M_Demo_Gold, M_Demo_Copper, M_Demo_Neon

### VFX Assets (`/Game/Demo/VFX/`)
NS_Demo_Fountain, NS_Demo_Burst, NS_Demo_Explosion, NS_Demo_Trails

## World Outliner Structure

```
Demo/
  Hub/           - Central hub objects
  Infrastructure/ - Floors, test areas
  Labels/        - Zone titles
    Features/    - Feature sub-labels
  Zones/
    Actor/       - Actor zone objects
    Animation/   - Animation zone objects
    Audio/       - Audio zone objects
    Blueprint/   - Blueprint zone objects
    Data/        - Data zone objects
    Material/    - Material zone objects
    Niagara/     - Niagara zone objects
    Widget/      - Widget zone objects
```
