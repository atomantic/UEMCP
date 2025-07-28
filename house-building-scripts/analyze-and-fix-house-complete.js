#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function analyzeAndFixHouseComplete() {
    console.log('🏠 Complete House Analysis and Fix\n');
    console.log('This script will:');
    console.log('1. Analyze current house state');
    console.log('2. Fix corner rotations');
    console.log('3. Fix wall naming and positioning');
    console.log('4. Remove duplicates');
    console.log('5. Organize everything properly\n');
    
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

    // Step 1: Analyze current state
    console.log('📊 Step 1: Analyzing current house state...\n');
    
    const analyzeCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find foundation
foundation = None
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation = actor
        foundation_loc = actor.get_actor_location()
        break

if not foundation:
    print("ERROR: No foundation found!")
else:
    print(f"Foundation at: {foundation_loc}")
    
    # Categorize actors
    corners = []
    walls = []
    doors = []
    floors = []
    other_house = []
    
    for actor in all_actors:
        label = actor.get_actor_label()
        if 'Corner' in label:
            corners.append(actor)
        elif 'Wall' in label:
            walls.append(actor)
        elif 'Door' in label:
            doors.append(actor)
        elif 'Floor' in label:
            floors.append(actor)
        elif any(x in label for x in ['House', 'Roof', 'Window']):
            other_house.append(actor)
    
    print(f"\\nCurrent inventory:")
    print(f"- Corners: {len(corners)}")
    print(f"- Walls: {len(walls)}")
    print(f"- Doors: {len(doors)}")
    print(f"- Floors: {len(floors)}")
    print(f"- Other house parts: {len(other_house)}")
    
    # Expected for ground floor:
    # - 4 corners
    # - North wall: 3 segments (3m each = 9m, with 1m for corners = 10m total)
    # - South wall: 2 segments + 1 door (6m + door, with corners = 10m)
    # - East wall: 2 segments (2m each = 4m, with 2m for corners = 8m total)
    # - West wall: 2 segments (2m each = 4m, with 2m for corners = 8m total)
    # Total: 9 wall segments + 1 door
    
    print("\\nExpected for ground floor:")
    print("- 4 corners")
    print("- 9 wall segments + 1 door")
    
    # Check corner positions and rotations
    print("\\nCorner analysis:")
    corner_issues = []
    for corner in corners:
        if 'F1' in corner.get_actor_label():
            loc = corner.get_actor_location()
            rot = corner.get_actor_rotation()
            cardinal = corner.get_actor_label().split('_')[-1]
            
            # Expected rotations for sharp angle pointing outward
            expected_rot = {
                'NW': 180,  # Sharp angle points northwest
                'NE': -90,  # Sharp angle points northeast
                'SE': 0,    # Sharp angle points southeast
                'SW': 90    # Sharp angle points southwest
            }
            
            if cardinal in expected_rot:
                if abs(rot.yaw - expected_rot[cardinal]) > 1:
                    corner_issues.append({
                        'actor': corner,
                        'cardinal': cardinal,
                        'current_yaw': rot.yaw,
                        'expected_yaw': expected_rot[cardinal]
                    })
                    print(f"  ❌ {corner.get_actor_label()}: Yaw={rot.yaw:.1f}° (should be {expected_rot[cardinal]}°)")
                else:
                    print(f"  ✅ {corner.get_actor_label()}: Rotation correct")
    
    # Analyze walls
    print("\\nWall analysis:")
    generic_walls = []
    named_walls = []
    
    for wall in walls:
        label = wall.get_actor_label()
        if label.startswith('UEMCP_Actor_') or label.startswith('StaticMeshActor'):
            generic_walls.append(wall)
        else:
            named_walls.append(wall)
    
    print(f"- Generic/unnamed walls: {len(generic_walls)}")
    print(f"- Named walls: {len(named_walls)}")
    
    # Store analysis results
    result = {
        'foundation_loc': [foundation_loc.x, foundation_loc.y, foundation_loc.z],
        'corner_issues': len(corner_issues),
        'generic_walls': len(generic_walls),
        'total_walls': len(walls),
        'total_corners': len(corners)
    }

# Return data for next steps
corner_issues_count = len(corner_issues) if 'corner_issues' in locals() else 0
generic_walls_count = len(generic_walls) if 'generic_walls' in locals() else 0
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

    // Step 2: Fix corner rotations
    console.log('\n🔧 Step 2: Fixing corner rotations...\n');
    
    const fixCornersCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Correct rotations for corners (sharp angle pointing outward)
corner_rotations = {
    'NW': 180,   # Sharp angle points northwest
    'NE': -90,   # Sharp angle points northeast  
    'SE': 0,     # Sharp angle points southeast
    'SW': 90     # Sharp angle points southwest
}

