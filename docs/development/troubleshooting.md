# UEMCP Troubleshooting Guide

## 🔍 Diagnostic Steps

Before troubleshooting, run these diagnostics:

```bash
# Check Node.js version (should be 18+)
node --version

# Test the server directly
cd <UEMCP_PATH>
node test-connection.js

# Check Claude config exists
# macOS
ls ~/Library/Application\ Support/Claude/claude_desktop_config.json
# Windows
dir %APPDATA%\Claude\claude_desktop_config.json
```

## Common Issues

### Claude Desktop / Claude Code Issues

#### "Connection Lost When Restarting Unreal Engine"

**Note:** The MCP server is designed to handle Unreal Engine restarts gracefully!

**How it works:**
- The server runs health checks every 5 seconds
- When UE stops, the server logs the disconnection but keeps running
- When UE starts again, the server automatically reconnects within seconds
- You'll see status updates in the Claude Code logs

**What you DON'T need to do:**
- ❌ Don't restart Claude Code when restarting UE
- ❌ Don't manually restart the MCP server
- ❌ Don't worry about "connection lost" messages

**What you SHOULD do:**
1. Start Unreal Engine first with your project
2. Then launch Claude Code (`claude -c`)
3. If you restart UE, just wait a few seconds for auto-reconnection
4. Watch the logs for "✓ Python listener connected" message

#### "Claude doesn't see UEMCP tools"

**Symptoms:**
- Claude doesn't recognize UEMCP commands
- No MCP indicator in Claude interface

**Solutions:**
1. **Fully restart Claude Desktop**
   - Quit completely (not just close window)
   - On macOS: Cmd+Q or right-click dock icon → Quit
   - On Windows: File → Exit or system tray → Exit

2. **Verify configuration file**
   ```bash
   # Check if config exists and is valid JSON
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .
   ```

3. **Check server path is correct**
   - The path in config must be absolute
   - Path separators: Use forward slashes `/` even on Windows

4. **Test server manually**
   ```bash
   node <PATH_FROM_CONFIG>/server/dist/index.js
   ```

#### "MCP server connection failed"

**Solutions:**
1. Check Node.js is in PATH: `which node` or `where node`
2. Try using full Node.js path in config:
   ```json
   {
     "command": "/usr/local/bin/node",
     "args": ["..."]
   }
   ```

### Installation Issues

#### "npm install fails"

**Common causes:**
- Old npm cache
- Permission issues
- Network problems

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Try with different registry
npm install --registry https://registry.npmjs.org/

# Install with verbose logging
npm install --verbose
```

#### "Build fails with TypeScript errors"

**Solutions:**
1. Check Node version: `node --version` (needs 18+)
2. Delete and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

### Python-Related Issues

#### "Python not found"

**Note:** Python is required for development. Use Python 3.11 to match UE 5.4+ built-in version.

**To enable Python features:**
```bash
# Check Python version
python3 --version  # Should be 3.11

# Install Python dependencies for local development
pip3 install -r requirements-dev.txt  # Includes unreal module stub

