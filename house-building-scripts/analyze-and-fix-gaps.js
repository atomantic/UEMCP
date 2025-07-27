#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function analyzeAndFixGaps() {
    console.log('🔍 Analyzing wall gaps and corner rotations...\n');
    
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

    // Analyze current state
    console.log('📊 Analyzing current actor positions...\n');
    
    const analyzeCode = `
import unreal

# Get all actors
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find foundation
foundation_loc = None
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation_loc = actor.get_actor_location()
        break

# Collect house actors
corners = []
walls = []

for actor in all_actors:
    label = actor.get_actor_label()
    if 'Corner_GF' in label:
        loc = actor.get_actor_location()
        rot = actor.get_actor_rotation()
        corners.append({
            'label': label,
            'actor': actor,
            'location': [loc.x, loc.y, loc.z],
            'rotation': [rot.roll, rot.pitch, rot.yaw]
        })
    elif 'Wall_' in label and 'SF' not in label:  # Ground floor walls only
        loc = actor.get_actor_location()
        rot = actor.get_actor_rotation()
        walls.append({
            'label': label,
            'actor': actor,
            'location': [loc.x, loc.y, loc.z],
            'rotation': [rot.roll, rot.pitch, rot.yaw]
        })

# Expected positions for a 10m x 8m house
# Foundation at [10760, 660, 80]
# House dimensions: 1000cm x 800cm
# Corners at: 
#   Front-Left: [10260, 260, 140]
#   Front-Right: [11260, 260, 140]
#   Back-Right: [11260, 1060, 140]
#   Back-Left: [10260, 1060, 140]

expected_corners = {
    'Corner_GF_Front_Left': {
        'location': [10260, 260, 140],
        'rotation': [0, 0, 0]
    },
    'Corner_GF_Front_Right': {
        'location': [11260, 260, 140],
        'rotation': [0, 0, -90]
    },
    'Corner_GF_Back_Right': {
        'location': [11260, 1060, 140],
        'rotation': [0, 0, 180]
    },
    'Corner_GF_Back_Left': {
        'location': [10260, 1060, 140],
        'rotation': [0, 0, 90]
    }
}

# Fix corners
fixed_corners = 0
for corner in corners:
    label = corner['label']
    if label in expected_corners:
        expected = expected_corners[label]
        actor = corner['actor']
        
        # Check if position is wrong
        current_loc = corner['location']
        expected_loc = expected['location']
        if abs(current_loc[0] - expected_loc[0]) > 5 or abs(current_loc[1] - expected_loc[1]) > 5:
            # Fix position
            actor.set_actor_location(unreal.Vector(expected_loc[0], expected_loc[1], expected_loc[2]))
            print(f"Fixed position of {label}")
            fixed_corners += 1
        
        # Check if rotation is wrong
        current_rot = corner['rotation'][2]  # Yaw
        expected_rot = expected['rotation'][2]
        if abs(current_rot - expected_rot) > 5:
            # Fix rotation
            actor.set_actor_rotation(unreal.Rotator(0, 0, expected_rot))
            print(f"Fixed rotation of {label}")
            fixed_corners += 1

# Analyze wall positions
# Walls should connect seamlessly between corners
# Front wall: Y=260, X from 360 to 1160 (excluding corners)
# Back wall: Y=1060, X from 360 to 1160
# West wall: X=260, Y from 360 to 960
# East wall: X=1260, Y from 360 to 960

wall_issues = []
for wall in walls:
    label = wall['label']
    loc = wall['location']
    
    # Determine expected position based on wall type
    if 'Front' in label:
        expected_y = 260
        if abs(loc[1] - expected_y) > 5:
            wall_issues.append({
                'actor': wall['actor'],
                'label': label,
                'issue': f'Y position is {loc[1]}, should be {expected_y}'
            })
    elif 'Back' in label:
        expected_y = 1060
        if abs(loc[1] - expected_y) > 5:
            wall_issues.append({
                'actor': wall['actor'],
                'label': label,
                'issue': f'Y position is {loc[1]}, should be {expected_y}'
            })
    elif 'West' in label:
        expected_x = 10260
        if abs(loc[0] - expected_x) > 5:
            wall_issues.append({
                'actor': wall['actor'],
                'label': label,
                'issue': f'X position is {loc[0]}, should be {expected_x}'
            })
    elif 'East' in label:
        expected_x = 11260
        if abs(loc[0] - expected_x) > 5:
            wall_issues.append({
                'actor': wall['actor'],
                'label': label,
                'issue': f'X position is {loc[0]}, should be {expected_x}'
            })

result = {
    'corners_found': len(corners),
    'walls_found': len(walls),
    'fixed_corners': fixed_corners,
    'wall_issues': len(wall_issues)
}

# Save detailed data for next step
import json
with open('/tmp/wall_analysis.json', 'w') as f:
    json.dump({
        'corners': [{'label': c['label'], 'location': c['location'], 'rotation': c['rotation']} for c in corners],
        'walls': [{'label': w['label'], 'location': w['location'], 'rotation': w['rotation']} for w in walls],
        'issues': [{'label': i['label'], 'issue': i['issue']} for i in wall_issues]
    }, f, indent=2)
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
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fix wall positions
    console.log('\n🔧 Fixing wall positions...\n');
    
    const fixWallsCode = `
