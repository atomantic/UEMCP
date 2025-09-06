#!/usr/bin/env node

// Minimal MCP stdio client to call a tool on the local server
// Usage: node scripts/mcp-call.js <tool_name> [<json_arguments>]

const { spawn } = require('child_process');

const toolName = process.argv[2];
const argJson = process.argv[3] || '{}';

if (!toolName) {
  console.error('Usage: node scripts/mcp-call.js <tool_name> [<json_arguments>]');
  process.exit(1);
}

let args;
try {
  args = JSON.parse(argJson);
} catch (e) {
  console.error('Invalid JSON for arguments:', e.message);
  process.exit(1);
}

const serverPath = require('path').join(__dirname, '..', 'server', 'dist', 'index.js');
const server = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });

let received = '';
let sent = false;

server.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(`[server] ${text}`);
  // Send request shortly after startup logs appear
  if (!sent && /Ready to receive MCP requests|UEMCP Server started/i.test(text)) {
    sent = true;
    setTimeout(() => {
      const req = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };
      server.stdin.write(JSON.stringify(req) + '\n');
    }, 500);
  }
});

server.stderr.on('data', (data) => {
  process.stderr.write(`[server:err] ${data.toString()}`);
});

server.on('error', (err) => {
  console.error('Failed to start MCP server:', err.message);
  process.exit(1);
});

// Capture response lines from server stdout
server.stdout.on('data', (data) => {
  received += data.toString();
  // Try to parse JSON-RPC responses in the stream
  const lines = received.split('\n');
  // Keep last partial line in buffer
  received = lines.pop() || '';
  for (const line of lines) {
    const s = line.trim();
    if (!s) continue;
    try {
      const msg = JSON.parse(s);
      if (msg.id === 1 && (msg.result || msg.error)) {
        console.log(`\n[MCP response]`);
        console.log(JSON.stringify(msg, null, 2));
        server.kill();
        process.exit(0);
      }
    } catch (_) {
      // ignore non-JSON lines
    }
  }
});

// Safety timeout
setTimeout(() => {
  console.error('Timed out waiting for MCP response');
  try { server.kill(); } catch {}
  process.exit(2);
}, 15000);

