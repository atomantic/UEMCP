# UEMCP Current Status & Testing Guide

## What's Working Now

1. **✅ Minimal Plugin Installed** - The UEMCP plugin is successfully compiled and loaded in your DemoMaze project
2. **✅ MCP Server Structure** - The server code is ready with tools for project.info and project.create
3. **✅ Python Bridge Design** - The architecture is in place for Python-UE communication

## What You Can Test Right Now

### 1. Verify Plugin is Loaded
In Unreal Editor with DemoMaze open:
- Window → Developer Tools → Output Log
- Search for "UEMCP Module has started!"
- Edit → Plugins → Search "UEMCP" → Should show as enabled

### 2. Test Python in Unreal
In Unreal Editor:
- Window → Developer Tools → Python Console (or Output Log → Cmd field)
- Copy and paste this test script:

```python
import unreal
print("=== UEMCP Python Test ===")
print(f"Project: {unreal.SystemLibrary.get_project_name()}")
print(f"Engine: {unreal.SystemLibrary.get_engine_version()}")
# List first 5 assets
registry = unreal.AssetRegistryHelpers.get_asset_registry()
filter = unreal.ARFilter()
filter.package_paths = ['/Game']
assets = registry.get_assets(filter)[:5]
for asset in assets:
    print(f"- {asset.asset_name}")
```

## What's Next Before Full Integration

### Step 1: Enable Python in Plugin
We need to update the plugin to register Python commands. In the Editor Python console, run:

```python
# Test if we can create a simple cube
import unreal
actor_class = unreal.EditorAssetLibrary.load_asset('/Engine/BasicShapes/Cube')
if actor_class:
    location = unreal.Vector(0, 0, 100)
    rotation = unreal.Rotator(0, 0, 0)
    actor = unreal.EditorLevelLibrary.spawn_actor_from_class(actor_class, location, rotation)
    print(f"Created actor: {actor.get_name()}")
```

### Step 2: MCP Server Connection
The MCP server needs to be built and connected. For now, the server has:
- `project.info` - Get current project information
- `project.create` - Create new projects (mock implementation)

### Step 3: Full Integration Path
1. Build the MCP server (currently having build issues we need to resolve)
2. Configure Claude Desktop to use the server
3. The server will execute Python commands in UE via the bridge

## Manual Testing Without Full Integration

You can manually test what the integration will do:

### Create a Blueprint
```python
import unreal
asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
factory = unreal.BlueprintFactory()
factory.parent_class = unreal.Actor
bp = asset_tools.create_asset("BP_TestActor", "/Game/Blueprints", unreal.Blueprint, factory)
print(f"Created: {bp}")
```

### List Project Assets
```python
import unreal
registry = unreal.AssetRegistryHelpers.get_asset_registry()
filter = unreal.ARFilter()
filter.package_paths = ['/Game']
filter.recursive_paths = True
assets = registry.get_assets(filter)
print(f"Total assets in /Game: {len(assets)}")
# Group by type
types = {}
for asset in assets:
    class_name = str(asset.asset_class)
    types[class_name] = types.get(class_name, 0) + 1
for class_name, count in sorted(types.items()):
    print(f"  {class_name}: {count}")
```

## Current Limitations

1. **MCP Server Build Issue** - Need to resolve the build error
2. **No Live Connection** - Can't use Claude to control UE yet
3. **Manual Python Only** - Must paste Python code manually in UE

## Quick Win Testing

To see what UEMCP will enable, try this in the Python console:

```python
# Create a simple level with platforms
import unreal

def create_platform(x, y, z, scale_x=1, scale_y=1):
    """Create a platform at specified location"""
    cube = unreal.EditorAssetLibrary.load_asset('/Engine/BasicShapes/Cube')
    if cube:
        location = unreal.Vector(x, y, z)
        rotation = unreal.Rotator(0, 0, 0)
        actor = unreal.EditorLevelLibrary.spawn_actor_from_class(cube, location, rotation)
        actor.set_actor_scale3d(unreal.Vector(scale_x, scale_y, 0.1))
        return actor
    return None

# Create a simple platformer layout
platforms = [
    (0, 0, 0, 10, 10),      # Ground
    (500, 0, 100, 2, 2),    # Platform 1
    (1000, 200, 200, 2, 2), # Platform 2
    (1500, -200, 300, 2, 2),# Platform 3
    (2000, 0, 400, 5, 5),   # Final platform
]

for x, y, z, sx, sy in platforms:
    platform = create_platform(x, y, z, sx, sy)
    if platform:
        print(f"Created platform at ({x}, {y}, {z})")

print("Platformer layout created!")
```

This demonstrates the kind of automation UEMCP will enable through Claude!