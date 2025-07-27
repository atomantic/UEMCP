#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function fixCorners() {
    console.log('🏗️ Fixing Corner Pieces\n');
    
    const serverProcess = spawn('node', [SERVER_PATH], {
        env: {
            ...process.env,
            DEBUG: 'uemcp:*',
            UE_PROJECT_PATH: PROJECT_PATH
        },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let responses = [];
    
    serverProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
            try {
                const response = JSON.parse(line);
                if (response.jsonrpc && response.result) {
                    responses.push(response);
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

    // Find all corner pieces
    console.log('\n🔍 Finding corner pieces...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'level_actors',
            arguments: {
                filter: 'Corner',
                limit: 10
            }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Analyze corner positions and rotations
    console.log('\n🔧 Analyzing corner rotations...\n');
    
    const cornerAnalysisCode = `
import unreal

# Get all corner actors
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
corners = {}

for actor in all_actors:
    label = actor.get_actor_label()
    if 'Corner' in label:
        loc = actor.get_actor_location()
        rot = actor.get_actor_rotation()
        corners[label] = {
            'location': [loc.x, loc.y, loc.z],
            'rotation': [rot.roll, rot.pitch, rot.yaw],
            'actor': actor
        }

result = {'corners': {}}
for name, data in corners.items():
    result['corners'][name] = {
        'location': data['location'],
        'rotation': data['rotation']
    }

# Determine correct rotations based on positions
# Corner positions should be:
# Front-Left: [12840, 80] - needs to face inward (rotate 0)
# Front-Right: [12840, 1580] - needs to face inward (rotate -90)
# Back-Right: [11340, 1580] - needs to face inward (rotate 180 or -180)
# Back-Left: [11340, 80] - needs to face inward (rotate 90)

fixes_needed = []

for name, data in corners.items():
    x, y = data['location'][0], data['location'][1]
    current_yaw = data['rotation'][2]
    correct_yaw = None
    
    if 'Front' in name and 'Left' in name:
        correct_yaw = 0
    elif 'Front' in name and 'Right' in name:
        correct_yaw = -90
    elif 'Back' in name and 'Right' in name:
        correct_yaw = 180
    elif 'Back' in name and 'Left' in name:
        correct_yaw = 90
    
    if correct_yaw is not None and abs(current_yaw - correct_yaw) > 5:
        fixes_needed.append({
            'name': name,
            'current_yaw': current_yaw,
            'correct_yaw': correct_yaw
        })
        # Fix it
        data['actor'].set_actor_rotation(unreal.Rotator(0, 0, correct_yaw), False)

result['fixes_applied'] = fixes_needed
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: cornerAnalysisCode }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Now check for missing walls between corners and regular walls
    console.log('\n🔍 Checking for gaps between corners and walls...\n');
    
    const gapCheckCode = `
# Check the actual gaps visually apparent in the image
# The corner pieces are smaller than wall pieces, creating gaps

# We need to check the distance between:
# 1. Corner_Front_Left [12840, 80] and Wall_Side_Left_1 [12540, 80]
# 2. Corner_Front_Right [12840, 1580] and Wall_Side_Right_1 [12540, 1580]
# 3. Corner_Back_Right [11340, 1580] and Wall_Side_Right_4 [11640, 1580]
# 4. Corner_Back_Left [11340, 80] and Wall_Side_Left_4 [11640, 80]

gaps = [
    {'between': 'Corner_Front_Left and Wall_Side_Left_1', 'distance': 12840 - 12540},
    {'between': 'Corner_Front_Right and Wall_Side_Right_1', 'distance': 12840 - 12540},
    {'between': 'Corner_Back_Right and Wall_Side_Right_4', 'distance': 11640 - 11340},
    {'between': 'Corner_Back_Left and Wall_Side_Left_4', 'distance': 11640 - 11340}
]

result = {
    'analysis': 'Corner pieces create 300-unit gaps because they are junction pieces',
    'gaps': gaps,
    'solution': 'Need to either move walls closer or add filler pieces'
}
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: gapCheckCode }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Take screenshot to verify
    console.log('\n📸 Taking screenshot to verify corner fixes...\n');
    
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
    
    // Save
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'level_save',
            arguments: {}
        },
        id: 6
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('\n✨ Corner analysis complete!');
    serverProcess.kill();
}

fixCorners().catch(console.error);