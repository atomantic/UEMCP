#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function cleanupHouse() {
    console.log('🧹 Starting House Cleanup - Phase 0\n');
    
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

    // Step 1: Delete actors at wrong Z level (-1000)
    console.log('📍 Step 1: Removing misplaced actors at Z=-1000...\n');
    
    const deleteUndergroundCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
deleted_count = 0

for actor in all_actors:
    label = actor.get_actor_label()
    if 'UEMCP_Actor' in label:
        location = actor.get_actor_location()
        if location.z < 0:  # Underground
            unreal.EditorLevelLibrary.destroy_actor(actor)
            deleted_count += 1
            print(f"Deleted underground actor: {label} at Z={location.z}")

result = f"Deleted {deleted_count} underground actors"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: deleteUndergroundCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 2: Analyze current house actors
    console.log('\n📊 Step 2: Analyzing current house structure...\n');
    
    const analyzeCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
house_actors = []
foundation_loc = None

# Find foundation location
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation_loc = actor.get_actor_location()
        break

if not foundation_loc:
    result = "ERROR: Could not find HouseFoundation"
else:
    # Collect all UEMCP actors near foundation
    for actor in all_actors:
        label = actor.get_actor_label()
        if 'UEMCP_Actor' in label:
            loc = actor.get_actor_location()
            # Only actors within reasonable distance of foundation
            if abs(loc.x - foundation_loc.x) < 1000 and abs(loc.y - foundation_loc.y) < 1000:
                # Get the actual mesh being used
                mesh_comp = actor.get_component_by_class(unreal.StaticMeshComponent)
                mesh_path = "Unknown"
                if mesh_comp and mesh_comp.static_mesh:
                    mesh_path = mesh_comp.static_mesh.get_path_name()
                    mesh_name = mesh_path.split('/')[-1]
                else:
                    mesh_name = "Unknown"
                
                house_actors.append({
                    'label': label,
                    'location': [loc.x, loc.y, loc.z],
                    'rotation': [actor.get_actor_rotation().roll, actor.get_actor_rotation().pitch, actor.get_actor_rotation().yaw],
                    'mesh': mesh_name
                })
    
    # Categorize actors by type
    corners = []
    walls = []
    doors = []
    unknown = []
    
    for actor in house_actors:
        mesh = actor['mesh']
        if 'Corner' in mesh:
            corners.append(actor)
        elif 'Door' in mesh:
            doors.append(actor)
        elif 'Wall' in mesh or 'FlatWall' in mesh:
            walls.append(actor)
        else:
            unknown.append(actor)
    
    result = {
        'foundation': [foundation_loc.x, foundation_loc.y, foundation_loc.z],
        'corners': len(corners),
        'walls': len(walls),
        'doors': len(doors),
        'unknown': len(unknown),
        'total': len(house_actors)
    }
    
    # Store detailed data for next step
    import json
    with open('/tmp/house_actors.json', 'w') as f:
        json.dump({
            'foundation': [foundation_loc.x, foundation_loc.y, foundation_loc.z],
            'corners': corners,
            'walls': walls,
            'doors': doors,
            'unknown': unknown
        }, f, indent=2)
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: analyzeCode }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Create organized folder structure
    console.log('\n📁 Step 3: Creating folder structure...\n');
    
    const createFoldersCode = `
import unreal

# Create folder hierarchy
folders_to_create = [
    'Estate/House/GroundFloor',
    'Estate/House/GroundFloor/Walls',
    'Estate/House/GroundFloor/Corners',
    'Estate/House/GroundFloor/Doors',
    'Estate/House/SecondFloor',
    'Estate/House/Roof'
]

for folder_path in folders_to_create:
    unreal.EditorLevelLibrary.create_level_actor_folder(folder_path)
    
result = f"Created {len(folders_to_create)} folders"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: createFoldersCode }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Rename and organize actors
    console.log('\n🏷️  Step 4: Renaming and organizing actors...\n');
    
    const renameOrganizeCode = `
import unreal
import json

# Load actor data
with open('/tmp/house_actors.json', 'r') as f:
    data = json.load(f)

foundation_x = data['foundation'][0]
foundation_y = data['foundation'][1]

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
renamed_count = 0

# Helper to determine position name
def get_position_name(x, y, foundation_x, foundation_y):
    # Relative to foundation
    rel_x = x - foundation_x
    rel_y = y - foundation_y
    
    # Determine side
    if abs(rel_x) > abs(rel_y):
        if rel_x > 0:
            return "East"
        else:
            return "West"
    else:
        if rel_y > 0:
            return "Back"
        else:
            return "Front"

# Process each actor
for actor in all_actors:
    label = actor.get_actor_label()
    if 'UEMCP_Actor' in label:
        loc = actor.get_actor_location()
        
        # Skip if too far from foundation
        if abs(loc.x - foundation_x) > 1000 or abs(loc.y - foundation_y) > 1000:
            continue
            
        # Get mesh type
        mesh_comp = actor.get_component_by_class(unreal.StaticMeshComponent)
        if mesh_comp and mesh_comp.static_mesh:
            mesh_path = mesh_comp.static_mesh.get_path_name()
            mesh_name = mesh_path.split('/')[-1]
            
            # Determine new name and folder
            position = get_position_name(loc.x, loc.y, foundation_x, foundation_y)
            
            if 'Corner' in mesh_name:
                # Corners need more specific names
                rel_x = loc.x - foundation_x
                rel_y = loc.y - foundation_y
                
                if rel_x < 0 and rel_y < 0:
                    new_name = "Corner_Front_Left"
                elif rel_x > 0 and rel_y < 0:
                    new_name = "Corner_Front_Right"
                elif rel_x > 0 and rel_y > 0:
                    new_name = "Corner_Back_Right"
                else:
                    new_name = "Corner_Back_Left"
                    
                folder = "Estate/House/GroundFloor/Corners"
                
            elif 'Door' in mesh_name:
                # Count existing doors on this side
                door_count = sum(1 for a in all_actors if position in a.get_actor_label() and 'Door' in a.get_actor_label())
                new_name = f"Door_{position}_{door_count + 1}"
                folder = "Estate/House/GroundFloor/Doors"
                
            else:  # Wall
                # Count existing walls on this side
                wall_count = sum(1 for a in all_actors if position in a.get_actor_label() and 'Wall' in a.get_actor_label())
                new_name = f"Wall_{position}_{wall_count + 1}"
                folder = "Estate/House/GroundFloor/Walls"
            
            # Apply new name and folder
            actor.set_actor_label(new_name)
            actor.set_folder_path(folder)
            renamed_count += 1
            print(f"Renamed {label} to {new_name} in {folder}")

result = f"Renamed and organized {renamed_count} actors"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: renameOrganizeCode }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Take screenshot to show current state
    console.log('\n📸 Step 5: Taking screenshot of organized actors...\n');
    
    // Focus on foundation
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_focus',
            arguments: { actorName: 'HouseFoundation' }
        },
        id: 6
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
        id: 7
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n✅ Phase 0 Cleanup Complete!');
    console.log('\nNext steps:');
    console.log('1. Check the screenshot to see current state');
    console.log('2. Run gap analysis script to identify wall gaps');
    console.log('3. Fix corner rotations');
    console.log('4. Proceed with Phase 1 (Second Floor)');
    
    serverProcess.kill();
    
    // Parse and display results
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

cleanupHouse().catch(console.error);