#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function analyzeActualState() {
    console.log('🔍 Analyzing actual ground floor state...\n');
    
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

    // Get detailed information about all ground floor pieces
    console.log('📊 Getting ground floor actor details...\n');
    
    const analyzeCode = `
import unreal
import math

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find foundation for reference
foundation_loc = None
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation_loc = actor.get_actor_location()
        print(f"Foundation at: [{foundation_loc.x}, {foundation_loc.y}, {foundation_loc.z}]")
        break

# Collect all ground floor pieces
ground_floor_actors = []
for actor in all_actors:
    label = actor.get_actor_label()
    loc = actor.get_actor_location()
    
    # Ground floor is around Z=140
    if loc.z > 100 and loc.z < 200:
        if ('Wall_' in label or 'Corner_' in label or 'Door_' in label) and 'SF' not in label:
            rot = actor.get_actor_rotation()
            ground_floor_actors.append({
                'label': label,
                'location': [loc.x, loc.y, loc.z],
                'rotation': [rot.roll, rot.pitch, rot.yaw]
            })

# Sort by type
corners = []
walls = []
doors = []

for actor in ground_floor_actors:
    if 'Corner' in actor['label']:
        corners.append(actor)
    elif 'Door' in actor['label']:
        doors.append(actor)
    else:
        walls.append(actor)

print(f"\\nFound {len(corners)} corners, {len(walls)} walls, {len(doors)} doors")

# Analyze corners
print("\\nCORNER ANALYSIS:")
print("-" * 50)
for corner in sorted(corners, key=lambda x: (x['location'][1], x['location'][0])):
    print(f"{corner['label']:25} at [{corner['location'][0]:6.0f}, {corner['location'][1]:6.0f}] rot: {corner['rotation'][2]:6.1f}°")

# Expected corner positions and rotations for proper connection
# Based on 10m x 8m house (1000 x 800 units)
print("\\nEXPECTED vs ACTUAL:")
print("-" * 50)

# Corner pieces are 100x100 with center pivot
# For a house centered at foundation (10760, 660):
# - Half width = 500, Half depth = 400
# - Corners should be at foundation ± (500, 400)

expected_corners = {
    'Front-Left': {
        'pos': [foundation_loc.x - 500, foundation_loc.y - 400, 140],
        'rot': 0
    },
    'Front-Right': {
        'pos': [foundation_loc.x + 500, foundation_loc.y - 400, 140],
        'rot': -90
    },
    'Back-Right': {
        'pos': [foundation_loc.x + 500, foundation_loc.y + 400, 140],
        'rot': 180
    },
    'Back-Left': {
        'pos': [foundation_loc.x - 500, foundation_loc.y + 400, 140],
        'rot': 90
    }
}

for pos_name, expected in expected_corners.items():
    print(f"{pos_name:12} should be at [{expected['pos'][0]:6.0f}, {expected['pos'][1]:6.0f}] rot: {expected['rot']:4}°")

# Analyze walls
print("\\nWALL ANALYSIS:")
print("-" * 50)

# Group walls by side
front_walls = []
back_walls = []
left_walls = []
right_walls = []

for wall in walls:
    loc = wall['location']
    if loc[1] < foundation_loc.y - 200:  # Front
        front_walls.append(wall)
    elif loc[1] > foundation_loc.y + 200:  # Back
        back_walls.append(wall)
    elif loc[0] < foundation_loc.x - 200:  # Left
        left_walls.append(wall)
    else:  # Right
        right_walls.append(wall)

print(f"Front walls: {len(front_walls)}")
for w in sorted(front_walls, key=lambda x: x['location'][0]):
    print(f"  {w['label']:20} at X={w['location'][0]:6.0f} Y={w['location'][1]:6.0f}")

print(f"\\nBack walls: {len(back_walls)}")
for w in sorted(back_walls, key=lambda x: x['location'][0]):
    print(f"  {w['label']:20} at X={w['location'][0]:6.0f} Y={w['location'][1]:6.0f}")

print(f"\\nLeft walls: {len(left_walls)}")
for w in sorted(left_walls, key=lambda x: x['location'][1]):
    print(f"  {w['label']:20} at X={w['location'][0]:6.0f} Y={w['location'][1]:6.0f}")

print(f"\\nRight walls: {len(right_walls)}")
for w in sorted(right_walls, key=lambda x: x['location'][1]):
    print(f"  {w['label']:20} at X={w['location'][0]:6.0f} Y={w['location'][1]:6.0f}")

# Check for gaps
print("\\nGAP ANALYSIS:")
print("-" * 50)

# For proper connection:
# - Corners at foundation ± (500, 400)
# - Front/Back walls Y should be foundation.y ± 400
# - Left/Right walls X should be foundation.x ± 500

issues = []

# Check front wall alignment
front_y_expected = foundation_loc.y - 400
for w in front_walls:
    if abs(w['location'][1] - front_y_expected) > 5:
        issues.append(f"{w['label']} is at Y={w['location'][1]}, should be Y={front_y_expected}")

# Check back wall alignment  
back_y_expected = foundation_loc.y + 400
for w in back_walls:
    if abs(w['location'][1] - back_y_expected) > 5:
        issues.append(f"{w['label']} is at Y={w['location'][1]}, should be Y={back_y_expected}")

# Check side wall alignment
left_x_expected = foundation_loc.x - 500
for w in left_walls:
    if abs(w['location'][0] - left_x_expected) > 5:
        issues.append(f"{w['label']} is at X={w['location'][0]}, should be X={left_x_expected}")

right_x_expected = foundation_loc.x + 500
for w in right_walls:
    if abs(w['location'][0] - right_x_expected) > 5:
        issues.append(f"{w['label']} is at X={w['location'][0]}, should be X={right_x_expected}")

for issue in issues:
    print(f"❌ {issue}")

result = {
    'corners': len(corners),
    'walls': len(walls),
    'doors': len(doors),
    'issues': len(issues)
}
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: analyzeCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n✅ Analysis complete!');
    
    serverProcess.kill();
    
    // Parse results
    const lines = resultBuffer.split('\n');
    for (const line of lines) {
        try {
            const response = JSON.parse(line);
            if (response.result?.content) {
                response.result.content.forEach(content => {
                    if (content.text && !content.text.includes('Initializing MCP server')) {
                        console.log('\n' + content.text);
                    }
                });
            }
        } catch (err) {}
    }
}

analyzeActualState().catch(console.error);