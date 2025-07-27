#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function testViewportAndPlacement() {
    console.log('🔧 Testing Viewport Focus and Placement\n');
    
    const serverProcess = spawn('node', [SERVER_PATH], {
        env: {
            ...process.env,
            DEBUG: 'uemcp:*',
            UE_PROJECT_PATH: PROJECT_PATH
        },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
            try {
                const response = JSON.parse(line);
                if (response.jsonrpc && response.result) {
                    if (response.result.content) {
                        response.result.content.forEach(content => {
                            console.log(content.text);
                        });
                    }
                }
            } catch (err) {}
        }
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

    // Test 1: Focus on foundation
    console.log('\n📍 Test 1: Testing viewport focus on HouseFoundation...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_focus',
            arguments: { actorName: 'HouseFoundation' }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Place a test corner to understand pivot point
    console.log('\n🧪 Test 2: Placing test corner at exact foundation corner...\n');
    
    // Place at what should be the front-left corner of foundation
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_spawn',
            arguments: {
                assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner',
                actorName: 'Test_Corner_1',
                location: [8260, -1810, 140],  // Exact corner of foundation
                rotation: [0, 0, 0]
            }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Check where it actually appeared
    console.log('\n🔍 Test 3: Checking actual placement...\n');
    
    const checkCode = `
import unreal

# Find our test corner
test_actor = None
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
for actor in all_actors:
    if actor.get_actor_label() == 'Test_Corner_1':
        test_actor = actor
        break

if test_actor:
    loc = test_actor.get_actor_location()
    bounds = test_actor.get_actor_bounds(only_colliding_components=False)
    origin = bounds[0]  # Origin
    extent = bounds[1]  # Box extent
    
    min_bound = unreal.Vector(
        origin.x - extent.x,
        origin.y - extent.y,
        origin.z - extent.z
    )
    max_bound = unreal.Vector(
        origin.x + extent.x,
        origin.y + extent.y,
        origin.z + extent.z
    )
    
    result = {
        'found': True,
        'actor_location': f"[{loc.x}, {loc.y}, {loc.z}]",
        'bounds_origin': f"[{origin.x}, {origin.y}, {origin.z}]",
        'bounds_extent': f"[{extent.x}, {extent.y}, {extent.z}]",
        'min_corner': f"[{min_bound.x}, {min_bound.y}, {min_bound.z}]",
        'max_corner': f"[{max_bound.x}, {max_bound.y}, {max_bound.z}]",
        'pivot_offset': f"Actor location vs bounds origin: [{loc.x - origin.x}, {loc.y - origin.y}, {loc.z - origin.z}]"
    }
else:
    result = {'found': False, 'error': 'Test corner not found'}
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: checkCode }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Take screenshot
    console.log('\n📸 Taking screenshot of test placement...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {
                width: 1920,
                height: 1080,
                compress: false
            }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n✅ Test complete!');
    console.log('\nKey findings:');
    console.log('- Check if viewport focus now works correctly');
    console.log('- Verify where the corner piece actually appears relative to specified location');
    console.log('- This will help us understand the pivot point behavior');
    
    serverProcess.kill();
}

testViewportAndPlacement().catch(console.error);