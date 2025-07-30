# UEMCP Modular Architecture

## Overview

The UEMCP Python plugin has been refactored from a monolithic 2090-line file into a clean, modular architecture. This document describes the new structure and benefits.

## Architecture Benefits

- **85% code reduction** when using dedicated MCP tools vs python_proxy
- **Better maintainability** with focused, single-responsibility modules
- **Easier testing** with isolated components
- **Type safety** and parameter validation
- **Consistent error handling** across all operations
- **Hot-reloadable** modules for faster development

## Module Structure

### Core Modules

1. **`uemcp_utils.py`** - Common utility functions
   - Vector/Rotator creation with proper UE coordinate system handling
   - Actor finding and filtering
   - Asset loading and validation
   - Logging utilities
   - Project information helpers

2. **`uemcp_validation.py`** - Validation framework
   - Post-operation validation to ensure changes were applied
   - Tolerance-based comparison for floating-point values
   - Angle normalization for rotation validation
   - Structured validation results with errors and warnings

3. **`uemcp_command_registry.py`** - Command dispatch system
   - Automatic command discovery from operation classes
   - Parameter validation and filtering
   - Centralized command management
   - Category-based organization

### Operation Modules

4. **`uemcp_actor_ops.py`** - Actor operations
   - `spawn()` - Create actors with validation
   - `delete()` - Remove actors safely
   - `modify()` - Change actor properties
   - `duplicate()` - Copy actors with offset
   - `organize()` - Manage World Outliner folders

5. **`uemcp_viewport_ops.py`** - Viewport and camera operations
   - `screenshot()` - Capture viewport with compression
   - `set_camera()` - Position and rotate camera
   - `focus_on_actor()` - Center view on actors
   - `set_render_mode()` - Change rendering (wireframe, unlit, etc.)
   - `look_at_target()` - Point camera at location/actor
   - `set_mode()` - Standard views (top, front, side, etc.)
   - `get_bounds()` - Viewport visible area
   - `fit_actors()` - Adjust camera to show actors

6. **`uemcp_asset_ops.py`** - Asset and content operations
   - `list_assets()` - Browse project content
   - `get_asset_info()` - Detailed asset properties
   - `validate_asset_paths()` - Batch path validation
   - `find_assets_by_type()` - Type-filtered search

7. **`uemcp_level_ops.py`** - Level and project operations
   - `save_level()` - Save current level
   - `get_project_info()` - Project details
   - `get_level_actors()` - List and filter actors
   - `get_outliner_structure()` - World Outliner hierarchy

8. **`uemcp_system_ops.py`** - System utilities
   - `help()` - Get command documentation
   - `test_connection()` - Verify listener status
   - `restart_listener()` - Hot reload
   - `ue_logs()` - Fetch UE log files
   - `python_proxy()` - Execute arbitrary Python

### Main Components

9. **`uemcp_listener_modular.py`** - HTTP server
   - Replaces the monolithic listener
   - Uses command registry for dispatch
   - Maintains backward compatibility
   - Auto-discovers available commands

10. **`uemcp_migrate.py`** - Migration utilities
    - Safe migration from old to new system
    - Backup and rollback capabilities
    - Module testing before migration

## Command Naming Convention

Commands follow a consistent pattern:
```
{category}_{operation}
```

Examples:
- `actor_spawn`
- `viewport_screenshot`
- `level_save_level`
- `asset_list_assets`

## Validation System

All actor operations support optional validation:

```python
# With validation (default)
result = actor_ops.spawn(assetPath='/Game/Cube', validate=True)
if result.get('validated'):
    print("Actor spawned and verified")

# Without validation (faster)
result = actor_ops.spawn(assetPath='/Game/Cube', validate=False)
```

## Migration Guide

1. **Test the modular system:**
   ```python
   from test_modular_system import run_all_tests
   run_all_tests()
   ```

2. **Migrate to modular:**
   ```python
   from uemcp_migrate import migrate_to_modular
   migrate_to_modular()
   ```

3. **Restart the listener:**
   ```python
   restart_listener()
   ```

4. **Rollback if needed:**
   ```python
   from uemcp_migrate import rollback_migration
   rollback_migration()
   ```

## Development Workflow

1. **Make changes to modules**
2. **Test in isolation:**
   ```python
   from uemcp_actor_ops import ActorOperations
   actor_ops = ActorOperations()
   result = actor_ops.spawn('/Game/Cube')
   ```
3. **Hot reload:**
   ```python
   restart_listener()
   ```

## Best Practices

1. **Avoid python_proxy for common operations** - Use or create dedicated tools
2. **Use validation for critical operations** - Ensures changes were applied
3. **Check logs on failure** - Use `ue_logs()` tool for debugging
4. **Follow the pattern** - When adding new operations, follow existing patterns

## Performance Improvements

The modular system provides significant performance benefits:

- **Reduced overhead** - Only load needed modules
- **Faster command dispatch** - Direct method calls vs large if/elif chain
- **Optional validation** - Skip validation for bulk operations
- **Better caching** - Module-level caching opportunities

## Future Enhancements

- Blueprint manipulation tools
- Material editing operations
- Animation control
- Physics simulation commands
- Level streaming operations
- Advanced asset management

## Troubleshooting

If you encounter issues:

1. Check module imports: `test_modular_system.test_imports()`
2. Verify command registry: `test_modular_system.test_command_registry()`
3. Check UE logs: `ue_logs()`
4. Enable debug mode: `os.environ['UEMCP_DEBUG'] = '1'`
5. Rollback if needed: `rollback_migration()`