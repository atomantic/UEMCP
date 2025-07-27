#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function fixCornerCardinalSwap() {
    console.log('🔧 Fixing corner cardinal directions (swapping E and W)...\n');
    
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

    // Fix the cardinal directions
    console.log('🏷️  Fixing corner names with correct cardinal directions...\n');
    
    const fixCardinalCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find foundation for reference
foundation_loc = None
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation_loc = actor.get_actor_location()
        break

if not foundation_loc:
    result = "ERROR: Could not find foundation"
else:
    # Correct mapping based on UE coordinate system:
    # X+ = EAST, X- = WEST
    # Y+ = SOUTH, Y- = NORTH
    
    fixed_count = 0
    
    # Fix Floor 1 corners
    for actor in all_actors:
        label = actor.get_actor_label()
        if label.startswith('Corner_F1_'):
            loc = actor.get_actor_location()
            
            # Determine correct cardinal position
            if loc.x < foundation_loc.x and loc.y < foundation_loc.y:
                correct_cardinal = "NW"  # West + North
            elif loc.x > foundation_loc.x and loc.y < foundation_loc.y:
                correct_cardinal = "NE"  # East + North
            elif loc.x > foundation_loc.x and loc.y > foundation_loc.y:
                correct_cardinal = "SE"  # East + South
            else:  # loc.x < foundation_loc.x and loc.y > foundation_loc.y
                correct_cardinal = "SW"  # West + South
            
            new_name = f"Corner_F1_{correct_cardinal}"
            if label != new_name:
                old_name = label
                actor.set_actor_label(new_name)
                fixed_count += 1
                print(f"Fixed {old_name} -> {new_name}")
    
    # Fix Floor 2 corners
    for actor in all_actors:
        label = actor.get_actor_label()
        if label.startswith('Corner_F2_'):
            loc = actor.get_actor_location()
            
            # Determine correct cardinal position
            if loc.x < foundation_loc.x and loc.y < foundation_loc.y:
                correct_cardinal = "NW"  # West + North
            elif loc.x > foundation_loc.x and loc.y < foundation_loc.y:
                correct_cardinal = "NE"  # East + North
            elif loc.x > foundation_loc.x and loc.y > foundation_loc.y:
                correct_cardinal = "SE"  # East + South
            else:  # loc.x < foundation_loc.x and loc.y > foundation_loc.y
                correct_cardinal = "SW"  # West + South
            
            new_name = f"Corner_F2_{correct_cardinal}"
            if label != new_name:
                old_name = label
                actor.set_actor_label(new_name)
                fixed_count += 1
                print(f"Fixed {old_name} -> {new_name}")
    
    result = f"Fixed {fixed_count} corner names"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: fixCardinalCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify the fix
    console.log('\n📊 Verifying corrected names...\n');
    
    const verifyCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find foundation
foundation_loc = None
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation_loc = actor.get_actor_location()
        break

print("VERIFIED CORNER POSITIONS:")
print("-" * 60)

for actor in all_actors:
    label = actor.get_actor_label()
    if label.startswith('Corner_F1_'):
        loc = actor.get_actor_location()
        x_dir = "EAST" if loc.x > foundation_loc.x else "WEST"
        y_dir = "SOUTH" if loc.y > foundation_loc.y else "NORTH"
        cardinal = label.split('_')[-1]
        print(f"{label}: at {y_dir}-{x_dir} (X={loc.x:.0f}, Y={loc.y:.0f})")

result = "Verification complete"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: verifyCode }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Save level
    console.log('\n💾 Saving level...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'level_save',
            arguments: {}
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n✅ Cardinal direction fix complete!');
    console.log('\nCorrected mappings:');
    console.log('- NW corner: North-West (X-, Y-)');
    console.log('- NE corner: North-East (X+, Y-)');
    console.log('- SE corner: South-East (X+, Y+)');
    console.log('- SW corner: South-West (X-, Y+)');
    
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

fixCornerCardinalSwap().catch(console.error);