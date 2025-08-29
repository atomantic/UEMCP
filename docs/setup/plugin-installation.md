# Plugin Installation Details

## Overview

The UEMCP plugin is a **content-only** Unreal Engine plugin (no C++ compilation required).

## Installation Methods

### Automatic (via setup.sh)
See the [Quick Start Guide](quickstart.md) - the setup script handles everything.

### Manual Installation

#### 1. Copy or Symlink the Plugin

```bash
# Navigate to your UE project
cd "/path/to/YourProject"

# Create Plugins directory if needed
mkdir -p Plugins

# Option A: Symlink (for development)
ln -s "/path/to/UEMCP/plugin" "Plugins/UEMCP"

# Option B: Copy (for production)
cp -r "/path/to/UEMCP/plugin" "Plugins/UEMCP"
```

#### 2. Enable in Unreal Engine

1. Open your project in Unreal Editor
2. Go to **Edit → Plugins**
3. Search for "Python" and enable **Python Script Plugin**
4. Search for "UEMCP" and ensure it's enabled
5. Restart Unreal Editor

## Symlink vs Copy

| Method | Use Case | Pros | Cons |
|--------|----------|------|------|
| **Symlink** | Development | • Instant updates from git<br>• Hot reload support<br>• Single source of truth | • Requires git repo present<br>• Path-dependent |
| **Copy** | Production | • Self-contained<br>• Portable with project<br>• No external dependencies | • Manual updates needed<br>• Takes disk space |

## Plugin Structure

```
UEMCP/
├── UEMCP.uplugin         # Plugin descriptor
└── Content/
    └── Python/
        ├── init_unreal.py     # Auto-starts on UE launch
        ├── uemcp_listener.py  # HTTP server
        ├── uemcp_helpers.py   # Helper functions
        └── ops/               # Operation modules
            ├── actor.py
            ├── viewport.py
            ├── asset.py
            └── ...
```

## Verification

After installation, verify the plugin is working:

### In Output Log
Look for:
```
LogPython: UEMCP: Starting listener...
LogPython: UEMCP: Listener started on http://localhost:8765
```

### In Python Console
```python
# Check status
status()

# Should show:
# UEMCP: Listener is RUNNING on http://localhost:8765
```

## Hot Reload

During development, you can reload code changes without restarting UE:

```python
# In UE Python console
restart_listener()
```

This will:
1. Stop the current listener
2. Reload all Python modules
3. Start a fresh listener with your changes

## Troubleshooting

### Plugin Not Found
- Ensure the plugin is in `YourProject/Plugins/UEMCP/`
- Check that `UEMCP.uplugin` exists in the plugin folder
- Restart Unreal Editor after adding the plugin

### Python Script Plugin Not Enabled
- Go to Edit → Plugins
- Search for "Python Script Plugin"
- Enable it and restart UE

### Listener Not Starting
- Check Output Log for Python errors
- Verify port 8765 is not in use
- Try `restart_listener()` in Python console

## Updating the Plugin

### If Using Symlink
```bash
cd /path/to/UEMCP
git pull
# In UE: restart_listener()
```

### If Using Copy
```bash
cd /path/to/UEMCP
git pull
cp -r plugin "/path/to/YourProject/Plugins/UEMCP"
# Restart Unreal Editor
```

---

For initial setup, see the [Quick Start Guide](quickstart.md).