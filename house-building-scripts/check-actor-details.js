#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function checkActorDetails() {
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

    // Check specific actors with Python proxy
    console.log('\n🔍 Checking Corner_Back_Right rotation and adjacent walls...\n');
    
    const checkCode = `
import unreal

# Get specific actors
corner_back_right = unreal.EditorLevelLibrary.get_actor_reference('Corner_Back_Right')
wall_side_right_4 = unreal.EditorLevelLibrary.get_actor_reference('Wall_Side_Right_4')
back_wall_4 = unreal.EditorLevelLibrary.get_actor_reference('Back_Wall_4')
door = unreal.EditorLevelLibrary.get_actor_reference('Door')

result = {}

if corner_back_right:
    loc = corner_back_right.get_actor_location()
    rot = corner_back_right.get_actor_rotation()
    result['Corner_Back_Right'] = {
        'location': [loc.x, loc.y, loc.z],
        'rotation': [rot.roll, rot.pitch, rot.yaw],
        'bounds': str(corner_back_right.get_actor_bounds(False))
    }

if wall_side_right_4:
    loc = wall_side_right_4.get_actor_location()
    rot = wall_side_right_4.get_actor_rotation()
    result['Wall_Side_Right_4'] = {
        'location': [loc.x, loc.y, loc.z],
        'rotation': [rot.roll, rot.pitch, rot.yaw]
    }

if back_wall_4:
    loc = back_wall_4.get_actor_location()
    rot = back_wall_4.get_actor_rotation()
    result['Back_Wall_4'] = {
        'location': [loc.x, loc.y, loc.z],
        'rotation': [rot.roll, rot.pitch, rot.yaw]
    }

# Check if door exists
result['Door_exists'] = door is not None

# List all wall actors with positions
walls = []
for actor in unreal.EditorLevelLibrary.get_all_level_actors():
    name = actor.get_name()
    if 'Wall' in name or 'Corner' in name:
        loc = actor.get_actor_location()
        rot = actor.get_actor_rotation()
        walls.append({
            'name': name,
            'location': [loc.x, loc.y, loc.z],
            'rotation': [rot.roll, rot.pitch, rot.yaw]
        })

result['all_walls'] = sorted(walls, key=lambda w: (w['location'][0], w['location'][1]))
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: {
                code: checkCode
            }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n✨ Analysis complete!');
    serverProcess.kill();
}

checkActorDetails().catch(console.error);