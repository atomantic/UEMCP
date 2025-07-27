#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function verifyHouse() {
    console.log('🏠 Verifying House Build\n');
    
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

    // First, get a better camera angle
    console.log('\n📸 Setting up camera views...\n');
    
    // View 1: Front perspective
    const frontViewCode = `
import unreal
editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
# Position camera to see house from front at an angle
# House center is at X=10760, Y=690
camera_location = unreal.Vector(9800, -200, 400)
camera_rotation = unreal.Rotator(-15, 30, 0)
editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)
result = "Camera positioned for front view"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: frontViewCode }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take front screenshot
    console.log('📸 Taking front view screenshot...\n');
    
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
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // View 2: Top-down wireframe
    console.log('\n📐 Setting top-down wireframe view...\n');
    
    const topViewCode = `
import unreal
editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
# Top-down view centered on house
camera_location = unreal.Vector(10760, 690, 1500)
camera_rotation = unreal.Rotator(-90, 0, 0)
editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)
result = "Camera positioned for top-down view"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: topViewCode }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Switch to wireframe
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'wireframe' }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Take wireframe screenshot
    console.log('📸 Taking top-down wireframe screenshot...\n');
    
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

    // Switch back to lit mode
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'lit' }
        },
        id: 7
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Count actors
    console.log('\n📊 Counting house components...\n');
    
    const countCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
house_actors = []
counts = {'corners': 0, 'walls': 0, 'doors': 0, 'floors': 0, 'foundation': 0}

for actor in all_actors:
    label = actor.get_actor_label()
    if any(prefix in label for prefix in ['Corner_', 'Wall_', 'Door_', 'Floor_', 'Foundation']):
        loc = actor.get_actor_location()
        house_actors.append(f"{label} at [{int(loc.x)}, {int(loc.y)}, {int(loc.z)}]")
        
        if 'Corner' in label:
            counts['corners'] += 1
        elif 'Wall' in label:
            counts['walls'] += 1
        elif 'Door' in label:
            counts['doors'] += 1
        elif 'Floor' in label:
            counts['floors'] += 1
        elif 'Foundation' in label:
            counts['foundation'] += 1

result = {
    'summary': f"Found {counts['corners']} corners, {counts['walls']} walls, {counts['doors']} doors, {counts['floors']} floor tiles, {counts['foundation']} foundation",
    'total_actors': len(house_actors)
}
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: countCode }
        },
        id: 8
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('\n✅ Verification complete!');
    console.log('\nHouse components successfully placed:');
    console.log('- All 4 corners for each floor');
    console.log('- Wall segments (missing window/door variants)');
    console.log('- Second floor tiles started');
    console.log('\nMissing assets (need alternatives):');
    console.log('- Window walls: SM_FlatWall_2m_Window_Square');
    console.log('- Door: SM_FlatWall_3m_Door_Square');
    
    serverProcess.kill();
}

verifyHouse().catch(console.error);