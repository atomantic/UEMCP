#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function fixWallsProperly() {
    console.log('🏗️ Fixing House Walls - Direct Approach\n');
    
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

    // Based on the image, I can see the exact issues:
    // 1. Bottom-right corner needs different rotation
    // 2. Gaps suggest walls are not at correct positions
    
    // Let's use python_proxy to directly manipulate actors
    console.log('\n🔧 Using Python API to fix placement issues...\n');
    
    const fixCode = `
import unreal

# Get all actors
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find our house actors by checking their names
house_actors = {}
for actor in all_actors:
    label = actor.get_actor_label()
    if any(keyword in label for keyword in ['Corner', 'Wall', 'Door', 'Foundation']):
        house_actors[label] = actor

result = {'found_actors': list(house_actors.keys())}

# Fix Corner_Back_Right rotation if found
if 'Corner_Back_Right' in house_actors:
    corner = house_actors['Corner_Back_Right']
    # Set rotation to match other corners (should be 180 degrees)
    corner.set_actor_rotation(unreal.Rotator(0, 0, 180), False)
    result['corner_fixed'] = True

# Check and fix wall positions
# Based on the pattern, walls should be at 300-unit intervals
# Foundation is at [10760, 690, 80], size appears to be 1500x900

# Expected positions for a proper rectangle:
# X range: 11340 to 12840 (1500 units)
# Y range: 80 to 1580 (1500 units, but foundation is 900 wide)
# Actually Y should be 240 to 1140 based on foundation center at 690

# Let's check actual positions
wall_positions = {}
for name, actor in house_actors.items():
    if 'Wall' in name or 'Corner' in name:
        loc = actor.get_actor_location()
        rot = actor.get_actor_rotation()
        wall_positions[name] = {
            'location': [loc.x, loc.y, loc.z],
            'rotation': [rot.roll, rot.pitch, rot.yaw]
        }

result['wall_positions'] = wall_positions

# Delete the incorrectly placed Front_Wall_2 and Front_Wall_3 I added
for name in ['Front_Wall_2', 'Front_Wall_3']:
    if name in house_actors:
        unreal.EditorLevelLibrary.destroy_actor(house_actors[name])
        result[f'deleted_{name}'] = True
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: fixCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Now let's fix the gaps by checking exact positions
    console.log('\n🔧 Analyzing wall positions for gaps...\n');
    
    const gapAnalysisCode = `
# Analyze gaps in walls
# Walls should be 300 units apart (3m modular pieces)

# Get current wall positions again
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
walls_by_side = {
    'left': [],  # X varying, Y = 80
    'right': [], # X varying, Y = 1580
    'front': [], # X = 12840, Y varying
    'back': []   # X = 11340, Y varying
}

for actor in all_actors:
    label = actor.get_actor_label()
    if 'Wall' in label:
        loc = actor.get_actor_location()
        
        # Categorize by position
        if abs(loc.y - 80) < 50:
            walls_by_side['left'].append({'name': label, 'x': loc.x, 'y': loc.y})
        elif abs(loc.y - 1580) < 50:
            walls_by_side['right'].append({'name': label, 'x': loc.x, 'y': loc.y})
        elif abs(loc.x - 12840) < 50:
            walls_by_side['front'].append({'name': label, 'x': loc.x, 'y': loc.y})
        elif abs(loc.x - 11340) < 50:
            walls_by_side['back'].append({'name': label, 'x': loc.x, 'y': loc.y})

# Sort walls by position
for side in walls_by_side:
    if side in ['left', 'right']:
        walls_by_side[side].sort(key=lambda w: w['x'])
    else:
        walls_by_side[side].sort(key=lambda w: w['y'])

result = walls_by_side

# Find gaps
gaps = []
for side, walls in walls_by_side.items():
    for i in range(len(walls) - 1):
        if side in ['left', 'right']:
            distance = walls[i+1]['x'] - walls[i]['x']
        else:
            distance = walls[i+1]['y'] - walls[i]['y']
        
        if distance > 350:  # Gap detected (should be 300)
            gaps.append({
                'side': side,
                'between': [walls[i]['name'], walls[i+1]['name']],
                'distance': distance
            })

result['gaps_found'] = gaps
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: gapAnalysisCode }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take a new screenshot
    console.log('\n📸 Taking updated screenshot...\n');
    
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
        id: 4
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
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('\n✨ Analysis complete! Check the results above.');
    serverProcess.kill();
}

fixWallsProperly().catch(console.error);