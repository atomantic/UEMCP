#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function checkWorldOrientation() {
    console.log('🧭 Checking world orientation...\n');
    
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

    // Check world orientation
    console.log('📊 Analyzing world coordinate system...\n');
    
    const checkOrientationCode = `
import unreal

# In Unreal Engine's default coordinate system:
# X+ = Forward (East in world space)
# Y+ = Right (South in world space) 
# Z+ = Up

# However, this can vary based on project settings and conventions
# Let's check the actual orientation by looking at the sun/directional light

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find directional light (sun)
sun = None
for actor in all_actors:
    if actor.get_class().get_name() == 'DirectionalLight':
        sun = actor
        break

if sun:
    sun_rotation = sun.get_actor_rotation()
    print(f"Directional Light (Sun) rotation: Pitch={sun_rotation.pitch:.1f}, Yaw={sun_rotation.yaw:.1f}, Roll={sun_rotation.roll:.1f}")
    print("\\nNote: In most UE projects, the sun moves from East to West")
    print("If Yaw=0, sun is shining from the East (positive X direction)")

# Find foundation for reference
foundation_loc = None
for actor in all_actors:
    if actor.get_actor_label() == 'HouseFoundation':
        foundation_loc = actor.get_actor_location()
        break

if foundation_loc:
    print(f"\\nFoundation location: X={foundation_loc.x}, Y={foundation_loc.y}")
    print("\\nBased on standard UE conventions:")
    print("- Positive X is typically EAST")
    print("- Negative X is typically WEST")  
    print("- Positive Y is typically SOUTH")
    print("- Negative Y is typically NORTH")
    
    # List corners with their actual positions
    print("\\nCurrent corner positions relative to foundation:")
    for actor in all_actors:
        label = actor.get_actor_label()
        if label.startswith('Corner_F1_'):
            loc = actor.get_actor_location()
            x_rel = "EAST" if loc.x > foundation_loc.x else "WEST"
            y_rel = "SOUTH" if loc.y > foundation_loc.y else "NORTH"
            print(f"{label}: at X={loc.x} ({x_rel}), Y={loc.y} ({y_rel})")
            print(f"  -> Should be: {y_rel}-{x_rel}")

result = "Orientation check complete"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: checkOrientationCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n✅ Orientation check complete!');
    
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

checkWorldOrientation().catch(console.error);