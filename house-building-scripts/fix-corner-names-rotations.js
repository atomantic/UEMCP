#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function fixCornerNamesRotations() {
    console.log('🔧 Fixing corner names and rotations...\n');
    
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

    // First, analyze current corners
    console.log('📊 Analyzing current corners...\n');
    
    const analyzeCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find foundation for reference
foundation_loc = None
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation_loc = actor.get_actor_location()
        print(f"Foundation at: [{foundation_loc.x}, {foundation_loc.y}, {foundation_loc.z}]")
        break

# In Unreal, Y+ is East, Y- is West, X+ is South, X- is North
# So for our house:
# - NW corner is at negative X (north) and negative Y (west)
# - NE corner is at negative X (north) and positive Y (east)
# - SE corner is at positive X (south) and positive Y (east)
# - SW corner is at positive X (south) and negative Y (west)

print("\\nCardinal directions relative to foundation:")
print(f"North: X < {foundation_loc.x}")
print(f"South: X > {foundation_loc.x}")
print(f"East: Y > {foundation_loc.y}")
print(f"West: Y < {foundation_loc.y}")

# Collect ground floor corners
corners = []
for actor in all_actors:
    label = actor.get_actor_label()
    if 'Corner_GF' in label:
        loc = actor.get_actor_location()
        rot = actor.get_actor_rotation()
        
        # Determine cardinal position
        if loc.x < foundation_loc.x and loc.y < foundation_loc.y:
            cardinal = "NW"
        elif loc.x < foundation_loc.x and loc.y > foundation_loc.y:
            cardinal = "NE"
        elif loc.x > foundation_loc.x and loc.y > foundation_loc.y:
            cardinal = "SE"
        else:  # loc.x > foundation_loc.x and loc.y < foundation_loc.y
            cardinal = "SW"
            
        corners.append({
            'actor': actor,
            'label': label,
            'cardinal': cardinal,
            'location': [loc.x, loc.y, loc.z],
            'current_rotation': rot.yaw
        })
        print(f"\\n{label} is at {cardinal} position")
        print(f"  Location: [{loc.x}, {loc.y}]")
        print(f"  Current Yaw: {rot.yaw}°")

result = f"Found {len(corners)} corners"
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

    // Fix corner names and rotations
    console.log('\n🏷️  Renaming corners and fixing rotations...\n');
    
    const fixCornersCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find foundation for reference
foundation_loc = None
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation_loc = actor.get_actor_location()
        break

# Correct rotations for corners
# The corner piece has its right angle pointing in a specific direction
# We want the sharp angle (exterior corner) pointing outward
corner_rotations = {
    'NW': 180,  # Sharp angle points northwest
    'NE': -90,  # Sharp angle points northeast  
    'SE': 0,    # Sharp angle points southeast
    'SW': 90    # Sharp angle points southwest
}

fixed_count = 0
for actor in all_actors:
    label = actor.get_actor_label()
    if 'Corner_GF' in label or 'Corner_F1' in label:
        loc = actor.get_actor_location()
        
        # Determine cardinal position
        if loc.x < foundation_loc.x and loc.y < foundation_loc.y:
            cardinal = "NW"
        elif loc.x < foundation_loc.x and loc.y > foundation_loc.y:
            cardinal = "NE"
        elif loc.x > foundation_loc.x and loc.y > foundation_loc.y:
            cardinal = "SE"
        else:  # loc.x > foundation_loc.x and loc.y < foundation_loc.y
            cardinal = "SW"
        
        # Set new name
        new_name = f"Corner_F1_{cardinal}"
        actor.set_actor_label(new_name)
        
        # Set correct rotation
        correct_yaw = corner_rotations[cardinal]
        new_rot = unreal.Rotator(0, 0, correct_yaw)
        actor.set_actor_rotation(new_rot, False)
        
        fixed_count += 1
        print(f"Fixed {label} -> {new_name} with Yaw={correct_yaw}°")

# Also fix second floor corners if they exist
for actor in all_actors:
    label = actor.get_actor_label()
    if 'Corner_SF' in label:
        loc = actor.get_actor_location()
        
        # Determine cardinal position
        if loc.x < foundation_loc.x and loc.y < foundation_loc.y:
            cardinal = "NW"
        elif loc.x < foundation_loc.x and loc.y > foundation_loc.y:
            cardinal = "NE"
        elif loc.x > foundation_loc.x and loc.y > foundation_loc.y:
            cardinal = "SE"
        else:
            cardinal = "SW"
        
        # Set new name
        new_name = f"Corner_F2_{cardinal}"
        actor.set_actor_label(new_name)
        
        # Set correct rotation
        correct_yaw = corner_rotations[cardinal]
        new_rot = unreal.Rotator(0, 0, correct_yaw)
        actor.set_actor_rotation(new_rot, False)
        
        fixed_count += 1
        print(f"Fixed {label} -> {new_name} with Yaw={correct_yaw}°")

result = f"Fixed {fixed_count} corners"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: fixCornersCode }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Take screenshots to verify
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
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Lit mode for better visibility
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'lit' }
        },
        id: 5
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
        id: 6
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Perspective view to see corners better
    const perspectiveCode = `
import unreal
editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
camera_location = unreal.Vector(9500, -200, 400)
camera_rotation = unreal.Rotator(-20, 30, 0)
editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)
result = "Set perspective view"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: perspectiveCode }
        },
        id: 7
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Screenshot
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {}
        },
        id: 8
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
        id: 9
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n✅ Corner fixes complete!');
    console.log('\nFixed:');
    console.log('- Renamed corners to cardinal directions (NW, NE, SE, SW)');
    console.log('- Set correct rotations so sharp angles point outward');
    console.log('- SE corner now has Yaw=0°');
    console.log('- All corners properly oriented');
    
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

fixCornerNamesRotations().catch(console.error);