#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function verifyCornerFix() {
    console.log('🔍 Verifying corner names and rotations...\n');
    
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

    // Verify corner names and rotations
    console.log('📊 Checking all corners...\n');
    
    const verifyCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find foundation for reference
foundation_loc = None
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation_loc = actor.get_actor_location()
        break

# Check all F1 and F2 corners
corners_f1 = []
corners_f2 = []

for actor in all_actors:
    label = actor.get_actor_label()
    if label.startswith('Corner_F1_'):
        loc = actor.get_actor_location()
        rot = actor.get_actor_rotation()
        corners_f1.append({
            'label': label,
            'location': [loc.x, loc.y, loc.z],
            'yaw': rot.yaw
        })
    elif label.startswith('Corner_F2_'):
        loc = actor.get_actor_location()
        rot = actor.get_actor_rotation()
        corners_f2.append({
            'label': label,
            'location': [loc.x, loc.y, loc.z],
            'yaw': rot.yaw
        })

# Expected rotations
expected_rotations = {
    'NW': 180,
    'NE': -90,
    'SE': 0,
    'SW': 90
}

print("FLOOR 1 CORNERS:")
print("-" * 60)
print(f"{'Name':15} {'X':8} {'Y':8} {'Z':8} {'Yaw':8} {'Expected':8} {'Status':8}")
print("-" * 60)

for corner in sorted(corners_f1, key=lambda x: x['label']):
    cardinal = corner['label'].split('_')[-1]
    expected_yaw = expected_rotations[cardinal]
    status = "✓" if abs(corner['yaw'] - expected_yaw) < 1 else "✗"
    print(f"{corner['label']:15} {corner['location'][0]:8.0f} {corner['location'][1]:8.0f} {corner['location'][2]:8.0f} {corner['yaw']:8.1f} {expected_yaw:8} {status:8}")

if corners_f2:
    print("\\nFLOOR 2 CORNERS:")
    print("-" * 60)
    print(f"{'Name':15} {'X':8} {'Y':8} {'Z':8} {'Yaw':8} {'Expected':8} {'Status':8}")
    print("-" * 60)
    
    for corner in sorted(corners_f2, key=lambda x: x['label']):
        cardinal = corner['label'].split('_')[-1]
        expected_yaw = expected_rotations[cardinal]
        status = "✓" if abs(corner['yaw'] - expected_yaw) < 1 else "✗"
        print(f"{corner['label']:15} {corner['location'][0]:8.0f} {corner['location'][1]:8.0f} {corner['location'][2]:8.0f} {corner['yaw']:8.1f} {expected_yaw:8} {status:8}")

# Summary
print(f"\\n✅ Found {len(corners_f1)} Floor 1 corners")
if corners_f2:
    print(f"✅ Found {len(corners_f2)} Floor 2 corners")

# Visual explanation of corner orientations
print("\\nCORNER ORIENTATION GUIDE:")
print("The sharp angle (exterior corner) should point outward:")
print("  NW (180°): Sharp angle points northwest ↖")
print("  NE (-90°): Sharp angle points northeast ↗")
print("  SE (0°):   Sharp angle points southeast ↘")
print("  SW (90°):  Sharp angle points southwest ↙")

result = f"Verified {len(corners_f1) + len(corners_f2)} total corners"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: verifyCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take a wireframe screenshot to see corner orientations clearly
    console.log('\n📸 Taking wireframe screenshot for visual verification...\n');
    
    // Switch to wireframe
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'wireframe' }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Screenshot
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {}
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n✅ Verification complete!');
    
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

verifyCornerFix().catch(console.error);