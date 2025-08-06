# MCP Tools vs Python Proxy: Code Comparison

This document demonstrates the benefits of using dedicated MCP tools versus the generic `python_proxy` tool for common Unreal Engine operations.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of Contents

- [Why Use Dedicated MCP Tools?](#why-use-dedicated-mcp-tools)
- [Project & Asset Management](#project--asset-management)
  - [1. Getting Project Information](#1-getting-project-information)
  - [2. Listing Assets](#2-listing-assets)
  - [3. Getting Asset Information](#3-getting-asset-information)
- [Actor Operations](#actor-operations)
  - [4. Spawning Actors](#4-spawning-actors)
  - [5. Modifying Actors](#5-modifying-actors)
  - [6. Deleting Actors](#6-deleting-actors)
  - [7. Organizing Actors](#7-organizing-actors)
- [Level Operations](#level-operations)
  - [8. Listing Level Actors](#8-listing-level-actors)
  - [9. Saving the Level](#9-saving-the-level)
  - [10. Getting World Outliner Structure](#10-getting-world-outliner-structure)
- [Viewport Control](#viewport-control)
  - [11. Taking Screenshots](#11-taking-screenshots)
  - [12. Controlling Camera](#12-controlling-camera)
  - [13. Changing Viewport Mode](#13-changing-viewport-mode)
  - [14. Focusing on Actors](#14-focusing-on-actors)
  - [15. Changing Render Mode](#15-changing-render-mode)
- [System Operations](#system-operations)
  - [16. Testing Connection](#16-testing-connection)
  - [17. Restarting Listener](#17-restarting-listener)
  - [18. Reading UE Logs](#18-reading-ue-logs)
- [Summary of Benefits](#summary-of-benefits)
- [When to Use Python Proxy](#when-to-use-python-proxy)
- [Conclusion](#conclusion)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Why Use Dedicated MCP Tools?

While `python_proxy` gives you full access to Unreal Engine's Python API, the dedicated MCP tools provide:

1. **Cleaner, more readable code**
2. **Built-in error handling**
3. **Formatted output**
4. **Type safety and validation**
5. **No need to remember Unreal Python API details**

## Project & Asset Management

### 1. Getting Project Information

#### Using `project_info` MCP Tool:
```javascript
await project_info();
```

**Output:**
```
Project Information:
Name: Home
Directory: /Users/antic/Documents/Unreal Projects/Home/
Engine Version: 5.6.0-43139311+++UE5+Release-5.6
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal
import os

# Get project information
project_dir = unreal.Paths.project_dir()
project_name = unreal.Paths.get_project_file_path().split('/')[-1].replace('.uproject', '')

# Get engine version
version_info = unreal.SystemLibrary.get_engine_version()
engine_version = f"{version_info.major}.{version_info.minor}.{version_info.patch}"
if version_info.changelist:
    engine_version += f"-{version_info.changelist}"
if version_info.branch:
    engine_version += f"+++{version_info.branch}"

result = f"Project Information:\\n"
result += f"Name: {project_name}\\n"
result += f"Directory: {project_dir}\\n"
result += f"Engine Version: {engine_version}"

result
`
});
```

**Lines of code: 22 vs 1** (95% reduction)

### 2. Listing Assets

#### Using `asset_list` MCP Tool:
```javascript
await asset_list({ 
  path: '/Game/ModularOldTown/Meshes', 
  assetType: 'StaticMesh',
  limit: 10 
});
```

**Output:**
```
Found 187 assets in /Game/ModularOldTown/Meshes
(Showing first 10)

• SM_Floor_2m (StaticMesh)
  Path: /Game/ModularOldTown/Meshes/Ground/SM_Floor_2m
• SM_FlatWall_2m (StaticMesh)
  Path: /Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m
...
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal

# Get asset registry
asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()

# Set up filter
filter = unreal.ARFilter()
filter.package_paths = ['/Game/ModularOldTown/Meshes']
filter.class_names = ['StaticMesh']
filter.recursive_paths = True

# Get assets
assets = asset_registry.get_assets(filter)

# Format output
result = f"Found {len(assets)} assets in /Game/ModularOldTown/Meshes\\n"
result += "(Showing first 10)\\n\\n"

for i, asset in enumerate(assets[:10]):
    asset_name = str(asset.asset_name)
    asset_class = str(asset.asset_class)
    asset_path = str(asset.package_name)
    result += f"• {asset_name} ({asset_class})\\n"
    result += f"  Path: {asset_path}\\n"

result
`
});
```

**Lines of code: 27 vs 5** (81% reduction)

### 3. Getting Asset Information (Enhanced)

#### Using `asset_info` MCP Tool:
```javascript
await asset_info({ 
  assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m' 
});
```

**Output:**
```
Asset Information: /Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m

Type: StaticMesh

Bounding Box:
  Size: [300.0, 100.0, 282.0]
  Extent: [150.0, 50.0, 141.0]
  Origin: [0.0, 0.0, 0.0]
  Min: [-150.0, -50.0, -141.0]
  Max: [150.0, 50.0, 141.0]

Pivot:
  Type: center
  Offset: [0.0, 0.0, 0.0]

Collision:
  Has Collision: true
  Collision Primitives: 1
  Complexity: CTF_UseSimpleAndComplex

Sockets (2):
  - DoorSocket:
    Location: [0.0, -50.0, 0.0]
    Rotation: [0.0, 0.0, 0.0]
  - WindowSocket:
    Location: [75.0, -50.0, 100.0]
    Rotation: [0.0, 0.0, 0.0]

Material Slots (1):
  - Material_Slot: /Game/ModularOldTown/Materials/M_OldTown_Wall

Vertices: 324
Triangles: 162
LODs: 1
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal

# Load the asset
asset_path = '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m'
asset = unreal.EditorAssetLibrary.load_asset(asset_path)

if not asset:
    result = f"Error: Asset not found: {asset_path}"
else:
    result = f"Asset Information: {asset_path}\\n\\n"
    result += f"Type: {asset.__class__.__name__}\\n\\n"
    
    # Get bounds for static mesh
    if isinstance(asset, unreal.StaticMesh):
        bounds = asset.get_bounds()
        box_extent = bounds.box_extent
        origin = bounds.origin
        
        # Calculate min/max bounds
        min_bounds = unreal.Vector(
            origin.x - box_extent.x,
            origin.y - box_extent.y,
            origin.z - box_extent.z
        )
        max_bounds = unreal.Vector(
            origin.x + box_extent.x,
            origin.y + box_extent.y,
            origin.z + box_extent.z
        )
        
        # Determine pivot type
        pivot_type = 'center'
        tolerance = 0.1
        if abs(origin.z + box_extent.z) < tolerance:
            pivot_type = 'bottom-center'
        elif abs(origin.x + box_extent.x) < tolerance and abs(origin.y + box_extent.y) < tolerance:
            pivot_type = 'corner-bottom'
        
        result += "Bounding Box:\\n"
        result += f"  Size: [{box_extent.x * 2}, {box_extent.y * 2}, {box_extent.z * 2}]\\n"
        result += f"  Extent: [{box_extent.x}, {box_extent.y}, {box_extent.z}]\\n"
        result += f"  Origin: [{origin.x}, {origin.y}, {origin.z}]\\n"
        result += f"  Min: [{min_bounds.x}, {min_bounds.y}, {min_bounds.z}]\\n"
        result += f"  Max: [{max_bounds.x}, {max_bounds.y}, {max_bounds.z}]\\n\\n"
        
        result += "Pivot:\\n"
        result += f"  Type: {pivot_type}\\n"
        result += f"  Offset: [{origin.x}, {origin.y}, {origin.z}]\\n\\n"
        
        # Get collision info
        result += "Collision:\\n"
        result += f"  Has Collision: {asset.get_num_collision_primitives() > 0}\\n"
        result += f"  Collision Primitives: {asset.get_num_collision_primitives()}\\n"
        
        body_setup = asset.get_editor_property('body_setup')
        if body_setup:
            result += f"  Complexity: {body_setup.collision_trace_flag}\\n"
        result += "\\n"
        
        # Get sockets
        sockets = asset.get_sockets()
        if sockets:
            result += f"Sockets ({len(sockets)}):\\n"
            for socket in sockets:
                result += f"  - {socket.socket_name}:\\n"
                result += f"    Location: [{socket.relative_location.x}, "
                result += f"{socket.relative_location.y}, {socket.relative_location.z}]\\n"
                result += f"    Rotation: [{socket.relative_rotation.roll}, "
                result += f"{socket.relative_rotation.pitch}, {socket.relative_rotation.yaw}]\\n"
        else:
            result += "Sockets (0):\\n"
        result += "\\n"
        
        # Get material slots
        material_slots = asset.get_static_materials()
        result += f"Material Slots ({len(material_slots)}):\\n"
        for i, mat_slot in enumerate(material_slots):
            slot_name = str(mat_slot.material_slot_name) if mat_slot.material_slot_name else f"Slot_{i}"
            mat_path = str(mat_slot.material_interface.get_path_name()) if mat_slot.material_interface else "None"
            result += f"  - {slot_name}: {mat_path}\\n"
        result += "\\n"
        
        # Get mesh statistics
        result += f"Vertices: {asset.get_num_vertices(0)}\\n"
        result += f"Triangles: {asset.get_num_triangles(0)}\\n"
        result += f"LODs: {asset.get_num_lods()}"
    else:
        result = f"Asset is type {asset.__class__.__name__}"

result
`
});
```

**Lines of code: 89 vs 3** (97% reduction)

## Actor Operations

### 4. Spawning Actors

#### Using `actor_spawn` MCP Tool:
```javascript
await actor_spawn({
  assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m',
  name: 'NorthWall',
  location: [1000, 0, 0],
  rotation: [0, 0, 90],
  folder: 'Building/Walls'
});
```

**Output:**
```
✓ Spawned actor: NorthWall
  Type: StaticMeshActor
  Asset: /Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m
  Location: [1000, 0, 0]
  Rotation: [0, 0, 90]
  Folder: Building/Walls
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal

# Load the asset
asset_path = '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m'
asset = unreal.EditorAssetLibrary.load_asset(asset_path)

if not asset:
    result = f"Error: Failed to load asset {asset_path}"
else:
    # Spawn the actor
    spawn_location = unreal.Vector(1000, 0, 0)
    spawn_rotation = unreal.Rotator(0, 0, 90)
    
    actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
        asset, 
        spawn_location, 
        spawn_rotation
    )
    
    if actor:
        # Set the name
        actor.set_actor_label('NorthWall')
        
        # Set folder
        actor.set_folder_path('Building/Walls')
        
        result = f"✓ Spawned actor: {actor.get_actor_label()}\\n"
        result += f"  Type: {actor.__class__.__name__}\\n"
        result += f"  Asset: {asset_path}\\n"
        result += f"  Location: [{spawn_location.x}, {spawn_location.y}, {spawn_location.z}]\\n"
        result += f"  Rotation: [{spawn_rotation.roll}, {spawn_rotation.pitch}, {spawn_rotation.yaw}]\\n"
        result += f"  Folder: {actor.get_folder_path()}"
    else:
        result = "Error: Failed to spawn actor"

result
`
});
```

**Lines of code: 36 vs 7** (81% reduction)

### 5. Modifying Actors

#### Using `actor_modify` MCP Tool:
```javascript
await actor_modify({
  actorName: 'NorthWall',
  location: [1000, 500, 0],
  rotation: [0, 0, 180],
  scale: [1, 1, 2]
});
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal

# Find the actor
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
target_actor = None

for actor in all_actors:
    if actor.get_actor_label() == 'NorthWall':
        target_actor = actor
        break

if target_actor:
    # Set location
    target_actor.set_actor_location(unreal.Vector(1000, 500, 0))
    
    # Set rotation
    target_actor.set_actor_rotation(unreal.Rotator(0, 0, 180))
    
    # Set scale
    target_actor.set_actor_scale3d(unreal.Vector(1, 1, 2))
    
    result = f"✓ Modified actor: NorthWall"
else:
    result = "Error: Actor 'NorthWall' not found"

result
`
});
```

**Lines of code: 27 vs 6** (78% reduction)

### 6. Deleting Actors

#### Using `actor_delete` MCP Tool:
```javascript
await actor_delete({ 
  actorName: 'NorthWall' 
});
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal

# Find and delete the actor
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
deleted = False

for actor in all_actors:
    if actor.get_actor_label() == 'NorthWall':
        unreal.EditorLevelLibrary.destroy_actor(actor)
        deleted = True
        break

if deleted:
    result = "✓ Deleted actor: NorthWall"
else:
    result = "Error: Actor 'NorthWall' not found"

result
`
});
```

**Lines of code: 19 vs 3** (84% reduction)

### 7. Organizing Actors

#### Using `actor_organize` MCP Tool:
```javascript
await actor_organize({
  pattern: 'Wall_',
  folder: 'Building/Walls'
});
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal

# Find all actors matching pattern
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
organized_count = 0

for actor in all_actors:
    label = actor.get_actor_label()
    if 'Wall_' in label:
        actor.set_folder_path('Building/Walls')
        organized_count += 1

result = f"✓ Organized {organized_count} actors into Building/Walls"

result
`
});
```

**Lines of code: 16 vs 4** (75% reduction)

## Level Operations

### 8. Listing Level Actors

#### Using `level_actors` MCP Tool:
```javascript
await level_actors({ 
  filter: 'Wall',
  limit: 10 
});
```

**Output:**
```
Level: HomeWorld
Found 15 actors matching 'Wall'
(Showing first 10)

• Wall_North (StaticMeshActor)
  Location: [1000, 0, 0]
• Wall_South (StaticMeshActor)
  Location: [1000, 600, 0]
...
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal

# Get current level name
world = unreal.EditorLevelLibrary.get_editor_world()
level_name = world.get_name()

# Get all actors
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Filter actors
filter_text = 'Wall'
filtered_actors = []
for actor in all_actors:
    if filter_text in actor.get_actor_label():
        filtered_actors.append(actor)

# Format output
result = f"Level: {level_name}\\n"
result += f"Found {len(filtered_actors)} actors matching '{filter_text}'\\n"
result += "(Showing first 10)\\n\\n"

for actor in filtered_actors[:10]:
    label = actor.get_actor_label()
    class_name = actor.__class__.__name__
    location = actor.get_actor_location()
    result += f"• {label} ({class_name})\\n"
    result += f"  Location: [{location.x:.0f}, {location.y:.0f}, {location.z:.0f}]\\n"

result
`
});
```

**Lines of code: 30 vs 5** (83% reduction)

### 9. Saving the Level

#### Using `level_save` MCP Tool:
```javascript
await level_save();
```

**Output:**
```
✓ Level saved successfully

Level: HomeWorld
Path: /Game/Maps/HomeWorld
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal

# Get current level
world = unreal.EditorLevelLibrary.get_editor_world()
level_name = world.get_name()

# Save the level
success = unreal.EditorLevelLibrary.save_current_level()

if success:
    # Get level path
    level_path = world.get_path_name().split(':')[0]
    result = f"✓ Level saved successfully\\n\\n"
    result += f"Level: {level_name}\\n"
    result += f"Path: {level_path}"
else:
    result = "Error: Failed to save level"

result
`
});
```

**Lines of code: 20 vs 1** (95% reduction)

### 10. Getting World Outliner Structure

#### Using `level_outliner` MCP Tool:
```javascript
await level_outliner({
  showEmpty: false,
  maxDepth: 3
});
```

**Output:**
```
World Outliner Structure:

📁 Building (15 actors)
  📁 Walls (10 actors)
  📁 Floors (5 actors)
📁 Landscape (3 actors)
📁 Lighting (4 actors)
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal

# Get all actors
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Build folder structure
folder_structure = {}
for actor in all_actors:
    folder_path = actor.get_folder_path()
    if folder_path:
        parts = folder_path.split('/')
        current = folder_structure
        for part in parts:
            if part not in current:
                current[part] = {'actors': 0, 'subfolders': {}}
            current[part]['actors'] += 1
            current = current[part]['subfolders']

# Format output recursively
def format_folder(folders, indent=0):
    output = ""
    for name, data in folders.items():
        prefix = "  " * indent + "📁 "
        output += f"{prefix}{name} ({data['actors']} actors)\\n"
        if data['subfolders']:
            output += format_folder(data['subfolders'], indent + 1)
    return output

result = "World Outliner Structure:\\n\\n"
result += format_folder(folder_structure)

result
`
});
```

**Lines of code: 33 vs 4** (88% reduction)

## Viewport Control

### 11. Taking Screenshots

#### Using `viewport_screenshot` MCP Tool:
```javascript
await viewport_screenshot({
  width: 1920,
  height: 1080,
  compress: true,
  quality: 85
});
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal
import os
import tempfile
from datetime import datetime

# Generate filename
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
filename = f"viewport_screenshot_{timestamp}.png"
temp_dir = tempfile.gettempdir()
filepath = os.path.join(temp_dir, filename)

# Take screenshot
unreal.AutomationLibrary.take_high_res_screenshot(
    1920, 1080,  # Resolution
    filepath,
    camera=None,
    mask_enabled=False,
    capture_hdr=False,
    comparison_tolerance=unreal.ComparisonTolerance.LOW,
    comparison_notes="",
    delay=0.0
)

# Check if file was created
if os.path.exists(filepath):
    # Would need additional code for compression
    result = f"✓ Screenshot saved to: {filepath}"
else:
    result = "Error: Failed to capture screenshot"

result
`
});
```

**Lines of code: 31 vs 5** (84% reduction)

### 12. Controlling Camera

#### Using `viewport_camera` MCP Tool:
```javascript
await viewport_camera({
  location: [1000, 1000, 500],
  rotation: [0, -30, 45],
  focusActor: 'HouseFoundation'
});
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal

# Set camera location and rotation
editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
camera_location = unreal.Vector(1000, 1000, 500)
camera_rotation = unreal.Rotator(0, -30, 45)

# Set viewport camera
editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)

# Focus on actor if specified
actor_name = 'HouseFoundation'
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
for actor in all_actors:
    if actor.get_actor_label() == actor_name:
        unreal.EditorLevelLibrary.set_actor_selection_state(actor, True)
        break

result = f"✓ Viewport camera updated\\n"
result += f"Location: [{camera_location.x}, {camera_location.y}, {camera_location.z}]\\n"
result += f"Rotation: [{camera_rotation.roll}, {camera_rotation.pitch}, {camera_rotation.yaw}]"

result
`
});
```

**Lines of code: 24 vs 5** (79% reduction)

### 13. Changing Viewport Mode

#### Using `viewport_mode` MCP Tool:
```javascript
await viewport_mode({ 
  mode: 'top' 
});
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal

# Get current viewport info
editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
current_location, _ = editor_subsystem.get_level_viewport_camera_info()

# Create top view rotation
top_rotation = unreal.Rotator()
top_rotation.pitch = -90.0  # Look straight down
top_rotation.yaw = 0.0      # Face north
top_rotation.roll = 0.0     # No tilt

# Check for selected actors to center on
selected_actors = unreal.EditorLevelLibrary.get_selected_level_actors()
if selected_actors:
    # Calculate center of selection
    bounds_min = unreal.Vector(float('inf'), float('inf'), float('inf'))
    bounds_max = unreal.Vector(float('-inf'), float('-inf'), float('-inf'))
    
    for actor in selected_actors:
        location = actor.get_actor_location()
        bounds = actor.get_actor_bounds(only_colliding_components=False)
        extent = bounds[1]
        
        bounds_min.x = min(bounds_min.x, location.x - extent.x)
        bounds_min.y = min(bounds_min.y, location.y - extent.y)
        bounds_min.z = min(bounds_min.z, location.z - extent.z)
        bounds_max.x = max(bounds_max.x, location.x + extent.x)
        bounds_max.y = max(bounds_max.y, location.y + extent.y)
        bounds_max.z = max(bounds_max.z, location.z + extent.z)
    
    center = unreal.Vector(
        (bounds_min.x + bounds_max.x) / 2,
        (bounds_min.y + bounds_max.y) / 2,
        (bounds_min.z + bounds_max.z) / 2
    )
    
    # Position camera above center
    size = bounds_max - bounds_min
    distance = max(size.x, size.y, size.z) * 1.5
    camera_location = unreal.Vector(center.x, center.y, center.z + distance)
else:
    camera_location = current_location

# Apply viewport changes
editor_subsystem.set_level_viewport_camera_info(camera_location, top_rotation)

result = "✓ Viewport mode changed to top"

result
`
});
```

**Lines of code: 49 vs 3** (94% reduction)

### 14. Focusing on Actors

#### Using `viewport_focus` MCP Tool:
```javascript
await viewport_focus({
  actorName: 'HouseFoundation',
  preserveRotation: true
});
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal

# Find the actor
actor_name = 'HouseFoundation'
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
found_actor = None

for actor in all_actors:
    if actor.get_actor_label() == actor_name:
        found_actor = actor
        break

if found_actor:
    # Select the actor
    unreal.EditorLevelLibrary.set_selected_level_actors([found_actor])
    
    # Get current camera info
    editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
    current_location, current_rotation = editor_subsystem.get_level_viewport_camera_info()
    
    # Get actor bounds
    actor_location = found_actor.get_actor_location()
    bounds = found_actor.get_actor_bounds(only_colliding_components=False)
    extent = bounds[1]
    max_extent = max(extent.x, extent.y, extent.z)
    distance = max_extent * 3
    
    # Calculate new camera position preserving rotation
    if abs(current_rotation.pitch + 90) < 5:  # Top-down view
        camera_location = unreal.Vector(
            actor_location.x,
            actor_location.y,
            actor_location.z + distance
        )
    else:
        forward = current_rotation.get_forward_vector()
        camera_location = actor_location - (forward * distance)
    
    # Apply camera changes
    editor_subsystem.set_level_viewport_camera_info(camera_location, current_rotation)
    
    result = f"✓ Focused viewport on: {actor_name}"
else:
    result = f"Error: Actor '{actor_name}' not found"

result
`
});
```

**Lines of code: 46 vs 4** (91% reduction)

### 15. Changing Render Mode

#### Using `viewport_render_mode` MCP Tool:
```javascript
await viewport_render_mode({ 
  mode: 'wireframe' 
});
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal

# Execute console command to change render mode
world = unreal.EditorLevelLibrary.get_editor_world()
unreal.SystemLibrary.execute_console_command(world, "viewmode wireframe")

result = "✓ Viewport render mode changed to wireframe"

result
`
});
```

**Lines of code: 10 vs 3** (70% reduction)

## System Operations

### 16. Testing Connection

#### Using `test_connection` MCP Tool:
```javascript
await test_connection();
```

**Output:**
```
🔍 Testing Python listener availability...
✅ Python listener is ONLINE

📊 Testing project.info command...
✅ Project info retrieved successfully
   Project: Home
   Engine: 5.6.0-43139311+++UE5+Release-5.6

🎭 Testing level.actors command...
✅ Level actors retrieved: 78 total actors

📋 Connection Summary:
   Endpoint: http://localhost:8765
   Status: All tests passed ✅
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import unreal
import urllib.request
import json

# Test Python environment
result = "🔍 Testing Python listener availability...\\n"
result += "✅ Python listener is ONLINE\\n\\n"

# Test project info
try:
    project_name = unreal.Paths.get_project_file_path().split('/')[-1].replace('.uproject', '')
    version_info = unreal.SystemLibrary.get_engine_version()
    engine_version = f"{version_info.major}.{version_info.minor}.{version_info.patch}"
    
    result += "📊 Testing project.info command...\\n"
    result += "✅ Project info retrieved successfully\\n"
    result += f"   Project: {project_name}\\n"
    result += f"   Engine: {engine_version}\\n\\n"
except Exception as e:
    result += f"❌ Project info test failed: {e}\\n\\n"

# Test level actors
try:
    actors = unreal.EditorLevelLibrary.get_all_level_actors()
    result += "🎭 Testing level.actors command...\\n"
    result += f"✅ Level actors retrieved: {len(actors)} total actors\\n\\n"
except Exception as e:
    result += f"❌ Level actors test failed: {e}\\n\\n"

result += "📋 Connection Summary:\\n"
result += "   Endpoint: http://localhost:8765\\n"
result += "   Status: All tests passed ✅"

result
`
});
```

**Lines of code: 34 vs 1** (97% reduction)

### 17. Restarting Listener

#### Using `restart_listener` MCP Tool:
```javascript
await restart_listener();
```

**Output:**
```
🔄 Restarting Python listener...

Stopping current listener...
✅ Listener stopped

Reloading Python modules...
✅ Modules reloaded

Starting new listener...
✅ Listener started on port 8765

🎉 Python listener restarted successfully!
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
# Note: This is complex and risky to implement via python_proxy
# as it involves stopping the very listener that's executing this code

result = "❌ Cannot restart listener from within itself - use restart_listener tool instead"

result
`
});
```

**Lines of code: Not feasible via python_proxy**

### 18. Reading UE Logs

#### Using `ue_logs` MCP Tool:
```javascript
await ue_logs({ 
  lines: 50,
  project: 'Home' 
});
```

**Output:**
```
📋 Unreal Engine Logs (last 50 lines)
Project: Home

[2024.07.28-12:30:45] LogPython: UEMCP: Spawned actor Wall_North
[2024.07.28-12:30:46] LogPython: UEMCP: Modified actor transform
[2024.07.28-12:30:47] LogTemp: Display: Viewport screenshot saved
...
```

#### Using `python_proxy`:
```python
await python_proxy({
  code: `
import os
import platform

# Determine log file path based on platform
project_name = 'Home'
if platform.system() == 'Darwin':  # macOS
    log_path = os.path.expanduser(f"~/Library/Logs/Unreal Engine/{project_name}Editor/{project_name}.log")
elif platform.system() == 'Windows':
    log_path = os.path.expanduser(f"~\\AppData\\Local\\UnrealEngine\\{project_name}\\Saved\\Logs\\{project_name}.log")
else:  # Linux
    log_path = os.path.expanduser(f"~/.config/Epic/{project_name}/Saved/Logs/{project_name}.log")

result = f"📋 Unreal Engine Logs (last 50 lines)\\n"
result += f"Project: {project_name}\\n\\n"

try:
    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
        last_lines = lines[-50:] if len(lines) > 50 else lines
        
        for line in last_lines:
            result += line.rstrip() + "\\n"
except Exception as e:
    result = f"Error reading log file: {e}"

result
`
});
```

**Lines of code: 27 vs 4** (85% reduction)

## Summary of Benefits

| Operation | MCP Tool Lines | Python Proxy Lines | Code Reduction |
|-----------|----------------|-------------------|----------------|
| Project Info | 1 | 22 | 95% |
| List Assets | 5 | 27 | 81% |
| Asset Info (Enhanced) | 3 | 89 | 97% |
| Spawn Actor | 7 | 36 | 81% |
| Modify Actor | 6 | 27 | 78% |
| Delete Actor | 3 | 19 | 84% |
| Organize Actors | 4 | 16 | 75% |
| List Level Actors | 5 | 30 | 83% |
| Save Level | 1 | 20 | 95% |
| World Outliner | 4 | 33 | 88% |
| Screenshot | 5 | 31 | 84% |
| Camera Control | 5 | 24 | 79% |
| Viewport Mode | 3 | 49 | 94% |
| Focus Actor | 4 | 46 | 91% |
| Render Mode | 3 | 10 | 70% |
| Test Connection | 1 | 34 | 97% |
| Restart Listener | 1 | N/A | N/A |
| Read UE Logs | 4 | 27 | 85% |

**Average code reduction: 85%**

### Additional Benefits of MCP Tools:

1. **Error Handling**: Built-in error handling with meaningful messages
2. **Validation**: Input parameters are validated before execution
3. **Consistency**: Uniform response format across all tools
4. **Documentation**: Each tool has clear parameter descriptions
5. **Type Safety**: TypeScript interfaces ensure correct usage
6. **No Import Management**: No need to remember which Unreal modules to import
7. **Abstraction**: Complex operations are simplified into single calls
8. **Maintenance**: Updates to UE API can be handled in one place
9. **Testing**: Each tool can be tested independently
10. **Discoverability**: Tools are self-documenting with clear names and descriptions

## When to Use Python Proxy

While MCP tools are ideal for common operations, `python_proxy` is still valuable for:

- Custom workflows not covered by existing tools
- Complex multi-step operations
- Exploratory scripting and debugging
- Accessing less common Unreal Engine APIs
- Batch operations with custom logic
- One-off scripts that don't warrant a dedicated tool
- Learning and experimenting with the UE Python API

## Example: Material Management Tools

The material management tools demonstrate the significant code reduction and improved usability of dedicated MCP tools:

### Using MCP Tools (Clean and Simple)
```javascript
// List all materials in a folder
material_list({ path: "/Game/Materials", pattern: "Wood" })

// Get detailed information about a material
material_info({ materialPath: "/Game/Materials/M_Wood_Pine" })

// Create a simple sand material
material_create({ 
  materialName: "M_Sand", 
  baseColor: { r: 0.8, g: 0.7, b: 0.5 },
  roughness: 0.8,
  metallic: 0.0
})

// Create a material instance from a parent
material_create({
  parentMaterialPath: "/Game/Materials/M_Master",
  instanceName: "MI_CustomWall",
  parameters: {
    "BaseColor": { r: 0.5, g: 0.5, b: 0.7 },
    "Roughness": 0.6
  }
})

// Apply material to an actor
material_apply({
  actorName: "Floor_01",
  materialPath: "/Game/Materials/M_Sand",
  slotIndex: 0
})
```

### Equivalent with python_proxy (Complex and Error-Prone)
```python
python_proxy({
  code: `
import unreal

# List materials (much more complex)
all_assets = unreal.EditorAssetLibrary.list_assets("/Game/Materials", recursive=False)
materials = []
for asset_path in all_assets:
    if "Wood" in asset_path:
        asset = unreal.EditorAssetLibrary.load_asset(asset_path)
        if isinstance(asset, (unreal.Material, unreal.MaterialInstance)):
            materials.append(asset_path)

# Get material info (requires extensive property extraction)
material = unreal.EditorAssetLibrary.load_asset("/Game/Materials/M_Wood_Pine")
if material:
    # Extract all the properties manually
    base_color = material.get_editor_property('base_color') if hasattr(material, 'base_color') else None
    roughness = material.get_editor_property('roughness') if hasattr(material, 'roughness') else None
    # ... many more properties to extract

# Create material (requires asset factory setup)
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
factory = unreal.MaterialFactoryNew()
material = asset_tools.create_asset("M_Sand", "/Game/Materials", unreal.Material, factory)
if material:
    # Setting parameters is complex and may not work directly
    material_editor = unreal.MaterialEditingLibrary
    # No direct way to set base color/roughness on base materials

# Create material instance (complex factory and parameter setup)
factory = unreal.MaterialInstanceConstantFactoryNew()
parent = unreal.EditorAssetLibrary.load_asset("/Game/Materials/M_Master")
factory.initial_parent = parent  # May not work depending on UE version
instance = asset_tools.create_asset("MI_CustomWall", "/Game/Materials", unreal.MaterialInstanceConstant, factory)
if instance:
    # Setting parameters requires specific API calls
    unreal.MaterialEditingLibrary.set_material_instance_vector_parameter_value(
        instance, "BaseColor", unreal.LinearColor(0.5, 0.5, 0.7, 1.0)
    )
    unreal.MaterialEditingLibrary.set_material_instance_scalar_parameter_value(
        instance, "Roughness", 0.6
    )

# Apply material (requires component access and slot management)
actors = unreal.EditorLevelLibrary.get_all_level_actors()
for actor in actors:
    if actor.get_actor_label() == "Floor_01":
        mesh_comp = actor.get_component_by_class(unreal.StaticMeshComponent)
        if mesh_comp:
            material = unreal.EditorAssetLibrary.load_asset("/Game/Materials/M_Sand")
            if material:
                mesh_comp.set_material(0, material)
`
})
```

**Code Reduction**: ~80% less code with MCP tools
**Error Handling**: Built-in validation vs manual checking
**Readability**: Clear intent vs implementation details
**Reliability**: Tested patterns vs potential API misuse

## Conclusion

The dedicated MCP tools provide an average **85% reduction in code** while improving readability, maintainability, and reliability. They abstract away the complexity of the Unreal Engine Python API while still allowing full access through `python_proxy` when needed.

For most common operations, using the dedicated MCP tools will:
- Save significant development time
- Reduce errors and debugging time
- Make code more maintainable
- Lower the barrier to entry for UE automation
- Provide consistent, predictable results

This makes UEMCP an invaluable tool for AI-assisted Unreal Engine development, allowing AI assistants to perform complex operations with simple, readable commands while maintaining the flexibility to handle any custom requirement through `python_proxy`.