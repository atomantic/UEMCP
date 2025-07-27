# UEMCP Tests

This directory contains various test scripts and documentation for the UEMCP system.

## Documentation

- `MANUAL_TESTING.md` - Guide for manual testing with Claude Desktop and MCP Inspector

## Integration Tests

Located in `/tests/integration/`:

### MCP Server Tests
- `test-connection.js` - Basic connection test
- `test-server.js` - Server startup and basic operations
- `test-mcp-direct.js` - Direct MCP protocol testing
- `test-mcp-integration.js` - Full MCP integration test
- `test-claude-mcp.js` - Claude Desktop integration test

### Feature Tests
- `test-python-proxy.js` - Python proxy functionality
- `test-uemcp-assets.js` - Asset listing and info
- `test-uemcp-simple.js` - Simple UEMCP operations
- `test-ue-live.js` - Live Unreal Engine operations
- `test-screenshot.js` - Screenshot functionality
- `test-wireframe-top.js` - Wireframe and camera views
- `test-level-check.js` - Level operations

### Running Tests

Most tests can be run directly:
```bash
node tests/integration/test-connection.js
```

Some tests require the MCP server to be running and a UE project path:
```bash
export UE_PROJECT_PATH="/path/to/your/project"
node tests/integration/test-mcp-integration.js
```

### Test Coverage

These integration tests cover:
- Server initialization and connection
- Python listener communication
- All MCP tools (actor_spawn, asset_list, etc.)
- Viewport controls
- Error handling
- Performance under load

### Adding New Tests

When adding new test files:
1. Place them in the appropriate subdirectory
2. Follow the naming convention: `test-{feature}.js`
3. Include clear console output for debugging
4. Document any prerequisites or environment setup