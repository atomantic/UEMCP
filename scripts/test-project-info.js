#!/usr/bin/env node
/**
 * Test script for project_info MCP tool
 * 
 * Usage: node scripts/test-project-info.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('Testing project_info MCP tool...\n');

// Start the MCP server
const serverPath = path.join(__dirname, '..', 'server', 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseBuffer = '';
let initialized = false;

// Handle server output
server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  
  // Try to parse complete JSON responses
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || ''; // Keep incomplete line
  
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('Response:', JSON.stringify(response, null, 2));
        
        // Check if initialization succeeded
        if (response.id === 1 && response.result) {
          initialized = true;
          console.log('\n✅ Server initialized successfully\n');
          
          // Now test project_info
          testProjectInfo();
        }
        
        // Check project_info response
        if (response.id === 2 && response.result) {
          console.log('\n✅ project_info test successful!\n');
          console.log('Project information received:');
          response.result.content.forEach(content => {
            console.log(content.text);
          });
          
          // Exit successfully
          server.kill();
          process.exit(0);
        }
        
        if (response.error) {
          console.error('\n❌ Error:', response.error);
          server.kill();
          process.exit(1);
        }
      } catch (e) {
        // Not a complete JSON line yet
      }
    }
  });
});

server.stderr.on('data', (data) => {
  console.error('Server Error:', data.toString());
});

server.on('close', (code) => {
  console.log(`\nServer exited with code ${code}`);
  process.exit(code);
});

// Send initialization
const init = {
  jsonrpc: '2.0',
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  },
  id: 1
};

console.log('Sending initialization...');
server.stdin.write(JSON.stringify(init) + '\n');

function testProjectInfo() {
  console.log('Testing project_info tool...');
  
  const request = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'project_info',
      arguments: {}
    },
    id: 2
  };
  
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Timeout after 10 seconds
setTimeout(() => {
  console.error('\n❌ Test timed out');
  server.kill();
  process.exit(1);
}, 10000);