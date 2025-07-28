#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, '..', 'server', 'dist', 'index.js');

async function testViewportFix() {
    console.log('🔧 Testing viewport rotation fix\n');
    
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

    // Restart listener to load the fix
    console.log('📡 Restarting listener with updated code...\n');
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'restart_listener',
            arguments: {}
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test viewport.mode with top view
    console.log('📷 Testing viewport.mode top view...\n');
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

    // Verify camera rotation
    console.log('🔍 Verifying camera rotation...\n');
    const verifyCode = `
import unreal

editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
location, rotation = editor_subsystem.get_level_viewport_camera_info()

print("\\nCurrent Viewport Rotation:")
print(f"  Pitch: {rotation.pitch:.1f}° (up/down tilt)")
print(f"  Yaw: {rotation.yaw:.1f}° (left/right turn)")
print(f"  Roll: {rotation.roll:.1f}° (sideways tilt)")

# Check if top view is correct
if abs(rotation.pitch - (-90)) < 1 and abs(rotation.roll) < 1:
    print("\\n✅ TOP VIEW CORRECTLY SET!")
    print("Pitch is -90° (looking down) and Roll is 0° (no tilt)")
else:
    print("\\n❌ ISSUE DETECTED!")
    if abs(rotation.roll - (-90)) < 1:
        print("Roll is -90° instead of Pitch! The bug still exists.")
    else:
        print("Unexpected rotation values.")

result = "Viewport rotation verified"
`;

    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { code: verifyCode }
        },
        id: 4
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test viewport.camera with explicit rotation
    console.log('\n📷 Testing viewport.camera with rotation [Pitch=-30, Yaw=45, Roll=0]...\n');
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_camera',
            arguments: {
                location: [10000, 500, 500],
                rotation: [-30, 45, 0]  // Pitch, Yaw, Roll
            }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify camera rotation again
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'python_proxy',
            arguments: { 
                code: `
import unreal
editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
location, rotation = editor_subsystem.get_level_viewport_camera_info()
print("\\nAfter viewport.camera test:")
print(f"  Pitch: {rotation.pitch:.1f}° (expected: -30°)")
print(f"  Yaw: {rotation.yaw:.1f}° (expected: 45°)")
print(f"  Roll: {rotation.roll:.1f}° (expected: 0°)")

if abs(rotation.pitch - (-30)) < 1 and abs(rotation.yaw - 45) < 1 and abs(rotation.roll) < 1:
    print("\\n✅ VIEWPORT.CAMERA CORRECTLY SET!")
else:
    print("\\n❌ VIEWPORT.CAMERA HAS ISSUES!")
result = "Test complete"
`
            }
        },
        id: 6
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('\n✅ Viewport rotation fix tested!');
    console.log('\nIMPORTANT: The fix is now in the MCP plugin code.');
    console.log('All viewport operations will use explicit property setting to avoid Roll issues.\n');
    
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

testViewportFix().catch(console.error);