fixed_count = 0

for actor in all_actors:
    label = actor.get_actor_label()
    if 'Corner' in label and ('F1' in label or 'F2' in label):
        cardinal = label.split('_')[-1]
        if cardinal in corner_rotations:
            current_rot = actor.get_actor_rotation()
            expected_yaw = corner_rotations[cardinal]
            
            if abs(current_rot.yaw - expected_yaw) > 1:
                new_rot = unreal.Rotator(0, expected_yaw, 0)
                actor.set_actor_rotation(new_rot, False)
                fixed_count += 1
                print(f"Fixed {label}: Yaw {current_rot.yaw:.1f}° -> {expected_yaw}°")

print(f"\\n✅ Fixed {fixed_count} corner rotations")
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

    // Step 3: Fix wall naming and positioning
    console.log('\n🏷️  Step 3: Fixing wall naming and positioning...\n');
    
    const fixWallsCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find foundation
foundation_loc = None
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation_loc = actor.get_actor_location()
        break

if not foundation_loc:
    result = "ERROR: No foundation found"
else:
    # Ground floor dimensions
    width = 1000  # 10m in X direction (North-South)
    depth = 800   # 8m in Y direction (East-West)
    floor_z = 140 # Ground floor Z
    
    # Wall specifications
    wall_specs = {
        # North side (X-, Y varies)
        'North': {
            'x': foundation_loc.x - width/2,
            'y_segments': [
                (foundation_loc.y - 300, 'Wall_North_1'),  # 3m wall
                (foundation_loc.y, 'Wall_North_2'),         # 3m wall  
                (foundation_loc.y + 300, 'Wall_North_3')    # 3m wall
            ],
            'rotation': [0, 0, 0]  # Facing south
        },
        # South side (X+, Y varies)
        'South': {
            'x': foundation_loc.x + width/2,
            'y_segments': [
                (foundation_loc.y - 300, 'Wall_South_1'),   # 3m wall
                (foundation_loc.y, 'Door_Front_1'),         # Door
                (foundation_loc.y + 300, 'Wall_South_2')    # 3m wall
            ],
            'rotation': [0, 0, 180]  # Facing north
        },
        # East side (Y-, X varies)
        'East': {
            'y': foundation_loc.y - depth/2,
            'x_segments': [
                (foundation_loc.x - 200, 'Wall_East_1'),    # 2m wall
                (foundation_loc.x + 200, 'Wall_East_2')     # 2m wall
            ],
            'rotation': [0, 0, -90]  # Facing west
        },
        # West side (Y+, X varies)
        'West': {
            'y': foundation_loc.y + depth/2,
            'x_segments': [
                (foundation_loc.x - 200, 'Wall_West_1'),    # 2m wall
                (foundation_loc.x + 200, 'Wall_West_2')     # 2m wall
            ],
            'rotation': [0, 0, 90]  # Facing east
        }
    }
    
    # First, collect all walls and doors
    walls_and_doors = []
    for actor in all_actors:
        label = actor.get_actor_label()
        if 'Wall' in label or 'Door' in label:
            if not any(x in label for x in ['Corner', 'Roof', 'Floor']):
                walls_and_doors.append(actor)
    
    print(f"Found {len(walls_and_doors)} walls and doors to process")
    
    # Create a mapping of positions to actors
    position_map = {}
    for actor in walls_and_doors:
        loc = actor.get_actor_location()
        # Round to nearest 50 units to handle slight misalignments
        key = (round(loc.x/50)*50, round(loc.y/50)*50)
        position_map[key] = actor
    
    # Process each wall specification
    renamed_count = 0
    repositioned_count = 0
    
    for side, spec in wall_specs.items():
        print(f"\\nProcessing {side} side:")
        
        if side in ['North', 'South']:
            x = spec['x']
            for y, name in spec['y_segments']:
                pos = unreal.Vector(x, y, floor_z)
                rot = unreal.Rotator(*spec['rotation'])
                
                # Find closest actor
                key = (round(x/50)*50, round(y/50)*50)
                if key in position_map:
                    actor = position_map[key]
                    # Rename
                    if actor.get_actor_label() != name:
                        actor.set_actor_label(name)
                        renamed_count += 1
                    # Reposition if needed
                    if (actor.get_actor_location() - pos).size() > 10:
                        actor.set_actor_location(pos, False, False)
                        repositioned_count += 1
                    # Set rotation
                    actor.set_actor_rotation(rot, False)
                    print(f"  ✓ {name} at [{x:.0f}, {y:.0f}]")
                else:
                    print(f"  ✗ Missing: {name} at [{x:.0f}, {y:.0f}]")
        
        else:  # East, West
            y = spec['y']
            for x, name in spec['x_segments']:
                pos = unreal.Vector(x, y, floor_z)
                rot = unreal.Rotator(*spec['rotation'])
                
                # Find closest actor
                key = (round(x/50)*50, round(y/50)*50)
                if key in position_map:
                    actor = position_map[key]
                    # Rename
                    if actor.get_actor_label() != name:
                        actor.set_actor_label(name)
                        renamed_count += 1
                    # Reposition if needed
                    if (actor.get_actor_location() - pos).size() > 10:
                        actor.set_actor_location(pos, False, False)
                        repositioned_count += 1
                    # Set rotation
                    actor.set_actor_rotation(rot, False)
                    print(f"  ✓ {name} at [{x:.0f}, {y:.0f}]")
                else:
                    print(f"  ✗ Missing: {name} at [{x:.0f}, {y:.0f}]")
    
    print(f"\\n✅ Renamed {renamed_count} actors")
    print(f"✅ Repositioned {repositioned_count} actors")
    
    result = f"Fixed {renamed_count} names and {repositioned_count} positions"
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
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Remove duplicates and organize
    console.log('\n🗑️  Step 4: Removing duplicates and organizing...\n');
    
    const cleanupCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Remove any unnamed actors
