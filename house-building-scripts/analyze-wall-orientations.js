#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function analyzeWallOrientations() {
    console.log('🔍 Analyzing Wall Orientations\n');
    
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

    // Analyze wall orientations
    const analysisCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

print("WALL ORIENTATION ANALYSIS")
print("=" * 70)

# Group walls by side
north_walls = []
south_walls = []
east_walls = []
west_walls = []

for actor in all_actors:
    label = actor.get_actor_label()
    if 'Wall_' in label and abs(actor.get_actor_location().z - 140) < 50:
        loc = actor.get_actor_location()
        rot = actor.get_actor_rotation()
        
        # Determine which side based on position
        if 'North' in label or abs(loc.x - 10260) < 50:
            north_walls.append((label, loc, rot))
        elif 'South' in label or abs(loc.x - 11260) < 50:
            south_walls.append((label, loc, rot))
        elif 'East' in label or abs(loc.y - 260) < 50:
            east_walls.append((label, loc, rot))
        elif 'West' in label or abs(loc.y - 1060) < 50:
            west_walls.append((label, loc, rot))

# Analyze each side
print("\\n1. NORTH WALLS (should face south into building):")
for label, loc, rot in sorted(north_walls):
    print(f"  {label}: Yaw={rot.yaw:.1f}° at [{loc.x:.0f}, {loc.y:.0f}]")

print("\\n2. SOUTH WALLS (should face north into building):")
for label, loc, rot in sorted(south_walls):
    print(f"  {label}: Yaw={rot.yaw:.1f}° at [{loc.x:.0f}, {loc.y:.0f}]")

print("\\n3. EAST WALLS (should face west into building):")
for label, loc, rot in sorted(east_walls):
    print(f"  {label}: Yaw={rot.yaw:.1f}° at [{loc.x:.0f}, {loc.y:.0f}]")

print("\\n4. WEST WALLS (should face east into building):")
for label, loc, rot in sorted(west_walls):
    print(f"  {label}: Yaw={rot.yaw:.1f}° at [{loc.x:.0f}, {loc.y:.0f}]")

# Test placing a wall to see default orientation
print("\\n\\nTEST: Placing test wall to check default orientation...")

# Spawn a test wall at origin
test_asset = unreal.EditorAssetLibrary.load_asset('/Game/ModularOldTown/Meshes/SM_Old_Town_V2_M_Wall_Window_V1')
if test_asset:
    test_location = unreal.Vector(10000, 0, 0)
    test_rotation = unreal.Rotator()  # No rotation
    test_rotation.pitch = 0.0
    test_rotation.yaw = 0.0
    test_rotation.roll = 0.0
    
    test_wall = unreal.EditorLevelLibrary.spawn_actor_from_object(
        test_asset,
        test_location,
        test_rotation
    )
    
    if test_wall:
        test_wall.set_actor_label('TEST_Wall_Default_Orientation')
        
        # Get wall bounds to understand orientation
        bounds = test_wall.get_actor_bounds(False)
        extent = bounds[1]
        
        print(f"\\nTest wall spawned with NO rotation:")
        print(f"  Bounds: X={extent.x:.1f}, Y={extent.y:.1f}, Z={extent.z:.1f}")
        print(f"  Larger dimension: {'X' if extent.x > extent.y else 'Y'}")
        print(f"  This means wall runs along {'X-axis (North-South)' if extent.x > extent.y else 'Y-axis (East-West)'}")
        
        # Check which way the "front" faces by looking at mesh orientation
        # We'll need to visually verify this
        print("\\nVISUAL CHECK NEEDED: Which way does the window/door opening face?")
        print("(Take a screenshot to verify)")

# Calculate correct rotations
print("\\n\\nRECOMMENDED ROTATIONS:")
print("Based on typical modular asset orientation where walls face +Y by default:")
print("  North walls (face south/+X): Yaw = 180°")
print("  South walls (face north/-X): Yaw = 0°") 
print("  East walls (face west/+Y): Yaw = 90°")
print("  West walls (face east/-Y): Yaw = -90° (or 270°)")

result = "Analysis complete"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: analysisCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot of test wall
    console.log('\n📸 Taking screenshot of test wall...\n');
    
    // Focus on test wall
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_focus',
            arguments: { actorName: 'TEST_Wall_Default_Orientation' }
        },
        id: 3
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
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('\n✅ Analysis complete!');
    
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

analyzeWallOrientations().catch(console.error);