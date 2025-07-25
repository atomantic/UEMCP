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

### Claude Desktop Issues

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

**Note:** Python is optional. Core features work without it.

**To enable Python features:**
```bash
# Check Python version
python3 --version  # Should be 3.8+

# Install Python dependencies
pip3 install -r requirements-dev.txt

# Or use virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements-dev.txt
```

### Unreal Engine Issues

#### "Can't find Unreal project"

**Solutions:**
1. Set the environment variable:
   ```bash
   export UE_PROJECT_PATH="/full/path/to/project"
   ```

2. Update Claude config:
   ```json
   {
     "mcpServers": {
       "uemcp": {
         "env": {
           "UE_PROJECT_PATH": "/full/path/to/project"
         }
       }
     }
   }
   ```

3. Verify path is correct:
   - Should contain `.uproject` file
   - Use full absolute path
   - No trailing slashes

#### "Unreal Engine Python API not working"

**Requirements:**
- Enable Python Script Plugin in UE
- Enable Editor Scripting Utilities

**Check in Unreal:**
1. Edit → Plugins
2. Search "Python"
3. Enable "Python Script Plugin"
4. Restart Unreal Editor

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
2. **Run diagnostics**: Use `test-connection.js`
3. **GitHub Issues**: Search existing issues or create new one
4. **Debug output**: Include `DEBUG=uemcp:*` output when reporting

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
node init.js
```