removed_count = 0
for actor in all_actors:
    label = actor.get_actor_label()
    if label.startswith('UEMCP_Actor_') or label.startswith('StaticMeshActor'):
        # Check if it's a building piece
        mesh_comp = actor.get_component_by_class(unreal.StaticMeshComponent)
        if mesh_comp:
            mesh = mesh_comp.static_mesh
            if mesh and 'Modular' in mesh.get_path_name():
                unreal.EditorLevelLibrary.destroy_actor(actor)
                removed_count += 1
                print(f"Removed unnamed actor: {label}")

# Organize all house actors
folder_map = {
    'Corner_F1': 'Estate/House/GroundFloor/Corners',
    'Wall_': 'Estate/House/GroundFloor/Walls',
    'Door_': 'Estate/House/GroundFloor/Doors',
    'Floor_GF': 'Estate/House/GroundFloor/Floor',
    'Corner_F2': 'Estate/House/SecondFloor/Corners',
    'Floor_SF': 'Estate/House/SecondFloor/Floor',
    'HouseFoundation': 'Estate/House/Foundation'
}

organized_count = 0
for actor in unreal.EditorLevelLibrary.get_all_level_actors():
    label = actor.get_actor_label()
    for prefix, folder in folder_map.items():
        if label.startswith(prefix):
            actor.set_folder_path(folder)
            organized_count += 1
            break

print(f"\\n✅ Removed {removed_count} duplicate/unnamed actors")
print(f"✅ Organized {organized_count} actors into folders")

result = f"Cleanup complete: removed {removed_count}, organized {organized_count}"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: cleanupCode }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Step 5: Final verification and screenshot
    console.log('\n📸 Step 5: Final verification...\n');
    
    // Switch to wireframe top view
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'wireframe' }
        },
        id: 6
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_mode',
            arguments: { mode: 'top' }
        },
        id: 7
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {}
        },
        id: 8
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Final count
    const finalCountCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Count final inventory
corners = walls = doors = floors = 0

for actor in all_actors:
    label = actor.get_actor_label()
    if 'Corner_F1' in label:
        corners += 1
    elif 'Wall_' in label and 'F1' not in label and 'F2' not in label:
        walls += 1
    elif 'Door_' in label:
        doors += 1
    elif 'Floor_GF' in label:
        floors += 1

print("\\nFINAL GROUND FLOOR INVENTORY:")
print(f"✅ Corners: {corners} (expected: 4)")
print(f"✅ Walls: {walls} (expected: 9)")
print(f"✅ Doors: {doors} (expected: 1)")
print(f"✅ Floor tiles: {floors}")

# List all ground floor pieces
print("\\nGround floor pieces:")
for actor in all_actors:
    label = actor.get_actor_label()
    if any(x in label for x in ['Corner_F1', 'Wall_', 'Door_']) and 'F2' not in label:
        loc = actor.get_actor_location()
        rot = actor.get_actor_rotation()
        print(f"  {label}: [{loc.x:.0f}, {loc.y:.0f}, {loc.z:.0f}] Yaw={rot.yaw:.0f}°")

result = f"Ground floor complete: {corners} corners, {walls} walls, {doors} doors"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: finalCountCode }
        },
        id: 9
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
        id: 10
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n✅ House analysis and fix complete!');
    
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

analyzeAndFixHouseComplete().catch(console.error);