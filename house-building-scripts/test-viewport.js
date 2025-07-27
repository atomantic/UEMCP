#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// Use environment variable or default to a common location
const PROJECT_PATH = process.env.UE_PROJECT_PATH || '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function runViewportTest() {
    console.log('🧪 UEMCP Viewport Test\n');
    console.log('Project:', PROJECT_PATH);
    console.log('Server:', SERVER_PATH);
    console.log('\n---\n');

    // Start server with project path
    const serverProcess = spawn('node', [SERVER_PATH], {
        env: {
            ...process.env,
            DEBUG: 'uemcp:*',
            UE_PROJECT_PATH: PROJECT_PATH
        },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let responses = [];
    
    // Capture server output
    serverProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
            try {
                const response = JSON.parse(line);
                if (response.jsonrpc) {
                    responses.push(response);
                    console.log('📨 Response:', JSON.stringify(response, null, 2));
                }
            } catch (err) {
                // Not JSON, just log it
                if (!line.includes('DEBUG')) {
                    console.log('📝', line);
                }
            }
        }
    });

    serverProcess.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg.includes('INFO')) {
            console.log('✅', msg);
        } else if (msg.includes('ERROR')) {
            console.error('❌', msg);
        } else {
            console.log('🔍', msg);
        }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test sequence
    const tests = [
        {
            name: 'Initialize',
            request: {
                jsonrpc: '2.0',
                method: 'initialize',
                params: {
                    protocolVersion: '0.1.0',
                    capabilities: {},
                    clientInfo: {
                        name: 'uemcp-test',
                        version: '1.0.0'
                    }
                },
                id: 1
            }
        },
        {
            name: 'Take Viewport Screenshot',
            request: {
                jsonrpc: '2.0',
                method: 'tools/call',
                params: {
                    name: 'viewport_screenshot',
                    arguments: {
                        width: 1280,
                        height: 720,
                        compress: false
                    }
                },
                id: 2
            }
        },
        {
            name: 'List Assets',
            request: {
                jsonrpc: '2.0',
                method: 'tools/call',
                params: {
                    name: 'asset_list',
                    arguments: {
                        path: '/Game/ModularOldTown/Meshes',
                        assetType: 'StaticMesh',
                        limit: 50
                    }
                },
                id: 3
            }
        }
    ];

    // Run tests
    for (const test of tests) {
        console.log(`\n🧪 Test: ${test.name}`);
        console.log('📤 Request:', JSON.stringify(test.request, null, 2));
        
        // Send request
        serverProcess.stdin.write(JSON.stringify(test.request) + '\n');
        
        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Summary
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`\n\n📊 Test Summary:`);
    console.log(`Total responses received: ${responses.length}`);
    
    // Close server
    console.log('\n✨ Test completed!');
    serverProcess.kill();
}

runViewportTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});