#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function placeMissingWalls() {
    console.log('🏗️ UEMCP Place Missing Front Walls\n');
    
    const serverProcess = spawn('node', [SERVER_PATH], {
        env: {
            ...process.env,
            DEBUG: 'uemcp:*',
            UE_PROJECT_PATH: PROJECT_PATH
        },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    // Capture server output
    serverProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
            try {
                const response = JSON.parse(line);
                if (response.jsonrpc && response.result) {
                    console.log('\n✅ Wall placed successfully');
                    if (response.result.content) {
                        response.result.content.forEach(content => {
                            console.log(content.text);
                        });
                    }
                } else if (response.error) {
                    console.error('\n❌ Error:', response.error);
                }
            } catch (err) {
                // Not JSON
            }
        }
    });

    serverProcess.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg.includes('ERROR')) {
            console.error('❌', msg);
        }
    });

    // Wait for server to start
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

    // The front wall is at X=12840
    // Missing segments should be at Y=680 and Y=980 (between the existing pieces)
    
    console.log('\n🔨 Placing missing front wall segment 1...');
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_spawn',
            arguments: {
                assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m',
                location: [12840, 680, 80],
                rotation: [0, 0, -90], // Rotated to align with front
                name: 'Front_Wall_2',
                folder: 'Estate/House'
            }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n🔨 Placing missing front wall segment 2...');
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_spawn',
            arguments: {
                assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m',
                location: [12840, 980, 80],
                rotation: [0, 0, -90], // Rotated to align with front
                name: 'Front_Wall_3',
                folder: 'Estate/House'
            }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Save the level
    console.log('\n💾 Saving level...');
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'level_save',
            arguments: {}
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take a screenshot to verify
    console.log('\n📸 Taking screenshot...');
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {
                width: 1280,
                height: 720
            }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n✨ Completed! Check the screenshot to verify the walls are placed correctly.');
    serverProcess.kill();
}

placeMissingWalls().catch(console.error);