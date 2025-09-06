#!/usr/bin/env node

// Minimal MCP stdio client to call a tool on the local server
// Usage: node scripts/mcp-call.js <tool_name> [<json_arguments>]

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration constants
const STARTUP_DELAY_MS = 500;
const TIMEOUT_MS = 15000;

// Server startup detection patterns (configurable for different server implementations)
const SERVER_READY_PATTERNS = [
  /Ready to receive MCP requests/i,
  /UEMCP Server started/i,
  /MCP server listening/i,
  /Server initialized successfully/i
];

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

// Security: Validate server path
function validateServerPath(serverPath) {
  const resolvedPath = path.resolve(serverPath);
  const projectRoot = path.resolve(__dirname, '..');
  
  // Allow paths within project directory or absolute paths to known safe locations
  if (resolvedPath.startsWith(projectRoot)) {
    return true; // Within project - safe
  }
  
  // For external paths, require they end with a reasonable server filename
  const basename = path.basename(resolvedPath);
  const validServerNames = ['index.js', 'server.js', 'mcp-server.js', 'uemcp-server.js'];
  if (validServerNames.includes(basename)) {
    return true; // External but reasonable filename
  }
  
  return false; // Potentially unsafe
}

if (!validateServerPath(serverPath)) {
  console.error(`Invalid server path: ${serverPath}`);
  console.error('Server path must be within project directory or have a valid server filename');
  process.exit(1);
}

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
let serverTerminated = false;

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

// Enhanced process termination with fallback mechanisms
function terminateServer(reason = 'unknown') {
  if (serverTerminated) {
    return;
  }
  serverTerminated = true;
  
  console.log(`[Terminating server: ${reason}]`);
  
  // Stage 1: Graceful SIGTERM
  server.kill('SIGTERM');
  
  // Stage 2: Force kill after timeout if still running
  setTimeout(() => {
    if (!server.killed && server.exitCode === null) {
      console.log('[Server still running, sending SIGKILL...]');
      server.kill('SIGKILL');
      
      // Stage 3: Final check and manual process termination
      setTimeout(() => {
        if (!server.killed && server.exitCode === null) {
          console.error('[CRITICAL: Server process may still be lingering]');
          console.error(`[Process PID: ${server.pid}]`);
        }
      }, 1000);
    }
  }, 2000);
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
        terminateServer('successful completion');
        process.exit(0);
      }
    } catch (_) {
      // Check for server ready messages as fallback using configurable patterns
      if (!sent && SERVER_READY_PATTERNS.some(pattern => pattern.test(s))) {
        sent = true;
        console.log(`[Server ready signal detected: "${s.trim()}"]`);
        setTimeout(() => {
          sendInitializeRequest();
        }, STARTUP_DELAY_MS);
      }
    }
  }
});

server.stderr.on('data', (data) => {
  const text = data.toString();
  process.stderr.write(`[server:err] ${text}`);
  
  // Also check stderr for server ready messages (in case they're logged to stderr)
  const lines = text.split('\n');
  for (const line of lines) {
    const s = line.trim();
    if (!s) continue;
    
    // Check for server ready messages using configurable patterns
    if (!sent && SERVER_READY_PATTERNS.some(pattern => pattern.test(s))) {
      sent = true;
      console.log(`[Server ready signal detected in stderr: "${s}"]`);
      setTimeout(() => {
        sendInitializeRequest();
      }, STARTUP_DELAY_MS);
      break;
    }
  }
});

server.on('error', (err) => {
  console.error('Failed to start MCP server:', err.message);
  terminateServer('server error');
  process.exit(1);
});

server.on('close', (code, signal) => {
  if (!serverTerminated) {
    console.log(`[Server closed with code ${code}, signal ${signal}]`);
  }
});

// Safety timeout with enhanced termination
setTimeout(() => {
  console.error('Timed out waiting for MCP response');
  terminateServer('timeout');
  process.exit(2);
}, TIMEOUT_MS);

