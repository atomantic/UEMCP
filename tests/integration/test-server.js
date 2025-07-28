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

// Interactive command loop
console.log('\nAvailable commands:');
console.log('  list - List available tools');
console.log('  exit - Exit the test client\n');

rl.on('line', (input) => {
  const [command, ...args] = input.trim().split(' ');

  switch (command) {
    case 'list':
      const listRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        params: {},
        id: 2
      };
      server.stdin.write(JSON.stringify(listRequest) + '\n');
      break;


    case 'exit':
      console.log('Exiting...');
      server.kill();
      rl.close();
      break;

    default:
      console.log('Unknown command:', command);
  }
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  server.kill();
  rl.close();
});