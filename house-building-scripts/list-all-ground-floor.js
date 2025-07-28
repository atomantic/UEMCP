#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function listAllGroundFloor() {
    console.log('📋 Listing All Ground Floor Pieces\n');
    
    const serverProcess = spawn('node', [SERVER_PATH], {
        env: {
            ...process.env,
            UE_PROJECT_PATH: PROJECT_PATH
        },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let resultBuffer = '';
    serverProcess.stdout.on('data', (data) => {
        resultBuffer += data.toString();
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Initialize
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
            protocolVersion: '0.1.0',
            capabilities: {},
            clientInfo: { name: 'test', version: '1.0.0' }
        },
        id: 1
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // List all actors
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'level_actors',
            arguments: {}
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n✅ Listing complete!');
    
    serverProcess.kill();
    
    // Parse results
    const lines = resultBuffer.split('\n');
    let foundActors = false;
    
    for (const line of lines) {
        try {
            const response = JSON.parse(line);
            if (response.result?.content) {
                response.result.content.forEach(content => {
                    if (content.text && !content.text.includes('Initializing MCP server')) {
                        // Parse actor list
                        if (content.text.includes('actors in level')) {
                            console.log('\n' + content.text);
                            foundActors = true;
                        }
                    }
                });
            }
        } catch (err) {}
    }
    
    if (!foundActors) {
        console.log('\nNo actor list found in response');
    }
}

listAllGroundFloor().catch(console.error);