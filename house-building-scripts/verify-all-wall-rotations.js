#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function verifyAllWallRotations() {
    console.log('🔍 Verifying All Wall Rotations\n');
    
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

    // Check and fix all wall rotations
    const verifyCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

print("WALL ROTATION VERIFICATION & CORRECTION")
print("=" * 70)

# Expected rotations
expected_rotations = {
    'North': 270,  # or -90
    'South': 90,
    'East': 180,
    'West': 0
}

# Track walls by side
walls_by_side = {
    'North': [],
    'South': [],
    'East': [],
    'West': []
}

# Find all walls
for actor in all_actors:
    try:
        label = actor.get_actor_label()
        if 'Wall_' in label and 'Wall_West' not in label and 'Wall_East' not in label:
            loc = actor.get_actor_location()
            rot = actor.get_actor_rotation()
            
            # Only ground floor (Z around 140)
            if abs(loc.z - 140) < 50:
                # Determine side
                if abs(loc.x - 10260) < 50:
                    side = 'North'
                elif abs(loc.x - 11260) < 50:
                    side = 'South'
                elif abs(loc.y - 260) < 50:
                    side = 'East'
                elif abs(loc.y - 1060) < 50:
                    side = 'West'
                else:
                    continue
                
                walls_by_side[side].append({
                    'actor': actor,
                    'name': label,
                    'yaw': rot.yaw
                })
    except:
        pass

# Check and fix each side
total_fixed = 0
for side, expected_yaw in expected_rotations.items():
    walls = walls_by_side[side]
    if walls:
        print(f"\\n{side.upper()} WALLS (should be {expected_yaw}°):")
        
        for wall_info in walls:
            current_yaw = wall_info['yaw']
            name = wall_info['name']
            
            # Check if rotation is correct (handle -90 = 270 equivalence)
            yaw_correct = False
            if expected_yaw == 270:
                yaw_correct = abs(current_yaw - 270) < 1 or abs(current_yaw - (-90)) < 1
            else:
                yaw_correct = abs(current_yaw - expected_yaw) < 1
            
            if yaw_correct:
                print(f"  ✅ {name}: {current_yaw:.1f}° - Correct!")
            else:
                print(f"  ❌ {name}: {current_yaw:.1f}° - Fixing to {expected_yaw}°...")
                
                # Fix the rotation
                actor = wall_info['actor']
                new_rotation = unreal.Rotator()
                new_rotation.pitch = 0.0
                new_rotation.yaw = float(expected_yaw)
                new_rotation.roll = 0.0
                
                actor.set_actor_rotation(new_rotation, False)
                
                # Verify fix
                updated_rot = actor.get_actor_rotation()
                print(f"     Fixed! Now: {updated_rot.yaw:.1f}°")
                total_fixed += 1

if total_fixed > 0:
    print(f"\\n🔧 Fixed {total_fixed} wall rotations")
else:
    print("\\n✅ All walls have correct rotations!")

# Also check doors
print("\\n\\nDOOR CHECK:")
for actor in all_actors:
    try:
        label = actor.get_actor_label()
        if 'Door_' in label:
            loc = actor.get_actor_location()
            rot = actor.get_actor_rotation()
            
            if abs(loc.z - 140) < 50:
                # Door on south side should have same rotation as south walls (90°)
                if abs(loc.x - 11260) < 50:
                    if abs(rot.yaw - 90) < 1:
                        print(f"  ✅ {label}: {rot.yaw:.1f}° - Correct!")
                    else:
                        print(f"  ❌ {label}: {rot.yaw:.1f}° - Should be 90°")
    except:
        pass

result = "Verification complete"
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

    // Take final screenshot
    console.log('\n📸 Taking final verification screenshot...\n');
    
    // Top-down wireframe view
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

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_camera',
            arguments: {
                location: [10760, 660, 2000],
                rotation: [-90, 0, 0]  // Top-down, NO ROLL!
            }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: { width: 800, height: 800 }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('\n✅ Wall rotation verification complete!');
    
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

verifyAllWallRotations().catch(console.error);