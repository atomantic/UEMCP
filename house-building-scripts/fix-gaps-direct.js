#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function fixGapsDirect() {
    console.log('🏗️ Direct Gap Fix Using Actor Modify\n');
    
    const serverProcess = spawn('node', [SERVER_PATH], {
        env: {
            ...process.env,
            DEBUG: 'uemcp:*',
            UE_PROJECT_PATH: PROJECT_PATH
        },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
            try {
                const response = JSON.parse(line);
                if (response.jsonrpc && response.result) {
                    if (response.result.content) {
                        response.result.content.forEach(content => {
                            console.log(content.text);
                        });
                    }
                }
            } catch (err) {}
        }
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

    // First, delete the overlapping walls
    console.log('\n🗑️ Removing overlapping walls...\n');
    
    const wallsToDelete = ['Front_Wall_2', 'Front_Wall_3'];
    for (let i = 0; i < wallsToDelete.length; i++) {
        serverProcess.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
                name: 'actor_delete',
                arguments: {
                    actorName: wallsToDelete[i]
                }
            },
            id: 2 + i
        }) + '\n');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Now reposition walls to eliminate gaps
    // Corner pieces are ~100x100, so walls need to be inset by 100 units
    console.log('\n🔧 Repositioning walls to connect seamlessly...\n');
    
    // Left side walls (Y=80) - move inward by 100 from corners
    const leftWallFixes = [
        { name: 'Wall_Side_Left_4', location: [11440, 80, 80] },
        { name: 'Wall_Side_Left_3', location: [11740, 80, 80] },
        { name: 'Wall_Side_Left_2_Window', location: [12040, 80, 80] },
        { name: 'Wall_Side_Left_1', location: [12340, 80, 80] }
    ];
    
    // Right side walls (Y=1580) - same X positions as left
    const rightWallFixes = [
        { name: 'Wall_Side_Right_4', location: [11440, 1580, 80] },
        { name: 'Wall_Side_Right_3', location: [11740, 1580, 80] },
        { name: 'Wall_Side_Right_2_Window', location: [12040, 1580, 80] },
        { name: 'Wall_Side_Right_1', location: [12340, 1580, 80] }
    ];
    
    // Back walls (X=11340) - move inward by 100 from corners
    const backWallFixes = [
        { name: 'Back_Wall_1', location: [11340, 180, 80] },
        { name: 'Back_Wall_2', location: [11340, 480, 80] },
        { name: 'Back_Wall_3', location: [11340, 780, 80] },
        { name: 'Back_Wall_4', location: [11340, 1080, 80] }
    ];
    
    // Front walls - only two pieces with door in middle
    const frontWallFixes = [
        { name: 'Front_Wall_Left', location: [12840, 180, 80] },
        { name: 'Front_Wall_Right', location: [12840, 1080, 80] }
    ];
    
    // Apply all fixes
    const allFixes = [...leftWallFixes, ...rightWallFixes, ...backWallFixes, ...frontWallFixes];
    let id = 10;
    
    for (const fix of allFixes) {
        console.log(`Moving ${fix.name} to ${fix.location}`);
        serverProcess.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
                name: 'actor_modify',
                arguments: {
                    actorName: fix.name,
                    location: fix.location
                }
            },
            id: id++
        }) + '\n');
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Move the door to center of front wall
    console.log('\n🚪 Repositioning door...\n');
    
    // Try both possible door names
    const doorNames = ['Door', 'Front_Door', 'Front_Door_Center'];
    for (const doorName of doorNames) {
        serverProcess.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
                name: 'actor_modify',
                arguments: {
                    actorName: doorName,
                    location: [12840, 630, 80]  // Centered between walls
                }
            },
            id: id++
        }) + '\n');
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Take final screenshot
    console.log('\n📸 Taking final screenshot...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {
                width: 1920,
                height: 1080,
                compress: false
            }
        },
        id: id++
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Save
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'level_save',
            arguments: {}
        },
        id: id++
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('\n✨ Gap fix complete! Check the screenshot.');
    serverProcess.kill();
}

fixGapsDirect().catch(console.error);