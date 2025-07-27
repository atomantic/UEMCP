#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function fixCornersFinalCardinality() {
    console.log('🔧 Fixing corner names with CORRECT UE coordinate mapping...\n');
    console.log('Coordinate System:');
    console.log('- X- = NORTH (X decreases going North)');
    console.log('- X+ = SOUTH (X increases going South)');
    console.log('- Y- = EAST (Y decreases going East)');
    console.log('- Y+ = WEST (Y increases going West)\n');
    
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

    // Fix the corner names with correct cardinality
    console.log('🏷️  Renaming corners with correct cardinal directions...\n');
    
    const fixCornerNamesCode = `
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
    # CORRECT mapping based on UE coordinate system:
    # X- = NORTH, X+ = SOUTH
    # Y- = EAST, Y+ = WEST
    
    print("Foundation at:", foundation_loc)
    print("\\nCorrecting corner names based on actual UE coordinates:")
    
    fixed_count = 0
    
    # Fix Floor 1 corners
    for actor in all_actors:
        label = actor.get_actor_label()
        if label.startswith('Corner_F1_'):
            loc = actor.get_actor_location()
            
            # Determine correct cardinal position
            # X- = North, X+ = South
            # Y- = East, Y+ = West
            if loc.x < foundation_loc.x and loc.y > foundation_loc.y:
                correct_cardinal = "NW"  # North-West
            elif loc.x < foundation_loc.x and loc.y < foundation_loc.y:
                correct_cardinal = "NE"  # North-East
            elif loc.x > foundation_loc.x and loc.y < foundation_loc.y:
                correct_cardinal = "SE"  # South-East
            else:  # loc.x > foundation_loc.x and loc.y > foundation_loc.y
                correct_cardinal = "SW"  # South-West
            
            new_name = f"Corner_F1_{correct_cardinal}"
            if label != new_name:
                old_name = label
                actor.set_actor_label(new_name)
                fixed_count += 1
                x_dir = "NORTH" if loc.x < foundation_loc.x else "SOUTH"
                y_dir = "EAST" if loc.y < foundation_loc.y else "WEST"
                print(f"Fixed {old_name} -> {new_name} (at {x_dir}-{y_dir})")
    
    # Fix Floor 2 corners
    for actor in all_actors:
        label = actor.get_actor_label()
        if label.startswith('Corner_F2_'):
            loc = actor.get_actor_location()
            
            # Same cardinal logic
            if loc.x < foundation_loc.x and loc.y > foundation_loc.y:
                correct_cardinal = "NW"
            elif loc.x < foundation_loc.x and loc.y < foundation_loc.y:
                correct_cardinal = "NE"
            elif loc.x > foundation_loc.x and loc.y < foundation_loc.y:
                correct_cardinal = "SE"
            else:
                correct_cardinal = "SW"
            
            new_name = f"Corner_F2_{correct_cardinal}"
            if label != new_name:
                old_name = label
                actor.set_actor_label(new_name)
                fixed_count += 1
                print(f"Fixed {old_name} -> {new_name}")
    
    result = f"Fixed {fixed_count} corner names with correct cardinality"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: fixCornerNamesCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify the fix
    console.log('\n📊 Verifying corrected corner positions...\n');
    
    const verifyCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find foundation
foundation_loc = None
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation_loc = actor.get_actor_location()
        break

print("VERIFIED CORNER POSITIONS (with correct UE coordinates):")
print("=" * 70)
print(f"{'Name':15} {'X':8} {'Y':8} {'X-dir':8} {'Y-dir':8} {'Cardinal':10}")
print("-" * 70)

for actor in all_actors:
    label = actor.get_actor_label()
    if label.startswith('Corner_F1_'):
        loc = actor.get_actor_location()
        x_dir = "NORTH" if loc.x < foundation_loc.x else "SOUTH"
        y_dir = "EAST" if loc.y < foundation_loc.y else "WEST"
        cardinal = label.split('_')[-1]
        print(f"{label:15} {loc.x:8.0f} {loc.y:8.0f} {x_dir:8} {y_dir:8} {cardinal:10}")

print("\\nCoordinate System Reminder:")
print("- X decreases going NORTH (counterintuitive!)")
print("- Y decreases going EAST (counterintuitive!)")

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

    console.log('\n✅ Corner cardinality fix complete!');
    console.log('\nFinal corner mapping:');
    console.log('- Corner_F1_NW: North-West (X-, Y+)');
    console.log('- Corner_F1_NE: North-East (X-, Y-)');
    console.log('- Corner_F1_SE: South-East (X+, Y-)');
    console.log('- Corner_F1_SW: South-West (X+, Y+)');
    
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

fixCornersFinalCardinality().catch(console.error);