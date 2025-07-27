#!/usr/bin/env node

const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');
const PLAN_FILE = path.join(__dirname, 'house_placement_plan_final.tsv');

async function executePlan() {
    console.log('🏗️ Executing House Construction Plan\n');
    
    // Read the TSV plan
    const planContent = fs.readFileSync(PLAN_FILE, 'utf-8');
    const lines = planContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    const [header, ...dataLines] = lines;
    
    const actors = dataLines.map(line => {
        const parts = line.split('\t');
        return {
            name: parts[0],
            asset: parts[1],
            location: [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])],
            rotation: [parseFloat(parts[5]), parseFloat(parts[6]), parseFloat(parts[7])],
            notes: parts[8]
        };
    });
    
    console.log(`📋 Found ${actors.length} actors to place\n`);
    
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

    // Create folder structure
    console.log('📁 Creating folder structure...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_spawn',
            arguments: {
                assetPath: '/Engine/BasicShapes/Cube',
                actorName: 'TempFolder',
                location: [0, 0, -1000],
                folderPath: 'House/GroundFloor'
            }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'actor_delete',
            arguments: { actorName: 'TempFolder' }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 500));

    // Place actors according to plan
    let id = 10;
    for (const actor of actors) {
        // Determine folder based on name
        let folder = 'House/';
        if (actor.name.includes('GF') || actor.name.includes('Wall') && !actor.name.includes('2F')) {
            folder += 'GroundFloor';
        } else if (actor.name.includes('2F') || actor.name.includes('Floor_2F')) {
            folder += 'SecondFloor';
        }
        
        console.log(`🔨 Placing ${actor.name} at [${actor.location.join(', ')}]`);
        
        serverProcess.stdin.write(JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
                name: 'actor_spawn',
                arguments: {
                    assetPath: actor.asset,
                    actorName: actor.name,
                    location: actor.location,
                    rotation: actor.rotation,
                    folderPath: folder
                }
            },
            id: id++
        }) + '\n');
        
        // Small delay between placements
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Save the level
    console.log('\n💾 Saving level...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'level_save',
            arguments: {}
        },
        id: id++
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Take final screenshot
    console.log('📸 Taking final screenshot...\n');
    
    // Set camera to good viewing angle
    const cameraCode = `
import unreal
editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
# Position camera to see the house from front-left angle
camera_location = unreal.Vector(9500, -500, 600)
camera_rotation = unreal.Rotator(-20, 45, 0)
editor_subsystem.set_level_viewport_camera_info(camera_location, camera_rotation)
result = "Camera positioned for house view"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: cameraCode }
        },
        id: id++
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
        id: id++
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✨ House construction complete!');
    console.log('\nBuilt:');
    console.log(`- ${actors.filter(a => a.name.includes('Corner')).length} corner pieces`);
    console.log(`- ${actors.filter(a => a.name.includes('Wall')).length} wall pieces`);
    console.log(`- ${actors.filter(a => a.name.includes('Door')).length} door pieces`);
    console.log(`- ${actors.filter(a => a.name.includes('Floor')).length} floor pieces`);
    
    serverProcess.kill();
}

executePlan().catch(console.error);