#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function fixNorthWallRotations() {
    console.log('🔧 Fixing North Wall Rotations to 270°\n');
    
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

    // Fix north wall rotations
    const fixWallsCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

print("FIXING NORTH WALL ROTATIONS")
print("=" * 50)

north_walls_to_fix = []

# Find north walls that need fixing
for actor in all_actors:
    try:
        label = actor.get_actor_label()
        if 'Wall_North' in label:
            loc = actor.get_actor_location()
            rot = actor.get_actor_rotation()
            
            # Check if it's on the north side (X = 10260)
            if abs(loc.x - 10260) < 50:
                current_yaw = rot.yaw
                # 270° can show as -90° due to angle normalization
                if abs(current_yaw - 270) > 1 and abs(current_yaw - (-90)) > 1:
                    north_walls_to_fix.append({
                        'actor': actor,
                        'name': label,
                        'current_yaw': current_yaw
                    })
                    print(f"  Found {label} with incorrect Yaw={current_yaw:.1f}° (should be 270°)")
    except:
        pass

# Fix the rotations
if north_walls_to_fix:
    print(f"\\nFixing {len(north_walls_to_fix)} north walls...")
    
    for wall_info in north_walls_to_fix:
        actor = wall_info['actor']
        name = wall_info['name']
        
        # Create new rotation with Yaw=270° (which may display as -90°)
        new_rotation = unreal.Rotator()
        new_rotation.pitch = 0.0
        new_rotation.yaw = 270.0  # This equals -90° in normalized form
        new_rotation.roll = 0.0
        
        # Apply rotation
        actor.set_actor_rotation(new_rotation, False)
        
        # Verify
        updated_rot = actor.get_actor_rotation()
        print(f"  ✅ Fixed {name}: Yaw is now {updated_rot.yaw:.1f}°")
else:
    print("\\n✅ All north walls already have correct rotation (270°/-90°)")

# Show all wall rotations for verification
print("\\n\\nFINAL WALL ROTATIONS:")
sides = {
    'North': 10260,
    'South': 11260,
    'East': 260,
    'West': 1060
}

for side_name, expected_coord in sides.items():
    print(f"\\n{side_name} walls:")
    for actor in all_actors:
        try:
            label = actor.get_actor_label()
            if 'Wall_' in label:
                loc = actor.get_actor_location()
                rot = actor.get_actor_rotation()
                
                # Check position
                if side_name in ['North', 'South'] and abs(loc.x - expected_coord) < 50:
                    print(f"  {label}: Yaw={rot.yaw:.1f}°")
                elif side_name in ['East', 'West'] and abs(loc.y - expected_coord) < 50:
                    print(f"  {label}: Yaw={rot.yaw:.1f}°")
        except:
            pass

print("\\n\\nEXPECTED ROTATIONS:")
print("  North walls: 270° (-90°) - to face south")
print("  South walls: 90° - to face north")  
print("  East walls: 180° - to face west")
print("  West walls: 0° - to face east")

result = "North walls fixed"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: fixWallsCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot to verify
    console.log('\n📸 Taking screenshot to verify...\n');
    
    // Set good perspective view
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_camera',
            arguments: {
                location: [9800, 300, 300],
                rotation: [-10, -30, 0]  // Look at north walls from southeast
            }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {}
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('\n✅ North wall rotations fixed!');
    
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

fixNorthWallRotations().catch(console.error);