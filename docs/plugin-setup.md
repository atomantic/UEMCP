# UEMCP Plugin Setup Guide

The UEMCP plugin extends Unreal Engine with additional Python bindings and editor functionality for AI-assisted development.

## Automatic Installation

The easiest way to install the plugin is during initialization:

```bash
node init.js --project "/path/to/your/project" --install-plugin
```

This will:
- Copy the plugin to your project's `Plugins` directory
- Update your `.uproject` file to enable the plugin
- Configure the plugin for immediate use

## Manual Installation

If you prefer to install manually or need to install to multiple projects:

### 1. Copy the Plugin

```bash
# For full plugin (with C++ source)
cp -r <UEMCP_PATH>/plugin "<YOUR_PROJECT>/Plugins/UEMCP"

# For minimal plugin (Blueprint only)
cp -r <UEMCP_PATH>/plugin_minimal "<YOUR_PROJECT>/Plugins/UEMCP"
```

### 2. Enable in Project

Add to your `.uproject` file's `Plugins` array:

```json
{
    "Name": "UEMCP",
    "Enabled": true
}
```

### 3. Rebuild Project

- Right-click your `.uproject` file
- Select "Generate Project Files"
- Build in your IDE

## Plugin Features

### Python Integration
- Enhanced Python API access
- Custom command execution
- Asset manipulation utilities

### Editor Extensions
- UEMCP status indicator
- Quick access tools menu
- Debug console integration

### C++ API (Full Plugin Only)
- Native performance for critical operations
- Extended Blueprint nodes
- Custom asset factories

## Verifying Installation

1. **In Unreal Editor**:
   - Edit → Plugins
   - Search for "UEMCP"
   - Should show as "Enabled"

2. **Check Output Log**:
   - Window → Developer Tools → Output Log
   - Look for: "UEMCP Module has started!"

3. **Python Console**:
   ```python
   import uemcp_bridge
   print(uemcp_bridge.version())
   ```

## Troubleshooting

### "Plugin not found"
- Ensure plugin is in `<Project>/Plugins/UEMCP/`
- Check `.uproject` includes the plugin
- Regenerate project files

### "Compilation failed"
- Verify Unreal Engine version compatibility (5.1+)
- Check C++ compiler is installed
- Try the minimal plugin version

### "Python module not found"
- Enable Python Script Plugin first
- Restart Unreal Editor after installation
- Check Python paths in Project Settings

## Updating the Plugin

To update an existing installation:

```bash
# Backup existing plugin (optional)
mv "<PROJECT>/Plugins/UEMCP" "<PROJECT>/Plugins/UEMCP.backup"

# Install new version
node init.js --project "<PROJECT>" --install-plugin
```

## Uninstalling

1. Remove from `.uproject` file
2. Delete `<Project>/Plugins/UEMCP/`
3. Regenerate project files
4. Rebuild project

## Next Steps

- Test the plugin: `node test-connection.js`
- Explore Python API: See [Python Bridge Documentation](python-bridge.md)
- Build custom tools: Check [Development Guide](development.md)