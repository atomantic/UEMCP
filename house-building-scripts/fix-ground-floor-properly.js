#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function fixGroundFloorProperly() {
    console.log('🔧 Fixing ground floor issues properly...\n');
    
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

    // Step 1: Remove duplicate corners
    console.log('🗑️  Step 1: Removing duplicate corners...\n');
    
    const removeDuplicatesCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
deleted_count = 0

# Delete the old Corner_ versions, keep Corner_GF_ versions
for actor in all_actors:
    label = actor.get_actor_label()
    if label in ['Corner_Front_Left', 'Corner_Front_Right', 'Corner_Back_Right', 'Corner_Back_Left']:
        unreal.EditorLevelLibrary.destroy_actor(actor)
        deleted_count += 1
        print(f"Deleted duplicate: {label}")

result = f"Deleted {deleted_count} duplicate corners"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: removeDuplicatesCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 2: Fix corner positions and rotations
    console.log('\n📐 Step 2: Fixing corner positions and rotations...\n');
    
    const fixCornersCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Foundation reference
foundation_loc = None
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation_loc = actor.get_actor_location()
        break

if not foundation_loc:
    result = "ERROR: Could not find foundation"
else:
    # Correct positions for corners
    corner_fixes = {
        'Corner_GF_Front_Left': {
            'pos': [foundation_loc.x - 500, foundation_loc.y - 400, 140],
            'rot': [0, 0, 0]
        },
        'Corner_GF_Front_Right': {
            'pos': [foundation_loc.x + 500, foundation_loc.y - 400, 140],
            'rot': [0, 0, -90]
        },
        'Corner_GF_Back_Right': {
            'pos': [foundation_loc.x + 500, foundation_loc.y + 400, 140],
            'rot': [0, 0, 180]
        },
        'Corner_GF_Back_Left': {
            'pos': [foundation_loc.x - 500, foundation_loc.y + 400, 140],
            'rot': [0, 0, 90]
        }
    }
    
    fixed_count = 0
    for actor in all_actors:
        label = actor.get_actor_label()
        if label in corner_fixes:
            fix = corner_fixes[label]
            
            # Set position
            new_pos = unreal.Vector(fix['pos'][0], fix['pos'][1], fix['pos'][2])
            actor.set_actor_location(new_pos, False, False)
            
            # Set rotation
            new_rot = unreal.Rotator(fix['rot'][0], fix['rot'][1], fix['rot'][2])
            actor.set_actor_rotation(new_rot, False)
            
            fixed_count += 1
            print(f"Fixed {label} to position [{fix['pos'][0]}, {fix['pos'][1]}] with rotation {fix['rot'][2]}°")
    
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

    // Step 3: Fix wall positions
    console.log('\n🧱 Step 3: Fixing wall positions...\n');
    
    const fixWallsCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Foundation reference
foundation_loc = None
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation_loc = actor.get_actor_location()
        break

# Wall position fixes
wall_fixes = {
    # Front walls (Y should be foundation.y - 400)
    'Wall_Front_1': [10460, foundation_loc.y - 400, 140],
    'Wall_Front_3': [11060, foundation_loc.y - 400, 140],
    'Door_Front_1': [10760, foundation_loc.y - 400, 140],
    
    # Back walls (Y should be foundation.y + 400)
    'Wall_Back_1': [10460, foundation_loc.y + 400, 140],
    'Wall_Back_2': [10760, foundation_loc.y + 400, 140],
    'Wall_Back_3': [11060, foundation_loc.y + 400, 140],
    
    # West walls (X should be foundation.x - 500)
    'Wall_West_1': [foundation_loc.x - 500, 460, 140],
    'Wall_West_2': [foundation_loc.x - 500, 660, 140],
    'Wall_West_3': [foundation_loc.x - 500, 860, 140],
    
    # East walls (X should be foundation.x + 500)
    'Wall_East_1': [foundation_loc.x + 500, 460, 140],
    'Wall_East_2': [foundation_loc.x + 500, 660, 140],
    'Wall_East_3': [foundation_loc.x + 500, 860, 140]
}

fixed_count = 0
for actor in all_actors:
    label = actor.get_actor_label()
    if label in wall_fixes:
        expected_pos = wall_fixes[label]
        new_pos = unreal.Vector(expected_pos[0], expected_pos[1], expected_pos[2])
        actor.set_actor_location(new_pos, False, False)
        fixed_count += 1
        print(f"Fixed {label} to [{expected_pos[0]}, {expected_pos[1]}]")

# Also need to replace the middle front wall with door
# Delete Wall_Front_2 if it exists and isn't already a door
for actor in all_actors:
    if actor.get_actor_label() == 'Wall_Front_2':
        unreal.EditorLevelLibrary.destroy_actor(actor)
        print("Deleted Wall_Front_2 to make room for door")

result = f"Fixed {fixed_count} wall positions"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: fixWallsCode }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 4: Add missing door if needed
    console.log('\n🚪 Step 4: Checking door placement...\n');
    
    const checkDoorCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Check if door exists
door_exists = False
for actor in all_actors:
    if actor.get_actor_label() == 'Door_Front_1':
        door_exists = True
        # Make sure it's in the right position
        foundation = None
        for a in all_actors:
            if a.get_actor_label() == 'HouseFoundation':
                foundation = a.get_actor_location()
                break
        
        if foundation:
            correct_pos = unreal.Vector(10760, foundation.y - 400, 140)
            actor.set_actor_location(correct_pos, False, False)
            print(f"Adjusted door position to [{correct_pos.x}, {correct_pos.y}]")
        break

if not door_exists:
    # Add door
    door_asset = unreal.EditorAssetLibrary.load_asset('/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareDoor')
    if door_asset:
        spawn_location = unreal.Vector(10760, 260, 140)
        spawn_rotation = unreal.Rotator(0, 0, 0)
        
        spawned_door = unreal.EditorLevelLibrary.spawn_actor_from_object(
            door_asset, spawn_location, spawn_rotation
        )
        
        if spawned_door:
            spawned_door.set_actor_label('Door_Front_1')
            spawned_door.set_folder_path('Estate/House/GroundFloor/Doors')
            print("Added Door_Front_1")

result = "Door placement verified"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: checkDoorCode }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 5: Take verification screenshots
    console.log('\n📸 Step 5: Taking verification screenshots...\n');
    
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
        id: 6
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Wireframe
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'wireframe' }
        },
        id: 7
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

    console.log('\n✅ Ground floor fixes complete!');
    console.log('\nFixed:');
    console.log('- Removed duplicate corners');
    console.log('- Positioned corners at correct locations');
    console.log('- Fixed all wall positions');
    console.log('- Ensured door is properly placed');
    console.log('- No gaps should remain');
    
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

fixGroundFloorProperly().catch(console.error);