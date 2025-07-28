#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function rebuildGroundFloorWalls() {
    console.log('🏗️ Rebuilding Ground Floor Walls\n');
    console.log('This will:');
    console.log('1. Remove all existing walls');
    console.log('2. Place walls correctly based on foundation');
    console.log('3. Ensure proper naming and organization\n');
    
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

    // Step 1: Remove existing walls
    console.log('🗑️  Step 1: Removing existing walls...\n');
    
    const removeWallsCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
removed_count = 0

for actor in all_actors:
    label = actor.get_actor_label()
    # Remove ground floor walls and doors (not corners or upper floors)
    if ('Wall_' in label or 'Door_' in label) and 'Corner' not in label and 'SF' not in label and 'F2' not in label:
        loc = actor.get_actor_location()
        # Only remove ground floor items (Z around 140)
        if abs(loc.z - 140) < 50:
            print(f"Removing: {label}")
            unreal.EditorLevelLibrary.destroy_actor(actor)
            removed_count += 1

print(f"\\nRemoved {removed_count} existing walls/doors")
result = f"Removed {removed_count} walls"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: removeWallsCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 2: Place walls correctly
    console.log('\n🔨 Step 2: Placing walls correctly...\n');
    
    // Wall placement configuration
    const wallPlacements = [
        // North side (3 walls)
        { name: 'Wall_North_1', asset: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m', location: [10260, 360, 140], rotation: [0, 0, 0] },
        { name: 'Wall_North_2', asset: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m', location: [10260, 660, 140], rotation: [0, 0, 0] },
        { name: 'Wall_North_3', asset: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m', location: [10260, 960, 140], rotation: [0, 0, 0] },
        
        // South side (2 walls + 1 door)
        { name: 'Wall_South_1', asset: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m', location: [11260, 360, 140], rotation: [0, 0, 180] },
        { name: 'Door_Front_1', asset: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareDoor', location: [11260, 660, 140], rotation: [0, 0, 180] },
        { name: 'Wall_South_2', asset: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m', location: [11260, 960, 140], rotation: [0, 0, 180] },
        
        // East side (2 walls)
        { name: 'Wall_East_1', asset: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m', location: [10560, 260, 140], rotation: [0, 0, -90] },
        { name: 'Wall_East_2', asset: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m', location: [10960, 260, 140], rotation: [0, 0, -90] },
        
        // West side (2 walls)
        { name: 'Wall_West_1', asset: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m', location: [10560, 1060, 140], rotation: [0, 0, 90] },
        { name: 'Wall_West_2', asset: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m', location: [10960, 1060, 140], rotation: [0, 0, 90] }
    ];

    let placedCount = 0;
    
    for (const wall of wallPlacements) {
        console.log(`Placing ${wall.name}...`);
        
        serverProcess.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
                name: 'actor_spawn',
                arguments: {
                    assetPath: wall.asset,
                    location: wall.location,
                    rotation: wall.rotation,
                    name: wall.name,
                    folder: wall.name.includes('Door') ? 'Estate/House/GroundFloor/Doors' : 'Estate/House/GroundFloor/Walls'
                }
            },
            id: 100 + placedCount
        }) + '\n');
        
        placedCount++;
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`\n✅ Placed ${placedCount} walls and doors`);

    // Step 3: Verify placement
    console.log('\n📊 Step 3: Verifying placement...\n');
    
    const verifyCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find foundation
foundation_loc = None
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation_loc = actor.get_actor_location()
        break

print("GROUND FLOOR VERIFICATION:")
print("=" * 60)

# Count components
corners = walls = doors = 0
wall_list = []
door_list = []
corner_list = []

for actor in all_actors:
    label = actor.get_actor_label()
    loc = actor.get_actor_location()
    
    # Only count ground floor items
    if abs(loc.z - 140) < 50:
        if 'Corner_F1' in label:
            corners += 1
            corner_list.append(label)
        elif 'Wall_' in label:
            walls += 1
            wall_list.append(label)
        elif 'Door_' in label:
            doors += 1
            door_list.append(label)

print(f"✅ Corners: {corners} - {', '.join(sorted(corner_list))}")
print(f"✅ Walls: {walls} - {', '.join(sorted(wall_list))}")
print(f"✅ Doors: {doors} - {', '.join(sorted(door_list))}")
print(f"\\nTotal ground floor pieces: {corners + walls + doors}")

# Check for gaps
print("\\nChecking for potential gaps...")
expected_positions = {
    'North': [(10260, 360), (10260, 660), (10260, 960)],
    'South': [(11260, 360), (11260, 660), (11260, 960)],
    'East': [(10560, 260), (10960, 260)],
    'West': [(10560, 1060), (10960, 1060)]
}

for side, positions in expected_positions.items():
    print(f"\\n{side} side:")
    for exp_x, exp_y in positions:
        found = False
        for actor in all_actors:
            loc = actor.get_actor_location()
            if abs(loc.x - exp_x) < 50 and abs(loc.y - exp_y) < 50 and abs(loc.z - 140) < 50:
                found = True
                print(f"  ✓ Found actor at [{exp_x}, {exp_y}]: {actor.get_actor_label()}")
                break
        if not found:
            print(f"  ✗ MISSING actor at [{exp_x}, {exp_y}]")

result = f"Verification complete: {corners} corners, {walls} walls, {doors} doors"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: verifyCode }
        },
        id: 200
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot
    console.log('\n📸 Taking verification screenshot...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'lit' }
        },
        id: 201
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_camera',
            arguments: {
                location: [9500, -200, 600],
                rotation: [-20, 45, 0]
            }
        },
        id: 202
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {}
        },
        id: 203
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
        id: 204
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n✅ Ground floor walls rebuilt successfully!');
    
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

rebuildGroundFloorWalls().catch(console.error);