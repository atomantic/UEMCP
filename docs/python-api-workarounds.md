# Python API Workarounds

This document lists known issues with Unreal Engine's Python API and their workarounds.

## Actor Reference Issues

### Problem: `get_actor_reference()` fails with friendly names
The `EditorLevelLibrary.get_actor_reference()` method doesn't work with display names (actor labels).

**Workaround:**
```python
# Finding actors by display name
def find_actor_by_name(actor_name):
    """Find an actor by its display name (label)"""
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        try:
            if actor and hasattr(actor, 'get_actor_label') and actor.get_actor_label() == actor_name:
                return actor
        except:
            continue
    return None

# Usage
wall_actor = find_actor_by_name("Wall_Front_1")
if wall_actor:
    # Work with the actor
    wall_actor.set_actor_location(unreal.Vector(100, 200, 0))
```

## Viewport Control Issues

### Problem: Deprecated viewport methods
Several viewport control methods have been deprecated or don't exist:
- `editor_play_in_viewport()` doesn't exist
- `editor_set_camera_look_at_location()` deprecated
- Various wireframe mode methods broken

**Workarounds:**
```python
# Modern viewport control
editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)

# Set camera position and rotation
camera_location = unreal.Vector(1000, 1000, 500)
camera_rotation = unreal.Rotator(0, -30, 45)  # Roll, Pitch, Yaw
editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)

# Focus on actors
editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
editor_actor_subsystem.set_selected_level_actors([my_actor])

# For wireframe mode, use console commands
world = editor_subsystem.get_editor_world()
unreal.SystemLibrary.execute_console_command(world, "ShowFlag.Wireframe 1")
```

## Actor Transform Issues

### Problem: Rotator constructor confusion
The `unreal.Rotator(a, b, c)` constructor has confusing parameter ordering.

**Workaround:**
```python
# ALWAYS set rotation properties explicitly to avoid confusion
rotation = unreal.Rotator()
rotation.roll = 0.0     # Tilt sideways (usually 0)
rotation.pitch = -90.0  # Look up/down
rotation.yaw = 45.0     # Turn left/right

# Apply to actor
actor.set_actor_rotation(rotation)

# Or use keyword arguments for clarity
rotation = unreal.Rotator(roll=0, pitch=-90, yaw=45)
```

## Asset Loading Issues

### Problem: Asset paths require exact format
Asset loading is sensitive to path format and asset type.

**Workaround:**
```python
# Always use full asset paths with proper type suffix
def load_asset_safe(asset_path):
    """Load an asset with proper error handling"""
    try:
        # Try loading with AssetData first
        asset_data = unreal.EditorAssetLibrary.find_asset_data(asset_path)
        if asset_data:
            return asset_data.get_asset()
        
        # Fallback to direct load
        asset = unreal.EditorAssetLibrary.load_asset(asset_path)
        if asset:
            return asset
            
        # Try with _C suffix for Blueprints
        if not asset_path.endswith('_C'):
            return unreal.EditorAssetLibrary.load_asset(asset_path + '_C')
            
    except Exception as e:
        unreal.log_error(f"Failed to load asset {asset_path}: {str(e)}")
        return None

# Usage
mesh = load_asset_safe("/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m")
```

## Console Command Execution

### Problem: Console commands need proper world context
Executing console commands requires the correct world context.

**Workaround:**
```python
def execute_console_command(command):
    """Execute a console command in the editor world"""
    try:
        # Get the editor world
        editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
        world = editor_subsystem.get_editor_world()
        
        if world:
            unreal.SystemLibrary.execute_console_command(world, command)
            return True
        else:
            unreal.log_error("No editor world available")
            return False
    except Exception as e:
        unreal.log_error(f"Console command failed: {str(e)}")
        return False

# Usage
execute_console_command("stat fps")  # Show FPS counter
execute_console_command("ShowFlag.Wireframe 1")  # Enable wireframe
```

## Actor Selection Issues

### Problem: Selection state doesn't always update viewport
Setting actor selection programmatically doesn't always update the viewport focus.

**Workaround:**
```python
def select_and_focus_actor(actor):
    """Select an actor and ensure viewport focuses on it"""
    if not actor:
        return False
        
    # Get subsystems
    editor_actor = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    editor = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
    
    # Clear current selection
    editor_actor.clear_actor_selection_set()
    
    # Select the actor
    editor_actor.set_selected_level_actors([actor])
    
    # Force viewport focus
    unreal.EditorLevelLibrary.pilot_level_actor(actor)
    unreal.EditorLevelLibrary.eject_pilot_level_actor()
    
    return True
```

## Batch Operations

### Problem: No built-in batch spawn or modify operations
UE Python API lacks efficient batch operations.

**Workaround:**
```python
def spawn_actor_batch(spawn_list):
    """Spawn multiple actors efficiently"""
    spawned_actors = []
    
    # Disable viewport updates during batch operation
    unreal.EditorLevelLibrary.set_level_viewport_realtime(False)
    
    try:
        for spawn_data in spawn_list:
            transform = unreal.Transform(
                location=spawn_data.get('location', [0, 0, 0]),
                rotation=spawn_data.get('rotation', [0, 0, 0]),
                scale=spawn_data.get('scale', [1, 1, 1])
            )
            
            actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
                spawn_data['asset'],
                transform.location,
                transform.rotation
            )
            
            if actor and 'name' in spawn_data:
                actor.set_actor_label(spawn_data['name'])
                
            spawned_actors.append(actor)
            
    finally:
        # Re-enable viewport updates
        unreal.EditorLevelLibrary.set_level_viewport_realtime(True)
        
    return spawned_actors
```

## General Best Practices

1. **Always check for None**: Many UE Python methods can return None unexpectedly
2. **Use try-except blocks**: The Python API can throw exceptions without warning
3. **Log errors properly**: Use `unreal.log_error()` for better debugging
4. **Validate actor existence**: Actors can be destroyed between operations
5. **Use subsystems**: Prefer `get_editor_subsystem()` over deprecated global methods

## Common Patterns

### Safe Actor Operations
```python
def safe_actor_operation(actor_name, operation):
    """Safely perform an operation on an actor"""
    try:
        actor = find_actor_by_name(actor_name)
        if not actor:
            unreal.log_error(f"Actor '{actor_name}' not found")
            return False
            
        # Verify actor is still valid
        if not unreal.EditorLevelLibrary.get_all_level_actors().__contains__(actor):
            unreal.log_error(f"Actor '{actor_name}' is no longer valid")
            return False
            
        # Perform the operation
        result = operation(actor)
        return result
        
    except Exception as e:
        unreal.log_error(f"Operation failed on '{actor_name}': {str(e)}")
        return False
```

### Viewport State Management
```python
class ViewportState:
    """Manage viewport state for complex operations"""
    def __init__(self):
        self.editor = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
        self.saved_location = None
        self.saved_rotation = None
        
    def save(self):
        """Save current viewport state"""
        self.saved_location, self.saved_rotation = self.editor.get_level_viewport_camera_info()
        
    def restore(self):
        """Restore saved viewport state"""
        if self.saved_location and self.saved_rotation:
            self.editor.set_level_viewport_camera_info(self.saved_location, self.saved_rotation)
```