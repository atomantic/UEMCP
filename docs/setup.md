# Setup Reference

The `setup.sh` script handles all configuration automatically. This document provides additional details for manual setup or troubleshooting.

## Manual Plugin Installation

If you need to manually install the plugin (setup.sh handles this automatically):

### Symlink Method (Development)
```bash
ln -s "/path/to/UEMCP/plugin" "/path/to/YourProject/Plugins/UEMCP"
```

### Copy Method (Production)
```bash
cp -r /path/to/UEMCP/plugin "/path/to/YourProject/Plugins/UEMCP"
```

## Environment Variables (Optional)

All environment variables are **optional**. UEMCP works without any configuration.

- `DEBUG="uemcp:*"` - Enable debug logging (for troubleshooting only)
- `UE_PROJECT_PATH` - Optional, only used for logging

## Manual MCP Configuration

The setup script configures these automatically. For manual setup:

### Claude Desktop
Config file: `~/Library/Application Support/Claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "uemcp": {
      "command": "node",
      "args": ["/path/to/UEMCP/dist/index.js"]
    }
  }
}
```

### Claude Code
```bash
claude mcp add uemcp node /path/to/UEMCP/dist/index.js
```

## Verification

After setup, verify the installation:

1. In UE Python console: `status()`
2. In terminal: `node test-connection.js`
3. Check Output Log for: `UEMCP: Listener started on http://localhost:8765`

## Troubleshooting

See [Troubleshooting Guide](development/troubleshooting.md) for common issues.