#!/bin/bash

echo "Testing UEMCP MCP Server..."

# Start server in background
node server/dist/index.js &
SERVER_PID=$!

# Give server time to start
sleep 2

# Test initialization
echo '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}},"id":1}' | nc localhost 3000

# List tools
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}' | nc localhost 3000


# Kill server
kill $SERVER_PID

echo "Test complete!"