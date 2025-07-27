#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function verifyGroundFloor() {
    console.log('🏠 Ground Floor Final Verification\n');
    
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

    // First, use python_proxy to properly set top-down view
    console.log('\n📐 Setting proper top-down view using python_proxy...\n');
    
    const topViewCode = `
import unreal

# Get the level editor subsystem
level_editor = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
viewport = level_editor.get_active_viewport_config_key()

# Set camera to true top-down position
# House center is at approximately X=12090, Y=830
camera_location = unreal.Vector(12090, 830, 3000)  # High above
camera_rotation = unreal.Rotator(-90, 0, 0)  # Looking straight down

# Use the UnrealEditorSubsystem for viewport control
editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)

result = f"Camera set to top-down view at {camera_location} with rotation {camera_rotation}"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: topViewCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Switch to wireframe
    console.log('\n🔲 Switching to wireframe mode...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'wireframe' }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take wireframe screenshot
    console.log('\n📸 Taking top-down wireframe screenshot...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {
                width: 1920,
                height: 1080,
                screenPercentage: 100,
                compress: false
            }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Switch to lit mode
    console.log('\n💡 Switching to lit mode...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'lit' }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take lit screenshot
    console.log('\n📸 Taking top-down lit screenshot...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_screenshot',
            arguments: {
                width: 1920,
                height: 1080,
                screenPercentage: 100,
                compress: false
            }
        },
        id: 6
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get actor count summary
    console.log('\n📊 Verifying actor counts...\n');
    
    const verifyCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
counts = {'corners': 0, 'walls': 0, 'doors': 0}

for actor in all_actors:
    label = actor.get_actor_label()
    if 'Corner' in label:
        counts['corners'] += 1
    elif 'Wall' in label:
        counts['walls'] += 1
    elif 'Door' in label:
        counts['doors'] += 1

result = f"Ground floor has {counts['corners']} corners, {counts['walls']} walls, {counts['doors']} doors"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: verifyCode }
        },
        id: 7
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('\n✅ Ground Floor Verification Complete!');
    console.log('\nExpected components:');
    console.log('- 4 corner pieces (one at each corner)');
    console.log('- 14 wall pieces (4 per side minus door spaces)');
    console.log('- 1-3 door pieces (depends on duplicates)');
    console.log('\nAll walls should connect seamlessly with corners.');
    
    serverProcess.kill();
}

verifyGroundFloor().catch(console.error);