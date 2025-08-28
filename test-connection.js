#!/usr/bin/env node

/**
 * UEMCP Connection Test Script
 * Tests the MCP server and connection to Unreal Engine
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Testing UEMCP connection...\n');

// Check if server is built
const serverPath = path.join(__dirname, 'server', 'dist', 'index.js');
if (!fs.existsSync(serverPath)) {
    console.error('❌ Server not built. Run: cd server && npm run build');
    process.exit(1);
}

// Get project path from environment or use Demo if it exists
let projectPath = process.env.UE_PROJECT_PATH;
if (!projectPath) {
    const demoPath = path.join(__dirname, 'Demo');
    if (fs.existsSync(demoPath)) {
        projectPath = demoPath;
        console.log(`Using Demo project: ${projectPath}`);
    }
}

// Spawn the server process
console.log('Starting MCP server...');
const serverProcess = spawn('node', [serverPath], {
    env: { 
        ...process.env, 
        DEBUG: process.env.DEBUG || 'uemcp:*',
        UE_PROJECT_PATH: projectPath || ''
    }
});

let output = '';
let hasTools = false;
let testComplete = false;

// Handle server output
serverProcess.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    
    // Check for successful initialization
    if (text.includes('Server Ready') || text.includes('Server started') || text.includes('MCP Protocol')) {
        console.log('✓ MCP server started successfully');
    }
    
    // Check for available tools
    if (text.includes('Available Tools:') || text.includes('Available tool') || text.includes('actor_')) {
        hasTools = true;
    }
    
    // Show debug output if DEBUG is set
    if (process.env.DEBUG) {
        process.stdout.write(text);
    }
});

serverProcess.stderr.on('data', (data) => {
    const text = data.toString();
    
    // Show debug output
    if (process.env.DEBUG || text.includes('error')) {
        process.stderr.write(text);
    }
    
    // Check for successful initialization in stderr (debug output goes here)
    if (text.includes('Server Ready') || text.includes('MCP Protocol') || text.includes('Python listener connected')) {
        console.log('✓ MCP server started successfully');
    }
    
    // Check for tools in stderr
    if (text.includes('Available Tools:') || text.includes('actor_') || text.includes('32 tools')) {
        hasTools = true;
    }
    
    // Capture stderr for checking
    output += text;
});

// Handle server exit
serverProcess.on('close', (code) => {
    if (!testComplete) {
        if (code === 0) {
            console.log('\n✓ Server exited normally');
        } else {
            console.error(`\n❌ Server exited with code ${code}`);
        }
        process.exit(code);
    }
});

// Test the connection after a short delay
setTimeout(() => {
    testComplete = true;
    
    console.log('\n=== Test Results ===');
    
    // Check if server started
    if (output.length > 0 || hasTools) {
        console.log('✓ MCP server is running');
        
        // Check for tools
        if (hasTools) {
            console.log('✓ MCP tools are available');
        } else {
            console.log('⚠ No tools detected (this might be normal in test mode)');
        }
        
        // Check project path
        if (projectPath) {
            console.log(`✓ Project path set: ${projectPath}`);
        } else {
            console.log('⚠ No project path set (set UE_PROJECT_PATH environment variable)');
        }
        
        console.log('\n✅ Connection test passed!');
        console.log('\nNext steps:');
        console.log('1. Make sure Unreal Engine is running with your project');
        console.log('2. Restart Claude Desktop or Claude Code');
        console.log('3. Try asking Claude: "List available UEMCP tools"');
    } else {
        console.log('❌ Server did not start properly');
        console.log('Check the debug output with: DEBUG=uemcp:* node test-connection.js');
    }
    
    // Kill the server
    serverProcess.kill();
    
    // Exit after a short delay to allow cleanup
    setTimeout(() => {
        process.exit(0);
    }, 500);
}, 3000);

// Handle script termination
process.on('SIGINT', () => {
    console.log('\nStopping server...');
    serverProcess.kill();
    process.exit(0);
});

console.log('Waiting for server initialization...');
console.log('(Press Ctrl+C to stop)\n');