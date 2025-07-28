#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function fixViewportAndCheckWalls() {
    console.log('🔧 Fixing Viewport and Checking Wall Rotations\n');
    
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

    // First, check current viewport rotation
    console.log('📷 Checking current viewport rotation...\n');
    
    const checkViewportCode = `
import unreal

editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
location, rotation = editor_subsystem.get_level_viewport_camera_info()

print("CURRENT VIEWPORT:")
print(f"  Location: [{location.x:.0f}, {location.y:.0f}, {location.z:.0f}]")
print(f"  Rotation: Pitch={rotation.pitch:.1f}°, Yaw={rotation.yaw:.1f}°, Roll={rotation.roll:.1f}°")

if abs(rotation.roll) > 1:
    print(f"\\n❌ WARNING: Roll is {rotation.roll:.1f}° - This creates a tilted view!")
    print("Fixing viewport rotation...")
    
    # Create proper rotation without Roll
    fixed_rotation = unreal.Rotator()
    fixed_rotation.pitch = rotation.pitch
    fixed_rotation.yaw = rotation.yaw
    fixed_rotation.roll = 0.0  # Reset Roll to 0
    
    editor_subsystem.set_level_viewport_camera_info(location, fixed_rotation)
    
    # Verify fix
    new_loc, new_rot = editor_subsystem.get_level_viewport_camera_info()
    print(f"\\nFixed rotation: Pitch={new_rot.pitch:.1f}°, Yaw={new_rot.yaw:.1f}°, Roll={new_rot.roll:.1f}°")
else:
    print("\\n✅ Viewport rotation is correct (no Roll)")

result = "Viewport checked"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: checkViewportCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Now check actual wall rotations
    console.log('\n🧱 Checking actual wall rotations...\n');
    
    const checkWallsCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

print("\\nWALL ROTATION ANALYSIS:")
print("=" * 70)

# Categorize walls by their position
walls_by_side = {
    'North': [],  # X = 10260
    'South': [],  # X = 11260
    'East': [],   # Y = 260
    'West': []    # Y = 1060
}

for actor in all_actors:
    try:
        label = actor.get_actor_label()
        if 'Wall_' in label:
            loc = actor.get_actor_location()
            rot = actor.get_actor_rotation()
            
            # Determine side based on position
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
                'name': label,
                'yaw': rot.yaw,
                'pitch': rot.pitch,
                'roll': rot.roll
            })
    except:
        pass

# Report findings
for side, walls in walls_by_side.items():
    if walls:
        print(f"\\n{side.upper()} WALLS:")
        for wall in sorted(walls, key=lambda w: w['name']):
            print(f"  {wall['name']}: Yaw={wall['yaw']:.1f}°", end='')
            if abs(wall['pitch']) > 0.1 or abs(wall['roll']) > 0.1:
                print(f" (WARNING: Pitch={wall['pitch']:.1f}°, Roll={wall['roll']:.1f}°)")
            else:
                print()
        
        # Check consistency
        yaws = [w['yaw'] for w in walls]
        if len(set([round(y) for y in yaws])) > 1:
            print(f"  ⚠️  Inconsistent rotations on {side} side!")

# Show what the correct rotations should be
print("\\n\\nCORRECT ROTATIONS (based on user feedback):")
print("  North walls: Yaw = 270° (to face south into building)")
print("  South walls: Yaw = 90° (to face north into building)")
print("  East walls: Yaw = 180° (to face west into building)")
print("  West walls: Yaw = 0° (to face east into building)")

result = "Walls analyzed"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: checkWallsCode }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Set a proper perspective view without Roll
    console.log('\n📸 Setting proper perspective view (no Roll)...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_camera',
            arguments: {
                location: [9800, -100, 400],
                rotation: [-15, 40, 0]  // Pitch, Yaw, Roll (Roll=0!)
            }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {}
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('\n✅ Viewport fixed and walls analyzed!');
    
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

fixViewportAndCheckWalls().catch(console.error);