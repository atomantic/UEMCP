#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function finalRotationCheck() {
    console.log('🔍 Final Rotation Check and Fix\n');
    
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

    // Final check of all pieces
    const finalCheckCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

print("FINAL ROTATION CHECK - ALL GROUND FLOOR PIECES")
print("=" * 70)

# Expected rotations based on position
def get_expected_rotation(label, x, y):
    # Corners
    if 'Corner_F1_NW' in label:
        return 180
    elif 'Corner_F1_NE' in label:
        return -90
    elif 'Corner_F1_SE' in label:
        return 0
    elif 'Corner_F1_SW' in label:
        return 90
    
    # Walls and doors based on position
    if abs(x - 10260) < 50:  # North side
        return 270  # or -90
    elif abs(x - 11260) < 50:  # South side
        return 90
    elif abs(y - 260) < 50:  # East side
        return 180
    elif abs(y - 1060) < 50:  # West side
        return 0
    
    return None

# Check all ground floor pieces
ground_pieces = []
for actor in all_actors:
    try:
        label = actor.get_actor_label()
        loc = actor.get_actor_location()
        
        # Ground floor check
        if abs(loc.z - 140) < 50 and any(x in label for x in ['Corner_F1', 'Wall_', 'Door_']):
            rot = actor.get_actor_rotation()
            expected = get_expected_rotation(label, loc.x, loc.y)
            
            ground_pieces.append({
                'actor': actor,
                'name': label,
                'x': loc.x,
                'y': loc.y,
                'current_yaw': rot.yaw,
                'expected_yaw': expected
            })
    except:
        pass

# Sort by position for better display
ground_pieces.sort(key=lambda p: (p['x'], p['y']))

# Check and fix each piece
fixes_needed = 0
for piece in ground_pieces:
    name = piece['name']
    current = piece['current_yaw']
    expected = piece['expected_yaw']
    
    if expected is not None:
        # Check if correct (handle -90 = 270 equivalence)
        is_correct = False
        if expected == 270:
            is_correct = abs(current - 270) < 1 or abs(current - (-90)) < 1
        elif expected == -90:
            is_correct = abs(current - 270) < 1 or abs(current - (-90)) < 1
        else:
            is_correct = abs(current - expected) < 1
        
        status = "✅" if is_correct else "❌"
        print(f"{status} {name}: Yaw={current:.1f}° ", end='')
        
        if not is_correct:
            print(f"(should be {expected}°) - FIXING...", end='')
            
            # Fix it
            actor = piece['actor']
            new_rotation = unreal.Rotator()
            new_rotation.pitch = 0.0
            new_rotation.yaw = float(expected)
            new_rotation.roll = 0.0
            
            actor.set_actor_rotation(new_rotation, False)
            
            # Verify
            updated_rot = actor.get_actor_rotation()
            print(f" Fixed to {updated_rot.yaw:.1f}°")
            fixes_needed += 1
        else:
            print(f"(correct)")

print(f"\\n{'='*70}")
if fixes_needed > 0:
    print(f"Fixed {fixes_needed} rotations")
else:
    print("✅ ALL ROTATIONS CORRECT!")

# Summary by type
print("\\nSUMMARY BY TYPE:")
print("  Corners: All should use only Z-axis rotation")
print("  North walls/doors: 270° (-90°)")
print("  South walls/doors: 90°")
print("  East walls/doors: 180°")
print("  West walls/doors: 0°")

result = f"Check complete - {fixes_needed} fixes applied"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: finalCheckCode }
        },
        id: 2
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
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n✅ Final rotation check complete and level saved!');
    
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

finalRotationCheck().catch(console.error);