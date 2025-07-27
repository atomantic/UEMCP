#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function checkHouseProperly() {
    console.log('🏠 Properly Checking House Construction\n');
    
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

    // First, focus on the foundation
    console.log('\n🎯 Focusing viewport on HouseFoundation...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_focus',
            arguments: { 
                actorName: 'HouseFoundation',
                distance: 2000
            }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Take isometric view screenshot
    console.log('📸 Taking isometric view...\n');
    
    const isometricCode = `
import unreal
editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
# Isometric view of house
camera_location = unreal.Vector(9500, -500, 800)
camera_rotation = unreal.Rotator(-30, 45, 0)  # Angled down, turned to see corner
editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)
result = "Set isometric view"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: isometricCode }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

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

    // Now proper top-down view
    console.log('\n📐 Setting CORRECT top-down view...\n');
    
    const topDownCode = `
import unreal
editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
# CORRECT top-down view - Pitch=-90, not Roll!
camera_location = unreal.Vector(10760, 690, 2000)
camera_rotation = unreal.Rotator(-90, 0, 0)  # Pitch=-90, Yaw=0, Roll=0
editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)
result = f"Set proper top-down view: {camera_rotation}"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: topDownCode }
        },
        id: 5
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
        id: 6
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Take wireframe screenshot
    console.log('📸 Taking proper top-down wireframe view...\n');
    
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
        id: 7
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Switch back to lit
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'lit' }
        },
        id: 8
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Take lit top-down screenshot
    console.log('📸 Taking lit top-down view...\n');
    
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
        id: 9
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get detailed actor count
    console.log('\n📊 Getting detailed house inventory...\n');
    
    const inventoryCode = `
import unreal

all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
house_parts = {
    'corners_gf': [],
    'corners_2f': [],
    'walls': [],
    'doors': [],
    'floors': [],
    'foundation': []
}

for actor in all_actors:
    name = actor.get_actor_label()
    loc = actor.get_actor_location()
    
    if 'HouseFoundation' in name:
        house_parts['foundation'].append(name)
    elif 'Corner_GF' in name:
        house_parts['corners_gf'].append(f"{name} at Z={int(loc.z)}")
    elif 'Corner_2F' in name:
        house_parts['corners_2f'].append(f"{name} at Z={int(loc.z)}")
    elif 'Wall' in name:
        house_parts['walls'].append(f"{name} at Z={int(loc.z)}")
    elif 'Door' in name:
        house_parts['doors'].append(name)
    elif 'Floor_2F' in name:
        house_parts['floors'].append(name)

summary = []
for category, items in house_parts.items():
    if items:
        summary.append(f"{category}: {len(items)} pieces")

result = {
    'summary': ', '.join(summary),
    'ground_floor_corners': len(house_parts['corners_gf']),
    'second_floor_corners': len(house_parts['corners_2f']),
    'total_walls': len(house_parts['walls']),
    'total_floor_tiles': len(house_parts['floors'])
}
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: inventoryCode }
        },
        id: 10
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('\n✅ House check complete with proper camera views!');
    console.log('\nKey improvements:');
    console.log('- Used viewport_focus to center on foundation');
    console.log('- Set camera rotation correctly (Pitch, not Roll)');
    console.log('- Captured multiple useful angles');
    
    serverProcess.kill();
}

checkHouseProperly().catch(console.error);