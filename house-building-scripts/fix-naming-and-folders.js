#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function fixNamingAndFolders() {
    console.log('🏷️  Fixing actor names and folder organization...\n');
    
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

    // Use actor_organize to create folders and organize actors
    console.log('📁 Creating folder structure and organizing actors...\n');
    
    const organizeCode = `
import unreal
import json

# Load the saved actor data
with open('/tmp/house_actors.json', 'r') as f:
    data = json.load(f)

foundation_x = data['foundation'][0]
foundation_y = data['foundation'][1]

# Get all actors
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# First pass: Rename actors based on their type and position
corner_counts = {'Front_Left': 0, 'Front_Right': 0, 'Back_Left': 0, 'Back_Right': 0}
wall_counts = {'Front': 0, 'Back': 0, 'West': 0, 'East': 0}
floor_count = 0
renamed_actors = []

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
            
            # Relative position to foundation
            rel_x = loc.x - foundation_x
            rel_y = loc.y - foundation_y
            
            new_name = None
            folder = None
            
            if 'Corner' in mesh_name:
                # Determine corner position
                if rel_x < 0 and rel_y < 0:
                    corner_pos = "Front_Left"
                elif rel_x > 0 and rel_y < 0:
                    corner_pos = "Front_Right"
                elif rel_x > 0 and rel_y > 0:
                    corner_pos = "Back_Right"
                else:
                    corner_pos = "Back_Left"
                
                # Determine floor
                if loc.z < 300:
                    floor_level = "GF"
                    folder = "Estate/House/GroundFloor/Corners"
                else:
                    floor_level = "SF"
                    folder = "Estate/House/SecondFloor/Corners"
                
                new_name = f"Corner_{floor_level}_{corner_pos}"
                
            elif 'Door' in mesh_name:
                # Determine side
                if abs(rel_x) > abs(rel_y):
                    side = "East" if rel_x > 0 else "West"
                else:
                    side = "Back" if rel_y > 0 else "Front"
                    
                wall_counts[side] += 1
                new_name = f"Door_{side}_{wall_counts[side]}"
                folder = "Estate/House/GroundFloor/Doors"
                
            elif 'Wall' in mesh_name or 'FlatWall' in mesh_name:
                # Check rotation to determine orientation
                rotation = actor.get_actor_rotation()
                
                # If rotated ~90 degrees, it's a side wall
                if abs(rotation.yaw - 90) < 10 or abs(rotation.yaw + 90) < 10:
                    side = "East" if rel_x > 0 else "West"
                else:
                    side = "Back" if rel_y > 0 else "Front"
                
                wall_counts[side] += 1
                
                if loc.z < 300:
                    new_name = f"Wall_{side}_{wall_counts[side]}"
                    folder = "Estate/House/GroundFloor/Walls"
                else:
                    new_name = f"Wall_SF_{side}_{wall_counts[side]}"
                    folder = "Estate/House/SecondFloor/Walls"
                    
            elif 'Floor' in mesh_name:
                floor_count += 1
                # Determine grid position
                grid_x = int((loc.x - foundation_x + 500) / 100)
                grid_y = int((loc.y - foundation_y + 400) / 100)
                new_name = f"Floor_Tile_{grid_x}_{grid_y}"
                folder = "Estate/House/SecondFloor/Floor"
            
            if new_name:
                actor.set_actor_label(new_name)
                renamed_actors.append({
                    'actor': actor,
                    'name': new_name,
                    'folder': folder
                })
                print(f"Renamed to: {new_name}")

result = f"Renamed {len(renamed_actors)} actors"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: organizeCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Now use actor_organize to move them to folders
    console.log('\n📂 Moving actors to folders...\n');
    
    // Get the renamed actors and organize them
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_organize',
            arguments: {
                folderPath: 'Estate/House/GroundFloor/Corners',
                nameFilter: 'Corner_GF'
            }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_organize',
            arguments: {
                folderPath: 'Estate/House/GroundFloor/Walls',
                nameFilter: 'Wall_'
            }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_organize',
            arguments: {
                folderPath: 'Estate/House/SecondFloor/Corners',
                nameFilter: 'Corner_SF'
            }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_organize',
            arguments: {
                folderPath: 'Estate/House/SecondFloor/Floor',
                nameFilter: 'Floor_Tile'
            }
        },
        id: 6
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot to show organized state
    console.log('\n📸 Taking screenshot of organized scene...\n');
    
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

    console.log('\n✅ Naming and organization complete!');
    
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

fixNamingAndFolders().catch(console.error);