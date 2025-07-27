#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const os = require('os');

// Use environment variable or default to a common location
const PROJECT_PATH = process.env.UE_PROJECT_PATH || path.join(os.homedir(), 'Documents', 'Unreal Projects', 'MyProject');
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function runDirectMCPTest() {
    console.log('🧪 UEMCP Direct MCP Test\n');
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
            name: 'List Tools',
            request: {
                jsonrpc: '2.0',
                method: 'tools/list',
                id: 2
            }
        },
        {
            name: 'Get Project Info',
            request: {
                jsonrpc: '2.0',
                method: 'tools/call',
                params: {
                    name: 'project.info',
                    arguments: {}
                },
                id: 3
            }
        }
    ];

    // Execute tests
    for (const test of tests) {
        console.log(`\n🧪 Test: ${test.name}`);
        console.log('📤 Request:', JSON.stringify(test.request, null, 2));
        
        serverProcess.stdin.write(JSON.stringify(test.request) + '\n');
        
        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Summary
    console.log('\n\n📊 Test Summary:');
    console.log(`Total responses received: ${responses.length}`);
    
    // Check if project.info worked
    const projectInfoResponse = responses.find(r => r.id === 3 && r.result);
    if (projectInfoResponse) {
        console.log('\n✅ Project Info Retrieved:');
        const content = projectInfoResponse.result.content;
        if (content && content[0]) {
            console.log(content[0].text);
        }
    }

    // Cleanup
    serverProcess.kill();
    console.log('\n\n✨ Test completed!');
}

// Run the test
runDirectMCPTest().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
});