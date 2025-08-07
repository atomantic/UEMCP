# Python API Workarounds

This document lists confirmed issues with Unreal Engine's Python API and their workarounds.

## Confirmed Issues

### 1. Actor Reference by Display Name
**Issue:** `EditorLevelLibrary.get_actor_reference()` doesn't work with display names (actor labels), only with internal actor names.

**Status:** ✅ Confirmed - This is a real limitation of the UE Python API

**Workaround:**
```python
def find_actor_by_name(actor_name):
    """Find an actor by its display name (label)"""
    editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    all_actors = editor_actor_subsystem.get_all_level_actors()
    
    for actor in all_actors:
        try:
            if actor and hasattr(actor, 'get_actor_label') and actor.get_actor_label() == actor_name:
                return actor
        except:
            continue
    return None
```

### 2. Rotator Constructor Parameter Order
**Issue:** The `unreal.Rotator(a, b, c)` constructor has confusing/incorrect parameter ordering that can lead to unexpected rotations.

**Status:** ✅ Confirmed - Constructor behavior is inconsistent

**Workaround:**
```python
def create_rotator(rotation_array):
    """Create a Rotator with explicit property setting to avoid constructor issues"""
    rotator = unreal.Rotator()
    rotator.roll = float(rotation_array[0])   # Roll (X axis rotation)
    rotator.pitch = float(rotation_array[1])  # Pitch (Y axis rotation)  
    rotator.yaw = float(rotation_array[2])    # Yaw (Z axis rotation)
    return rotator

# Alternative: Use keyword arguments
rotation = unreal.Rotator(roll=0, pitch=-90, yaw=45)
```

### 3. Blueprint Asset Loading
**Issue:** Blueprint assets require the `_C` suffix to load the generated class

**Status:** ✅ Confirmed - This is standard UE behavior

**Workaround:**
```python
def load_blueprint_class(asset_path):
    """Load a Blueprint class with proper suffix handling"""
    # Blueprint classes need _C suffix
    if not asset_path.endswith('_C'):
        asset_path = asset_path + '_C'
    
    return unreal.EditorAssetLibrary.load_asset(asset_path)
```

## Deprecated Methods

### Viewport Control Methods
Several viewport methods have been deprecated in favor of the `UnrealEditorSubsystem`:

**Deprecated Methods:**
- `editor_play_in_viewport()` 
- `editor_set_camera_look_at_location()`
- Direct viewport manipulation methods

**Modern Approach:**
```python
# Get the modern editor subsystem
editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)

# Set camera position and rotation
camera_location = unreal.Vector(1000, 1000, 500)
camera_rotation = unreal.Rotator(roll=0, pitch=-30, yaw=45)
editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)

# Get current camera info
location, rotation = editor_subsystem.get_level_viewport_camera_info()
```

## Proper API Usage (Not Bugs)

### Console Commands Need World Context
This is correct API usage, not a workaround:

```python
def execute_console_command(command):
    """Execute a console command in the editor world"""
    editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
    world = editor_subsystem.get_editor_world()
    
    if world:
        unreal.SystemLibrary.execute_console_command(world, command)
        return True
    return False
```

### Batch Operations
The Python API doesn't provide built-in batch operations, but this is a feature gap, not a bug:

```python
def spawn_actors_batch(spawn_list):
    """Custom batch spawn implementation for efficiency"""
    spawned = []
    
    # Optional: Disable viewport updates for performance
    unreal.EditorLevelLibrary.set_level_viewport_realtime(False)
    
    try:
        for item in spawn_list:
            actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
                item['asset'],
                item.get('location', unreal.Vector()),
                item.get('rotation', unreal.Rotator())
            )
            if actor and 'name' in item:
                actor.set_actor_label(item['name'])
            spawned.append(actor)
    finally:
        # Re-enable viewport
        unreal.EditorLevelLibrary.set_level_viewport_realtime(True)
    
    return spawned
```

## Best Practices

### 1. Use Modern Subsystems
Always prefer `get_editor_subsystem()` over deprecated global methods:
```python
# Good
editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)

# Avoid deprecated global methods
```

### 2. Defensive Programming
```python
def safe_actor_operation(actor_name, operation):
    """Safely perform operations with proper error handling"""
    try:
        actor = find_actor_by_name(actor_name)
        if not actor:
            unreal.log_error(f"Actor '{actor_name}' not found")
            return False
            
        # Verify actor is still valid
        all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
        if actor not in all_actors:
            unreal.log_error(f"Actor '{actor_name}' is no longer valid")
            return False
            
        return operation(actor)
        
    except Exception as e:
        unreal.log_error(f"Operation failed: {str(e)}")
        return False
```

### 3. Asset Path Handling
```python
def load_asset_safe(asset_path):
    """Load assets with proper error handling"""
    try:
        # Try direct load first
        asset = unreal.EditorAssetLibrary.load_asset(asset_path)
        if asset:
            return asset
            
        # Try with _C suffix for Blueprints
        if not asset_path.endswith('_C'):
            asset = unreal.EditorAssetLibrary.load_asset(asset_path + '_C')
            if asset:
                return asset
                
    except Exception as e:
        unreal.log_error(f"Failed to load {asset_path}: {e}")
    
    return None
```

## Performance Tips

### 1. Cache Subsystem References
```python
class EditorOperations:
    def __init__(self):
        # Cache subsystems for repeated use
        self.editor = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
        self.actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
        self.assets = unreal.get_editor_subsystem(unreal.EditorAssetSubsystem)
```

### 2. Viewport Update Control
```python
# Disable viewport updates during heavy operations
unreal.EditorLevelLibrary.set_level_viewport_realtime(False)
# ... perform many operations ...
unreal.EditorLevelLibrary.set_level_viewport_realtime(True)
```

### 3. Use List Comprehensions for Filtering
```python
# Efficient actor filtering
walls = [
    actor for actor in unreal.EditorLevelLibrary.get_all_level_actors()
    if actor and 'Wall' in actor.get_actor_label()
]
```

## Summary

Most documented "workarounds" fall into three categories:

1. **Real API Limitations** (3 issues):
   - `get_actor_reference()` not working with display names
   - Rotator constructor parameter confusion
   - Blueprint assets requiring `_C` suffix

2. **Deprecated Methods** - Use modern subsystems instead

3. **Proper API Usage** - Not bugs, just correct usage patterns

When in doubt, check the [Unreal Engine Python API documentation](https://docs.unrealengine.com/5.0/en-US/PythonAPI/) for the latest recommended approaches.