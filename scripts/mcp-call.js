#!/usr/bin/env node

// Minimal MCP stdio client to call a tool on the local server
// Usage: node scripts/mcp-call.js <tool_name> [<json_arguments>]

const { spawn } = require('child_process');

// Configuration constants
const STARTUP_DETECTION_PATTERN = /Ready to receive MCP requests|UEMCP Server started/i;
const STARTUP_DELAY_MS = 500;
const TIMEOUT_MS = 15000;

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

// Combined stdout handler for both startup detection and response parsing
server.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(`[server] ${text}`);
  
  // Send request shortly after startup logs appear
  if (!sent && STARTUP_DETECTION_PATTERN.test(text)) {
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
    }, STARTUP_DELAY_MS);
  }
  
  // Accumulate response data and try to parse JSON-RPC responses
  received += text;
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

server.stderr.on('data', (data) => {
  process.stderr.write(`[server:err] ${data.toString()}`);
});

server.on('error', (err) => {
  console.error('Failed to start MCP server:', err.message);
  process.exit(1);
});

// Safety timeout
setTimeout(() => {
  console.error('Timed out waiting for MCP response');
  try { 
    server.kill(); 
  } catch (err) { 
    console.error('Error killing server:', err.message); 
  }
  process.exit(2);
}, TIMEOUT_MS);

