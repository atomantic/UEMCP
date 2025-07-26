#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function fixHouseWalls() {
    console.log('🏗️ Fixing House Wall Issues\n');
    
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

    serverProcess.stderr.on('data', (data) => {
        // Suppress debug output
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

    // Based on the wireframe image, I can see the issues:
    // 1. Corner_Back_Right needs to be rotated 90 degrees
    // 2. There are gaps near Wall_Side_Right_1
    // 3. Door is missing
    
    console.log('\n🔧 Issue 1: Fixing Corner_Back_Right rotation...\n');
    
    // The corner at [11340, 1580, 80] needs to be rotated to connect properly
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_modify',
            arguments: {
                actorName: 'Corner_Back_Right',
                rotation: [0, 0, 90]  // Rotate 90 degrees to connect properly
            }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check what we have now
    console.log('\n📋 Checking current wall actors...\n');
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'level_actors',
            arguments: {
                filter: 'Wall_Side_Right',
                limit: 20
            }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // The issue is that Wall_Side_Right segments are not continuous
    // Based on coordinates: Right wall should be at Y=1580
    // We have segments at X: 12540, 12240 (window), 11940, 11640
    // Missing segment between Corner_Front_Right (12840) and Wall_Side_Right_1 (12540)
    
    console.log('\n🔧 Issue 2: Checking wall gaps...\n');
    
    // Let me check if there's a missing wall segment
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: {
                code: `
import unreal

# Get all actors and check for gaps
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
house_walls = []

for actor in all_actors:
    name = actor.get_name()
    if 'Wall' in name or 'Corner' in name or 'Door' in name:
        loc = actor.get_actor_location()
        rot = actor.get_actor_rotation()
        house_walls.append({
            'name': name,
            'x': int(loc.x),
            'y': int(loc.y),
            'z': int(loc.z),
            'yaw': int(rot.yaw)
        })

# Sort by position for easier analysis
house_walls.sort(key=lambda w: (w['x'], w['y']))

# Analyze right wall (Y=1580)
right_wall = [w for w in house_walls if w['y'] == 1580]
result = {
    'right_wall_actors': right_wall,
    'all_house_actors': house_walls
}
`
            }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Place the missing door
    console.log('\n🔧 Issue 3: Placing door in front wall...\n');
    
    // Door should be in the middle of the front wall
    // Front wall is at X=12840, between Y=680 and Y=980
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_spawn',
            arguments: {
                assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareDoor',
                location: [12840, 830, 80],  // Middle of the front wall
                rotation: [0, 0, -90],  // Rotated to face forward
                name: 'Front_Door',
                folder: 'Estate/House'
            }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take a wireframe screenshot to verify
    console.log('\n📸 Taking wireframe screenshot to verify fixes...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'wireframe' }
        },
        id: 6
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
        id: 7
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Save level
    console.log('\n💾 Saving level...\n');
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'level_save',
            arguments: {}
        },
        id: 8
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('\n✨ Fixes applied! Check the wireframe screenshot.');
    serverProcess.kill();
}

fixHouseWalls().catch(console.error);