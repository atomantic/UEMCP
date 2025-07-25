# Claude Desktop MCP Configuration (Current Version)

## Finding the Configuration File

The MCP server configuration is now done through a JSON configuration file, not through the app UI.

### On macOS:

1. **Locate the config file:**
   ```bash
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

2. **Create the directory if it doesn't exist:**
   ```bash
   mkdir -p ~/Library/Application\ Support/Claude
   ```

3. **Create or edit the configuration file:**
   ```bash
   nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

### Configuration Content:

Add this to the file:

```json
{
  "mcpServers": {
    "uemcp": {
      "command": "node",
      "args": ["<PATH_TO_UEMCP>/server/dist/index.js"],
      "env": {
        "DEBUG": "uemcp:*"
      }
    }
  }
}
```

### Alternative Location (if above doesn't work):

Sometimes the config might be at:
- `~/.config/claude/claude_desktop_config.json`
- `~/Library/Preferences/com.anthropic.claude-desktop.plist` (for older versions)

## Steps to Configure:

1. **Close Claude Desktop completely**

2. **Create/edit the config file:**
   ```bash
   # Check if directory exists
   ls ~/Library/Application\ Support/Claude/
   
   # If not, create it
   mkdir -p ~/Library/Application\ Support/Claude
   
   # Create the config file
   cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json << 'EOF'
   {
     "mcpServers": {
       "uemcp": {
         "command": "node",
         "args": ["<PATH_TO_UEMCP>/server/dist/index.js"],
         "env": {
           "DEBUG": "uemcp:*"
         }
       }
     }
   }
   EOF
   ```

3. **Verify the file was created:**
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

4. **Start Claude Desktop**

5. **Check if MCP is loaded:**
   - Look for a 🔌 icon or indicator in the Claude interface
   - Or check the developer console for MCP-related messages

## Troubleshooting:

### If MCP servers don't appear:

1. **Check Claude Desktop version:**
   - Make sure you have the latest version
   - MCP support was added in recent versions

2. **Try alternate config location:**
   ```bash
   # Try in .config directory
   mkdir -p ~/.config/claude
   cp ~/Library/Application\ Support/Claude/claude_desktop_config.json ~/.config/claude/
   ```

3. **Check logs:**
   ```bash
   # Look for Claude logs
   ls ~/Library/Logs/Claude/
   ```

4. **Verify Node.js is accessible:**
   ```bash
   which node
   # Should show: /usr/local/bin/node or similar
   ```

## Testing the Connection:

Once configured and Claude Desktop is restarted:

1. **In a new Claude conversation, type:**
   "Can you list the tools available from the UEMCP server?"

2. **If working, I should respond with:**
   - asset.list
   - blueprint.create  
   - project.info

3. **Test a command:**
   "Can you get information about the current Unreal project?"

## Manual Start (for testing):

You can also manually start the MCP server to verify it works:

```bash
# In one terminal:
cd <PATH_TO_UEMCP>/server
node dist/index.js

# You should see:
# [timestamp] uemcp INFO: UEMCP server started - ready to control Unreal Engine!
```

## If Still Not Working:

The MCP feature might be:
- In beta/preview and needs to be enabled
- Available only in certain versions
- Configured differently in your version

Try:
1. Check Claude Desktop settings/preferences for any MCP or "Extensions" section
2. Look for a "Developer" or "Advanced" menu
3. Check the official Claude Desktop documentation for your version

Let me know which version of Claude Desktop you're running and what you see in the configuration locations!