# For CI/CD environments (no UE available)
pip3 install -r requirements-ci.txt   # Excludes unreal module
```

#### "HTTP 529 Too Many Requests"

**Symptoms:**
- 529 errors from the Python listener
- Audio buffer underrun warnings in UE

**Solutions:**
1. Restart the Python listener:
   ```python
   # In UE Python console
   restart_listener()
   ```

2. The listener now processes fewer commands per tick to prevent overload

#### "Port 8765 already in use"

**Symptoms:**
- OSError when starting UEMCP listener
- Address already in use error

**Solutions:**
1. Find and kill the process using the port:
   ```bash
   # Find process
   lsof -i :8765  # macOS/Linux
   netstat -ano | findstr :8765  # Windows
   
   # Kill process
   kill -9 <PID>  # macOS/Linux
   taskkill /PID <PID> /F  # Windows
   ```

2. Or restart the listener in UE:
   ```python
   # In UE Python console
   restart_listener()
   ```

### Unreal Engine Issues

#### "Can't find Unreal project"

**Solutions:**
1. Set the environment variable:
   ```bash
   export UE_PROJECT_PATH="/full/path/to/project.uproject"
   ```

2. Update Claude config:
   ```json
   {
     "mcpServers": {
       "uemcp": {
         "env": {
           "UE_PROJECT_PATH": "/full/path/to/project.uproject"
         }
       }
     }
   }
   ```

3. Verify path is correct:
   - Must point to the `.uproject` file, not just the directory
   - Use full absolute path
   - Example: `/Users/name/Documents/Unreal Projects/MyProject/MyProject.uproject`

#### "Unreal Engine Python API not working"

**Requirements:**
- Enable Python Script Plugin in UE
- UEMCP plugin installed in project

**Check in Unreal:**
1. Edit → Plugins
2. Search "Python"
3. Enable "Python Script Plugin"
4. Search "UEMCP"
5. Ensure UEMCP is enabled
6. Restart Unreal Editor

#### "Missing init_unreal_simple.py error on startup"

**Symptoms:**
- Error about missing `/UEMCP/Content/Python/init_unreal_simple.py`
- This file was removed but reference remained

**Solution:**
1. Check `Config/DefaultEngine.ini` in your UE project
2. Remove any line referencing `init_unreal_simple.py`

#### "Unreal Engine crashes when running restart_listener()"

**Symptoms:**
- UE crashes immediately when calling `restart_listener()`
- May happen from Python console or through MCP tool

**Cause:**
- Python modules cannot be safely reloaded while code from those modules is executing
- The HTTP server cannot restart itself while handling requests

**Solution:**
Use the manual two-step restart process:
```python
# Step 1: Stop the listener
restart_listener()  # This just stops the server

# Step 2: Complete restart manually
import importlib
importlib.reload(uemcp_listener)
uemcp_listener.start_listener()
```

**Alternative:** If you just need to reload code changes:
1. Save your Python files
2. Use the manual restart steps above
3. Your changes will be loaded with the fresh module
3. The correct startup is handled by `init_unreal.py`

#### "Deprecation warnings for EditorLevelLibrary"

**Symptoms:**
- Warning about deprecated `get_editor_world()` function

**Solution:**
This has been fixed in the latest version. The plugin now uses:
```python
unreal.UnrealEditorSubsystem().get_editor_world()
```

### Platform-Specific Issues

#### macOS: "Operation not permitted"

**Solution:**
```bash
# Grant terminal full disk access
System Preferences → Security & Privacy → Privacy → Full Disk Access
# Add Terminal or your terminal app
```

#### Windows: "Execution policy" error

**Solution:**
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Linux: Config in wrong location

**Check these locations:**
- `~/.config/claude/claude_desktop_config.json`
- `~/.local/share/claude/claude_desktop_config.json`
- `$XDG_CONFIG_HOME/claude/claude_desktop_config.json`

## Debug Mode

Enable detailed logging:

```bash
# Set debug environment variable
export DEBUG=uemcp:*

# Run with debug
DEBUG=uemcp:* node test-connection.js

# In Claude config
{
  "mcpServers": {
    "uemcp": {
      "env": {
        "DEBUG": "uemcp:*"
      }
    }
  }
}
```

## Getting Help

1. **Check logs**: Look for error messages in terminal output
2. **Run diagnostics**: Use `test-connection.js` or the `test_connection` MCP tool
3. **GitHub Issues**: Search existing issues or create new one
4. **Debug output**: Include `DEBUG=uemcp:*` output when reporting
5. **Check UE Output Log**: Window → Developer Tools → Output Log in UE

## UEMCP Plugin Commands

Useful commands in the UE Python console:

```python
# Check if listener is running
status()

# Restart the listener (hot reload)
restart_listener()

# Stop the listener
stop_listener()

# Start the listener
start_listener()

# Enable debug logging
import os
os.environ['UEMCP_DEBUG'] = '1'
restart_listener()
```

## Reset Everything

If all else fails, complete reset:

```bash
# Backup your config
cp ~/Library/Application\ Support/Claude/claude_desktop_config.json ~/Desktop/

# Remove UEMCP
rm -rf UEMCP

# Start fresh
git clone https://github.com/atomantic/UEMCP.git
cd UEMCP
./setup.sh
```