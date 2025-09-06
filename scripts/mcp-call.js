#!/usr/bin/env node

// Minimal MCP stdio client to call a tool on the local server
// Usage: node scripts/mcp-call.js <tool_name> [<json_arguments>]

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration constants
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

// Get server path from environment or use default
const defaultServerPath = path.join(__dirname, '..', 'server', 'dist', 'index.js');
const serverPath = process.env.UEMCP_SERVER_PATH || defaultServerPath;

// Check if server file exists
if (!fs.existsSync(serverPath)) {
  console.error(`MCP server not found at: ${serverPath}`);
  console.error('Build the server first with: npm run build');
  if (process.env.UEMCP_SERVER_PATH) {
    console.error('Or check the UEMCP_SERVER_PATH environment variable');
  }
  process.exit(1);
}

const server = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });

let received = '';
let sent = false;
let initialized = false;

function sendInitializeRequest() {
  const initReq = {
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: '1.0.0',
      capabilities: {},
      clientInfo: { name: 'mcp-call-script', version: '1.0.0' }
    }
  };
  server.stdin.write(JSON.stringify(initReq) + '\n');
}

function sendToolCallRequest() {
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
}

// Combined stdout handler for initialization and response parsing
server.stdout.on('data', (data) => {
  const text = data.toString();
  process.stdout.write(`[server] ${text}`);
  
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
      
      // Handle initialization response
      if (msg.id === 0 && !initialized) {
        initialized = true;
        console.log('\n[MCP initialized, sending tool call...]');
        sendToolCallRequest();
      }
      // Handle tool call response
      else if (msg.id === 1 && (msg.result || msg.error)) {
        console.log(`\n[MCP response]`);
        console.log(JSON.stringify(msg, null, 2));
        server.kill();
        process.exit(0);
      }
    } catch (_) {
      // Check for server ready messages as fallback
      if (!sent && /Ready to receive MCP requests|UEMCP Server started/i.test(s)) {
        sent = true;
        setTimeout(() => {
          sendInitializeRequest();
        }, STARTUP_DELAY_MS);
      }
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
    console.error('Failed to terminate server process during timeout:', err.message); 
  }
  process.exit(2);
}, TIMEOUT_MS);

