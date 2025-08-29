# Environment Configuration

## Overview

UEMCP uses minimal environment configuration. The `setup.sh` script handles most configuration automatically.

## Optional Environment Variables

### Debug Logging

Enable detailed debug output for troubleshooting:

```bash
# Enable debug logging
export DEBUG="uemcp:*"

# Or set in Claude Desktop config (see below)
```

### Project Path (Optional)

The MCP server can optionally log which UE project you're working with:

```bash
# Optional - only used for logging
export UE_PROJECT_PATH="/path/to/your/unreal/project"
```

This is **not required** for UEMCP to function. The Python listener in UE handles all project-specific operations.

## Configuration in Claude Desktop

You can set environment variables in your Claude Desktop configuration:

### macOS/Linux
```json
{
  "mcpServers": {
    "uemcp": {
      "command": "node",
      "args": ["/path/to/UEMCP/dist/index.js"],
      "env": {
        "DEBUG": "uemcp:*",  // Optional: Enable debug logging
        "UE_PROJECT_PATH": "/path/to/project"  // Optional: For logging only
      }
    }
  }
}
```

### Windows
```json
{
  "mcpServers": {
    "uemcp": {
      "command": "node.exe",
      "args": ["C:\\path\\to\\UEMCP\\dist\\index.js"],
      "env": {
        "DEBUG": "uemcp:*"  // Optional: Enable debug logging
      }
    }
  }
}
```

## Python Environment

The setup script automatically handles Python configuration:

1. **Virtual Environment** (optional but recommended)
   - Created automatically by `setup.sh` if you choose
   - Isolates UEMCP dependencies from system Python
   - Activate with: `source venv/bin/activate`

2. **Python Version**
   - Development requires Python 3.11 to match UE's built-in version
   - The setup script will check and warn if version mismatch

## Verifying Your Setup

After running `setup.sh`, verify your environment:

```bash
# Check if MCP server runs
node dist/index.js

# In another terminal, test connection
node test-connection.js

# If using virtual environment
source venv/bin/activate
python --version  # Should show 3.11.x
```

## Environment-Free Operation

**Important:** UEMCP is designed to work without any environment variables:

- The MCP server runs without configuration
- The UE plugin auto-starts the Python listener
- All project-specific operations happen inside UE
- Debug logging can be enabled when needed

The only required setup is:
1. Run `setup.sh` to build and configure
2. Copy plugin to your UE project
3. Start Claude Desktop

No environment variables needed!