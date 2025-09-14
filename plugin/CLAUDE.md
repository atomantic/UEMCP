# Plugin Module Context

This file provides context for the UEMCP Unreal Engine plugin module.

## Plugin Architecture

The plugin is **content-only** (no C++ compilation required) and consists of:
- Python listener that runs inside Unreal Engine
- Helper utilities for hot-reloading and debugging
- Thread tracking across module reloads

## Development Workflow

### Hot Reload Pattern
When making changes to plugin Python files:
```python
# In UE Python console
restart_listener()  # Reloads changes without restarting UE
```

This process:
1. Signals the server to stop
2. Waits for it to stop
3. Cleans up the port if needed
4. Reloads the Python module with your changes
5. Starts a fresh listener

### Helper Functions

```python
from uemcp_helpers import *
```

Available functions:
- `restart_listener()` - Hot reload the listener with code changes
- `reload_uemcp()` - Alias for restart_listener()
- `status()` - Check if listener is running
- `stop_listener()` - Send stop signal to listener (non-blocking)
- `start_listener()` - Start the listener

### Thread Management
The plugin uses `uemcp_thread_tracker.py` to track threads across module reloads, preventing thread leaks.

### Port Cleanup
If port 8765 is stuck in use:
```python
import uemcp_port_utils
uemcp_port_utils.force_free_port(8765)
```

## Python API Integration

The plugin interfaces with Unreal Engine's Python API (Python 3.11, matching UE 5.4+):
- Uses `unreal` module for all engine interactions
- Avoids deprecated APIs (uses `UnrealEditorSubsystem()`)
- Handles coordinate system transformations

## Debugging

Enable verbose logging:
```python
os.environ['UEMCP_DEBUG'] = '1'
restart_listener()
```

Check logs in UE Output Log (Window → Developer Tools → Output Log) for lines starting with `LogPython:`