import unreal
import json

# Load analysis data
with open('/tmp/wall_analysis.json', 'r') as f:
    data = json.load(f)

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
fixed_count = 0

# Expected wall positions for seamless connection
# Assuming walls are 300cm (3m) or 200cm (2m) wide with center pivot
# Corner is 100x100, so walls start 100 units from corner center

wall_positions = {
    # Front walls (Y=260)
    'Wall_Front_1': [10460, 260, 140],  # 2m wall
    'Wall_Front_2': [10760, 260, 140],  # 3m wall  
    'Wall_Front_3': [11060, 260, 140],  # 2m wall
    
    # Back walls (Y=1060)
    'Wall_Back_1': [10460, 1060, 140],  # 2m wall
    'Wall_Back_2': [10760, 1060, 140],  # 3m wall
    'Wall_Back_3': [11060, 1060, 140],  # 2m wall
    
    # West walls (X=260, rotated 90)
    'Wall_West_1': [10260, 460, 140],   # 2m wall
    'Wall_West_2': [10260, 660, 140],   # 3m wall
    'Wall_West_3': [10260, 960, 140],   # 2m wall
    
    # East walls (X=1260, rotated 90)
    'Wall_East_1': [11260, 460, 140],   # 2m wall
    'Wall_East_2': [11260, 660, 140],   # 3m wall
    'Wall_East_3': [11260, 960, 140],   # 2m wall
}

# Fix each wall
for actor in all_actors:
    label = actor.get_actor_label()
    if label in wall_positions:
        expected_pos = wall_positions[label]
        current_loc = actor.get_actor_location()
        
        # Check if position needs fixing
        if (abs(current_loc.x - expected_pos[0]) > 5 or 
            abs(current_loc.y - expected_pos[1]) > 5 or
            abs(current_loc.z - expected_pos[2]) > 5):
            
            actor.set_actor_location(unreal.Vector(expected_pos[0], expected_pos[1], expected_pos[2]))
            fixed_count += 1
            print(f"Fixed position of {label} to {expected_pos}")
        
        # Fix rotation for side walls
        if 'West' in label or 'East' in label:
            current_rot = actor.get_actor_rotation()
            if abs(current_rot.yaw - 90) > 5 and abs(current_rot.yaw + 90) > 5:
                actor.set_actor_rotation(unreal.Rotator(0, 0, 90))
                print(f"Fixed rotation of {label}")

result = f"Fixed {fixed_count} wall positions"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: fixWallsCode }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Add missing walls if needed
    console.log('\n➕ Checking for missing walls...\n');
    
    const checkMissingCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
existing_walls = set()

for actor in all_actors:
    label = actor.get_actor_label()
    if 'Wall_' in label and 'SF' not in label:
        existing_walls.add(label)

# Expected walls
expected_walls = [
    'Wall_Front_1', 'Wall_Front_2', 'Wall_Front_3',
    'Wall_Back_1', 'Wall_Back_2', 'Wall_Back_3',
    'Wall_West_1', 'Wall_West_2', 'Wall_West_3',
    'Wall_East_1', 'Wall_East_2', 'Wall_East_3'
]

missing = []
for wall in expected_walls:
    if wall not in existing_walls:
        missing.append(wall)

result = {
    'existing': len(existing_walls),
    'expected': len(expected_walls),
    'missing': missing
}
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: checkMissingCode }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshots from multiple angles
    console.log('\n📸 Taking verification screenshots...\n');
    
    // Top-down view
    const topViewCode = `
import unreal
editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
camera_location = unreal.Vector(10760, 660, 1500)
camera_rotation = unreal.Rotator(-90, 0, 0)
editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)
result = "Set top-down view"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: topViewCode }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Wireframe mode
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'wireframe' }
        },
        id: 6
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Take screenshot
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {}
        },
        id: 7
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n✅ Gap analysis and fixes complete!');
    
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

analyzeAndFixGaps().catch(console.error);