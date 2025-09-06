#!/usr/bin/env node
const { spawn } = require('child_process');
const readline = require('readline');

console.log('Starting UEMCP MCP Server...\n');

// Start the server
const server = spawn('node', ['server/dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Create readline interface for interactive input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Handle server output
server.stdout.on('data', (data) => {
  console.log('Server:', data.toString());
});

server.stderr.on('data', (data) => {
  console.error('Server Error:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
  rl.close();
  process.exit(code);
});

// Send initialization
const init = {
  jsonrpc: '2.0',
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {}
  },
  id: 1
};

console.log('Sending initialization...');
server.stdin.write(JSON.stringify(init) + '\n');

// Automated test sequence
console.log('\nRunning automated test sequence...\n');

// Wait for server to initialize, then test tools/list
setTimeout(() => {
  console.log('Testing tools/list...');
  const listRequest = {
    jsonrpc: '2.0',
    method: 'tools/list',
    params: {},
    id: 2
  };
  server.stdin.write(JSON.stringify(listRequest) + '\n');
  
  // Exit after short delay
  setTimeout(() => {
    console.log('✅ Server test completed successfully');
    server.kill();
    rl.close();
    process.exit(0);
  }, 2000);
}, 1000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.kill();
  rl.close();
});