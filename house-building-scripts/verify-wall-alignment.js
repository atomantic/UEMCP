#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function verifyWallAlignment() {
    console.log('🏠 Verifying Wall Alignment\n');
    
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

    // Take wireframe screenshot from top
    console.log('📸 Taking wireframe view from top...\n');
    
    // Set wireframe mode
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'wireframe' }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Set top view
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_mode',
            arguments: { mode: 'top' }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Adjust camera for foundation
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_camera',
            arguments: {
                location: [10760, 660, 1500],
                rotation: [-90, 0, 0]  // Top-down view
            }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: { width: 800, height: 800 }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Now perspective view
    console.log('\n📸 Taking perspective view...\n');
    
    // Set lit mode
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'lit' }
        },
        id: 6
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Set perspective camera
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_camera',
            arguments: {
                location: [9800, -100, 400],
                rotation: [-15, 40, 0]
            }
        },
        id: 7
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
        id: 8
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check for gaps
    console.log('\n🔍 Checking for gaps between pieces...\n');
    
    const gapCheckCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Get all ground floor pieces
ground_pieces = []
for actor in all_actors:
    try:
        label = actor.get_actor_label()
        loc = actor.get_actor_location()
        
        # Ground floor is at Z=140
        if abs(loc.z - 140) < 50 and any(x in label for x in ['Corner_F1', 'Wall_', 'Door_']):
            ground_pieces.append({
                'name': label,
                'location': [loc.x, loc.y, loc.z],
                'bounds': actor.get_actor_bounds(False)[1]  # extent
            })
    except:
        pass  # Skip actors without labels

print("ALIGNMENT CHECK:")
print("=" * 50)

# Check specific adjacencies
adjacencies = [
    ('Corner_F1_NE', 'Wall_North_1', 'Y axis'),
    ('Wall_North_1', 'Wall_North_2', 'Y axis'),
    ('Wall_North_2', 'Wall_North_3', 'Y axis'),
    ('Wall_North_3', 'Corner_F1_NW', 'Y axis'),
    
    ('Corner_F1_NE', 'Wall_East_1', 'X axis'),
    ('Wall_East_1', 'Wall_East_2', 'X axis'),
    ('Wall_East_2', 'Corner_F1_SE', 'X axis'),
]

issues = 0
for piece1_name, piece2_name, axis in adjacencies:
    piece1 = next((p for p in ground_pieces if p['name'] == piece1_name), None)
    piece2 = next((p for p in ground_pieces if p['name'] == piece2_name), None)
    
    if piece1 and piece2:
        if axis == 'Y axis':
            gap = abs(piece2['location'][1] - piece1['location'][1]) - 300
        else:  # X axis
            gap = abs(piece2['location'][0] - piece1['location'][0]) - 300
            
        if abs(gap) > 5:
            print(f"  ❌ Gap between {piece1_name} and {piece2_name}: {gap:.1f} units")
            issues += 1
        else:
            print(f"  ✅ {piece1_name} and {piece2_name} aligned properly")

if issues == 0:
    print("\\n✅ ALL PIECES ARE PROPERLY ALIGNED!")
else:
    print(f"\\n❌ Found {issues} alignment issues")

result = "Alignment checked"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: gapCheckCode }
        },
        id: 9
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('\n✅ Wall alignment verification complete!');
    
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

verifyWallAlignment().catch(console.error);