#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function fixCornerRotationsZOnly() {
    console.log('🔧 Fixing corner rotations to use Z-axis (Yaw) only\n');
    console.log('All building pieces should only rotate around Z-axis.');
    console.log('X and Y rotations should be 0.\n');
    
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

    // Check current rotations
    console.log('📊 Checking current corner rotations...\n');
    
    const checkRotationsCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

print("CURRENT CORNER ROTATIONS:")
print("=" * 70)
print(f"{'Name':20} {'Roll (X)':10} {'Pitch (Y)':10} {'Yaw (Z)':10} {'Issue':20}")
print("-" * 70)

issues_found = []

for actor in all_actors:
    label = actor.get_actor_label()
    if 'Corner' in label and ('F1' in label or 'F2' in label):
        rot = actor.get_actor_rotation()
        
        # Check if X or Y rotations are non-zero
        has_issue = False
        issue_desc = ""
        
        if abs(rot.roll) > 0.1:  # Roll is X rotation
            has_issue = True
            issue_desc += f"Roll={rot.roll:.1f}° "
        
        if abs(rot.pitch) > 0.1:  # Pitch is Y rotation
            has_issue = True
            issue_desc += f"Pitch={rot.pitch:.1f}° "
        
        status = "❌ " + issue_desc if has_issue else "✅ OK"
        
        print(f"{label:20} {rot.roll:10.1f} {rot.pitch:10.1f} {rot.yaw:10.1f} {status:20}")
        
        if has_issue:
            issues_found.append({
                'actor': actor,
                'label': label,
                'current_rot': [rot.roll, rot.pitch, rot.yaw]
            })

print(f"\\nFound {len(issues_found)} corners with X/Y rotation issues")
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: checkRotationsCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Fix rotations
    console.log('\n🔨 Fixing rotations to Z-axis only...\n');
    
    const fixRotationsCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Correct Z-axis rotations for corners (sharp angle pointing outward)
corner_z_rotations = {
    'NW': 180,   # Sharp angle points northwest
    'NE': -90,   # Sharp angle points northeast  
    'SE': 0,     # Sharp angle points southeast
    'SW': 90     # Sharp angle points southwest
}

fixed_count = 0

for actor in all_actors:
    label = actor.get_actor_label()
    if 'Corner' in label and ('F1' in label or 'F2' in label):
        current_rot = actor.get_actor_rotation()
        cardinal = label.split('_')[-1]
        
        # Get correct Z rotation
        correct_z = corner_z_rotations.get(cardinal, 0)
        
        # Check if we need to fix
        if abs(current_rot.roll) > 0.1 or abs(current_rot.pitch) > 0.1 or abs(current_rot.yaw - correct_z) > 1:
            # Set rotation with only Z axis
            new_rot = unreal.Rotator(0, 0, correct_z)  # Roll=0, Pitch=0, Yaw=correct_z
            actor.set_actor_rotation(new_rot, False)
            
            fixed_count += 1
            print(f"Fixed {label}:")
            print(f"  Was: Roll={current_rot.roll:.1f}°, Pitch={current_rot.pitch:.1f}°, Yaw={current_rot.yaw:.1f}°")
            print(f"  Now: Roll=0°, Pitch=0°, Yaw={correct_z}°")

print(f"\\n✅ Fixed {fixed_count} corner rotations")
result = f"Fixed {fixed_count} corners"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: fixRotationsCode }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify fix
    console.log('\n✅ Verifying all rotations are Z-axis only...\n');
    
    const verifyCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

print("VERIFIED CORNER ROTATIONS:")
print("=" * 60)
print(f"{'Name':20} {'Yaw (Z)':10} {'Status':10}")
print("-" * 60)

all_good = True

for actor in all_actors:
    label = actor.get_actor_label()
    if 'Corner' in label and ('F1' in label or 'F2' in label):
        rot = actor.get_actor_rotation()
        
        # Verify X and Y are zero
        if abs(rot.roll) > 0.1 or abs(rot.pitch) > 0.1:
            print(f"{label:20} {rot.yaw:10.1f} ❌ Still has X/Y rotation!")
            all_good = False
        else:
            print(f"{label:20} {rot.yaw:10.1f} ✅")

if all_good:
    print("\\n✅ All corners now use Z-axis rotation only!")
else:
    print("\\n❌ Some corners still have X/Y rotation issues")

result = "Verification complete"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: verifyCode }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Take screenshot
    console.log('\n📸 Taking screenshot...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'wireframe' }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_mode',
            arguments: { mode: 'top' }
        },
        id: 6
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {}
        },
        id: 7
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Save level
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'level_save',
            arguments: {}
        },
        id: 8
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n✅ Corner rotation fix complete!');
    console.log('\nKey points:');
    console.log('- All rotations now use Z-axis (Yaw) only');
    console.log('- X-axis (Roll) = 0°');
    console.log('- Y-axis (Pitch) = 0°');
    console.log('- Z-axis (Yaw) = Correct value for each cardinal direction');
    
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

fixCornerRotationsZOnly().catch(console.error);