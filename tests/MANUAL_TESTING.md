# Manual Testing Guide for UEMCP

## Testing with Claude Desktop

1. Add this configuration to your Claude Desktop settings:

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

2. Restart Claude Desktop

3. In a new conversation, you should be able to use the UEMCP tools:
   - Ask Claude to "create a new Unreal Engine project called TestProject"
   - The server will respond with the mock creation result

## Testing with MCP Inspector

You can also test using the MCP inspector tool:

```bash
npx @modelcontextprotocol/inspector node <PATH_TO_UEMCP>/server/dist/index.js
```

## Current Status

- ✅ Server starts successfully
- ✅ Proper MCP protocol implementation
- ✅ Error handling

## Example Project Configuration

For testing, ensure you have an Unreal Engine project available and set the `UE_PROJECT_PATH` environment variable:

```bash
export UE_PROJECT_PATH="/path/to/your/unreal/project"
```

## Next Steps

The server is ready for basic testing. In the next development phases, we'll:
1. Add more tools (asset management, blueprint operations, etc.)
2. Implement the Python bridge to connect to actual Unreal Engine
3. Replace mock implementations with real UE operations