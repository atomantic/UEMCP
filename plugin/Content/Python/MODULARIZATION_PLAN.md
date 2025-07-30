# Python Plugin Modularization Plan

## Current Issues
- `uemcp_listener.py` has 2090 lines - too large and monolithic
- All command handlers are in one giant if/elif chain
- Common patterns repeated across handlers (actor finding, validation, etc.)
- Difficult to maintain and test individual components

## Proposed Module Structure

### Core Modules

1. **uemcp_actor_ops.py** - Actor operations
   - `spawn_actor(asset_path, location, rotation, scale, name, folder)`
   - `delete_actor(actor_name)`
   - `modify_actor(actor_name, location, rotation, scale, folder, mesh)`
   - `duplicate_actor(source_name, new_name, offset)`
   - `organize_actors(actors, pattern, folder)`
   - `find_actor_by_name(actor_name)` - Common utility
   - `get_all_actors(filter_text=None, limit=30)`

2. **uemcp_viewport_ops.py** - Viewport operations
   - `take_screenshot(width, height, screen_percentage, compress, quality)`
   - `set_camera(location, rotation, focus_actor, distance)`
   - `focus_on_actor(actor_name, preserve_rotation)`
   - `set_viewport_mode(mode)`
   - `set_render_mode(mode)`
   - `get_viewport_bounds()`
   - `fit_actors_in_view(actors, filter_pattern, padding)`
   - `look_at_target(target, actor_name, distance, pitch, height)`

3. **uemcp_asset_ops.py** - Asset operations
   - `list_assets(path, asset_type, limit)`
   - `get_asset_info(asset_path)`
   - `load_asset(asset_path)`
   - `validate_asset_path(asset_path)`

4. **uemcp_level_ops.py** - Level operations
   - `save_level()`
   - `get_outliner_structure(show_empty, max_depth)`
   - `get_project_info()`

5. **uemcp_utils.py** - Common utilities
   - `create_vector(location_array)`
   - `create_rotator(rotation_array)` - With proper Roll/Pitch/Yaw handling
   - `normalize_angle(angle)`
   - `get_editor_subsystem(subsystem_class)`
   - `execute_console_command(command)`

### Handler Registry Pattern

Create a command handler registry to replace the giant if/elif chain:

```python
# uemcp_command_registry.py
from uemcp_actor_ops import ActorOperations
from uemcp_viewport_ops import ViewportOperations
from uemcp_asset_ops import AssetOperations
from uemcp_level_ops import LevelOperations

class CommandRegistry:
    def __init__(self):
        self.handlers = {}
        self._register_handlers()
    
    def _register_handlers(self):
        # Actor operations
        actor_ops = ActorOperations()
        self.handlers['actor.spawn'] = actor_ops.spawn
        self.handlers['actor.delete'] = actor_ops.delete
        self.handlers['actor.modify'] = actor_ops.modify
        self.handlers['actor.duplicate'] = actor_ops.duplicate
        self.handlers['actor.organize'] = actor_ops.organize
        
        # Viewport operations
        viewport_ops = ViewportOperations()
        self.handlers['viewport.screenshot'] = viewport_ops.screenshot
        self.handlers['viewport.camera'] = viewport_ops.set_camera
        # ... etc
    
    def execute(self, command_type, params):
        handler = self.handlers.get(command_type)
        if handler:
            return handler(**params)
        else:
            return {'success': False, 'error': f'Unknown command: {command_type}'}
```

## Benefits

1. **Maintainability**: Each module focuses on one concern
2. **Testability**: Individual modules can be tested in isolation
3. **Reusability**: Common functions can be shared across handlers
4. **Performance**: Easier to optimize specific operations
5. **Extensibility**: New commands can be added without touching the listener
6. **Documentation**: Each module can have focused documentation

## Migration Strategy

1. Create new module files one at a time
2. Move related functions to appropriate modules
3. Update imports in uemcp_listener.py
4. Replace if/elif chain with command registry
5. Test each module independently
6. Update documentation

## Common Patterns to Extract

1. **Actor Finding Pattern**:
   ```python
   def find_actor_by_name(actor_name):
       all_actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
       for actor in all_actors:
           try:
               if actor and hasattr(actor, 'get_actor_label') and actor.get_actor_label() == actor_name:
                   return actor
           except:
               continue
       return None
   ```

2. **Transform Creation Pattern**:
   ```python
   def create_transform(location, rotation, scale):
       ue_location = unreal.Vector(*location)
       ue_rotation = unreal.Rotator()
       ue_rotation.roll = rotation[0]
       ue_rotation.pitch = rotation[1]
       ue_rotation.yaw = rotation[2]
       ue_scale = unreal.Vector(*scale)
       return ue_location, ue_rotation, ue_scale
   ```

3. **Validation Integration Pattern**:
   ```python
   def execute_with_validation(operation_func, validation_func, params, validate=True):
       result = operation_func(**params)
       if validate and result['success']:
           validation_result = validation_func(**params)
           result.update(validation_result.to_dict())
       return result
   ```