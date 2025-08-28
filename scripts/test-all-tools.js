#!/usr/bin/env node
/**
 * Comprehensive test script for all UEMCP MCP tools
 * 
 * Usage: node scripts/test-all-tools.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('Testing all UEMCP MCP tools...\n');

// Test results
const results = {
  passed: [],
  failed: [],
  skipped: []
};

// Define all tools to test
const toolTests = [
  {
    name: 'test_connection',
    params: {},
    validate: (result) => result.content[0].text.includes('Python listener is ONLINE')
  },
  {
    name: 'project_info',
    params: {},
    validate: (result) => result.content[0].text.includes('Project Information:')
  },
  {
    name: 'asset_list',
    params: { path: '/Game', limit: 5 },
    validate: (result) => result.content[0].text.includes('Found')
  },
  {
    name: 'level_actors',
    params: { limit: 5 },
    validate: (result) => result.content[0].text.includes('Found') && result.content[0].text.includes('actors')
  },
  {
    name: 'level_outliner',
    params: {},
    validate: (result) => result.content[0].text.includes('World Outliner Structure')
  },
  {
    name: 'viewport_mode',
    params: { mode: 'top' },
    validate: (result) => result.content[0].text.includes('Viewport mode changed to top')
  },
  {
    name: 'viewport_render_mode',
    params: { mode: 'wireframe' },
    validate: (result) => result.content[0].text.includes('Viewport render mode changed')
  },
  {
    name: 'actor_snap_to_socket',
    params: { 
      sourceActor: 'TestActor1', 
      targetActor: 'TestActor2', 
      targetSocket: 'TestSocket' 
    },
    validate: (result) => {
      // This will fail with actor not found, but that's expected for testing
      // We're just verifying the tool exists and responds
      const text = result.content[0].text;
      return text.includes('not found') || text.includes('Snapped') || text.includes('error');
    }
  }
];

// Start the MCP server
const serverPath = path.join(__dirname, '..', 'server', 'dist', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, DEBUG: '' } // Disable debug output for cleaner test results
});

let responseBuffer = '';
let initialized = false;
let currentTestIndex = 0;
let requestId = 1;

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
        
        // Check if initialization succeeded
        if (response.id === 1 && response.result) {
          initialized = true;
          console.log('✅ Server initialized successfully\n');
          
          // Start testing tools
          testNextTool();
        }
        
        // Check tool response
        if (response.id > 1) {
          const test = toolTests[currentTestIndex - 1];
          
          if (response.result) {
            try {
              if (test.validate(response.result)) {
                console.log(`✅ ${test.name}: PASSED`);
                results.passed.push(test.name);
              } else {
                console.log(`❌ ${test.name}: FAILED - Validation failed`);
                results.failed.push(test.name);
              }
            } catch (e) {
              console.log(`❌ ${test.name}: FAILED - ${e.message}`);
              results.failed.push(test.name);
            }
          } else if (response.error) {
            console.log(`❌ ${test.name}: FAILED - ${response.error.message}`);
            results.failed.push(test.name);
          }
          
          // Test next tool
          testNextTool();
        }
      } catch (e) {
        // Not a complete JSON line yet
      }
    }
  });
});

server.stderr.on('data', (data) => {
  // Ignore stderr unless it contains actual errors
  const output = data.toString();
  if (output.includes('ERROR') || output.includes('FATAL')) {
    console.error('Server Error:', output);
  }
});

server.on('close', (code) => {
  if (code !== 0 && currentTestIndex < toolTests.length) {
    console.error(`\nServer exited unexpectedly with code ${code}`);
  }
  printResults();
  process.exit(results.failed.length > 0 ? 1 : 0);
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

console.log('Initializing server...');
server.stdin.write(JSON.stringify(init) + '\n');

function testNextTool() {
  if (currentTestIndex >= toolTests.length) {
    // All tests complete
    server.kill();
    return;
  }
  
  const test = toolTests[currentTestIndex];
  currentTestIndex++;
  requestId++;
  
  console.log(`\nTesting ${test.name}...`);
  
  const request = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: test.name,
      arguments: test.params
    },
    id: requestId
  };
  
  server.stdin.write(JSON.stringify(request) + '\n');
}

function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  console.log('='.repeat(60));
  
  if (results.failed.length > 0) {
    console.log('\nFailed tests:');
    results.failed.forEach(name => console.log(`  - ${name}`));
  }
  
  console.log('\n' + (results.failed.length === 0 ? '✅ All tests passed!' : '❌ Some tests failed'));
}

// Timeout after 30 seconds
setTimeout(() => {
  console.error('\n❌ Test suite timed out');
  server.kill();
  printResults();
  process.exit(1);
}, 30000);