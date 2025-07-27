#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function addMissingPieces() {
    console.log('🏗️  Adding missing corners and walls...\n');
    
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

    // First, add missing ground floor corners
    console.log('🔲 Adding ground floor corners...\n');
    
    const addCornersCode = `
import unreal

# Check if corners already exist
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
existing_corners = []

for actor in all_actors:
    label = actor.get_actor_label()
    if 'Corner_' in label and actor.get_actor_location().z < 300:
        existing_corners.append(label)

print(f"Existing ground floor corners: {existing_corners}")

# If we have the unnamed corners, rename them
corner_count = 0
for actor in all_actors:
    label = actor.get_actor_label()
    if label.startswith('UEMCP_Actor'):
        # Check if it's a corner mesh
        mesh_comp = actor.get_component_by_class(unreal.StaticMeshComponent)
        if mesh_comp and mesh_comp.static_mesh:
            mesh_path = mesh_comp.static_mesh.get_path_name()
            if 'Corner' in mesh_path:
                loc = actor.get_actor_location()
                if loc.z < 300:  # Ground floor
                    # Determine position
                    if loc.x < 10760 and loc.y < 660:
                        new_name = "Corner_GF_Front_Left"
                    elif loc.x > 10760 and loc.y < 660:
                        new_name = "Corner_GF_Front_Right"
                    elif loc.x > 10760 and loc.y > 660:
                        new_name = "Corner_GF_Back_Right"
                    else:
                        new_name = "Corner_GF_Back_Left"
                    
                    actor.set_actor_label(new_name)
                    actor.set_folder_path("Estate/House/GroundFloor/Corners")
                    corner_count += 1
                    print(f"Renamed corner to {new_name}")

# If we still don't have corners, add them
corners_to_add = []
if 'Corner_GF_Front_Left' not in existing_corners:
    corners_to_add.append({
        'name': 'Corner_GF_Front_Left',
        'location': [10260, 260, 140],
        'rotation': [0, 0, 0]
    })
if 'Corner_GF_Front_Right' not in existing_corners:
    corners_to_add.append({
        'name': 'Corner_GF_Front_Right',
        'location': [11260, 260, 140],
        'rotation': [0, 0, -90]
    })
if 'Corner_GF_Back_Right' not in existing_corners:
    corners_to_add.append({
        'name': 'Corner_GF_Back_Right',
        'location': [11260, 1060, 140],
        'rotation': [0, 0, 180]
    })
if 'Corner_GF_Back_Left' not in existing_corners:
    corners_to_add.append({
        'name': 'Corner_GF_Back_Left',
        'location': [10260, 1060, 140],
        'rotation': [0, 0, 90]
    })

# Actually add missing corners
added_corners = 0
for corner in corners_to_add:
    asset_path = '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner'
    location = corner['location']
    rotation = corner['rotation']
    
    # Load the asset
    asset = unreal.EditorAssetLibrary.load_asset(asset_path)
    if asset:
        # Spawn the actor
        spawn_location = unreal.Vector(location[0], location[1], location[2])
        spawn_rotation = unreal.Rotator(rotation[0], rotation[1], rotation[2])
        
        spawned_actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
            asset, spawn_location, spawn_rotation
        )
        
        if spawned_actor:
            spawned_actor.set_actor_label(corner['name'])
            spawned_actor.set_folder_path("Estate/House/GroundFloor/Corners")
            added_corners += 1
            print(f"Added {corner['name']}")

result = f"Renamed {corner_count} corners, added {added_corners} new corners"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: addCornersCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fix wall positions first
    console.log('\n🔧 Fixing wall positions...\n');
    
    const fixWallsCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
fixed_count = 0

# Fix front and back wall Y positions
for actor in all_actors:
    label = actor.get_actor_label()
    if 'Wall_' in label and 'SF' not in label:
        current_loc = actor.get_actor_location()
        new_loc = None
        
        if 'Front' in label:
            # Front walls should be at Y=260
            if abs(current_loc.y - 260) > 5:
                new_loc = unreal.Vector(current_loc.x, 260, current_loc.z)
        elif 'Back' in label:
            # Back walls should be at Y=1060
            if abs(current_loc.y - 1060) > 5:
                new_loc = unreal.Vector(current_loc.x, 1060, current_loc.z)
        
        if new_loc:
            actor.set_actor_location(new_loc, False, False)
            fixed_count += 1
            print(f"Fixed position of {label}")

result = f"Fixed {fixed_count} wall positions"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: fixWallsCode }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Now add missing walls
    console.log('\n🧱 Adding missing walls...\n');
    
    // Wall_Front_3 - 2m wall
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_spawn',
            arguments: {
                assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m',
                location: [11060, 260, 140],
                rotation: [0, 0, 0],
                actorLabel: 'Wall_Front_3',
                folderPath: 'Estate/House/GroundFloor/Walls'
            }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Wall_Back_3 - 2m wall
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_spawn',
            arguments: {
                assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m',
                location: [11060, 1060, 140],
                rotation: [0, 0, 0],
                actorLabel: 'Wall_Back_3',
                folderPath: 'Estate/House/GroundFloor/Walls'
            }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Wall_West_3 - 2m wall
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_spawn',
            arguments: {
                assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m',
                location: [10260, 960, 140],
                rotation: [0, 0, 90],
                actorLabel: 'Wall_West_3',
                folderPath: 'Estate/House/GroundFloor/Walls'
            }
        },
        id: 6
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Wall_East_3 - 2m wall
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_spawn',
            arguments: {
                assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m',
                location: [11260, 960, 140],
                rotation: [0, 0, 90],
                actorLabel: 'Wall_East_3',
                folderPath: 'Estate/House/GroundFloor/Walls'
            }
        },
        id: 7
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Add a door to the front wall (replace Wall_Front_2)
    console.log('\n🚪 Adding front door...\n');
    
    const addDoorCode = `
import unreal

# Delete Wall_Front_2 and replace with door
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

for actor in all_actors:
    if actor.get_actor_label() == 'Wall_Front_2':
        location = actor.get_actor_location()
        rotation = actor.get_actor_rotation()
        
        # Delete the wall
        unreal.EditorLevelLibrary.destroy_actor(actor)
        print("Removed Wall_Front_2")
        
        # Add door in its place
        door_asset = unreal.EditorAssetLibrary.load_asset('/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareDoor')
        if door_asset:
            spawned_door = unreal.EditorLevelLibrary.spawn_actor_from_object(
                door_asset, location, rotation
            )
            if spawned_door:
                spawned_door.set_actor_label('Door_Front_1')
                spawned_door.set_folder_path('Estate/House/GroundFloor/Doors')
                print("Added Door_Front_1")
        break

result = "Replaced wall with door"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: addDoorCode }
        },
        id: 8
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Take final screenshot
    console.log('\n📸 Taking final screenshot...\n');
    
    // Perspective view
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
        id: 9
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Back to lit mode
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'lit' }
        },
        id: 10
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Take screenshot
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {}
        },
        id: 11
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n✅ Missing pieces added!');
    console.log('\nGround floor should now be complete with:');
    console.log('- 4 corners properly positioned and rotated');
    console.log('- 12 walls (including door)');
    console.log('- All gaps closed');
    
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

addMissingPieces().catch(console.error);