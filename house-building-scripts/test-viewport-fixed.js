#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const PROJECT_PATH = '/Users/antic/Documents/Unreal Projects/Home/Home.uproject';
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function testViewportFixed() {
    console.log('🎬 Testing Viewport Controls After Fix\n');
    
    const serverProcess = spawn('node', [SERVER_PATH], {
        env: {
            ...process.env,
            DEBUG: 'uemcp:*',
            UE_PROJECT_PATH: PROJECT_PATH
        },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let outputBuffer = '';
    serverProcess.stdout.on('data', (data) => {
        outputBuffer += data.toString();
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

    serverProcess.stderr.on('data', (data) => {
        console.error('Error:', data.toString());
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

    // Test 1: Switch to wireframe view
    console.log('\n📐 Test 1: Switching to wireframe view...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'wireframe' }
        },
        id: 2
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test 2: Set camera to top-down view
    console.log('\n📐 Test 2: Setting top-down camera view...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_camera',
            arguments: {
                location: [12090, 830, 2500],
                rotation: [-90, 0, 0]  // Looking straight down
            }
        },
        id: 3
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test 3: Take screenshot
    console.log('\n📸 Test 3: Taking top-down wireframe screenshot...\n');
    
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

    // Test 4: Switch back to lit mode
    console.log('\n💡 Test 4: Switching back to lit mode...\n');
    
    serverProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
            name: 'viewport_render_mode',
            arguments: { mode: 'lit' }
        },
        id: 5
    }) + '\n');
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test 5: Take lit screenshot
    console.log('\n📸 Test 5: Taking top-down lit screenshot...\n');
    
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

    // Check for any errors in output
    if (outputBuffer.includes('deprecation') || outputBuffer.includes('error')) {
        console.log('\n⚠️  Found issues in output:');
        const errorLines = outputBuffer.split('\n').filter(line => 
            line.toLowerCase().includes('error') || 
            line.toLowerCase().includes('deprecation')
        );
        errorLines.forEach(line => console.log('  -', line.trim()));
    } else {
        console.log('\n✅ All viewport controls working without errors!');
    }

    console.log('\n✨ Viewport control test complete!');
    console.log('\nCheck the screenshots to verify:');
    console.log('1. Wireframe view shows clear structure');
    console.log('2. Top-down perspective shows complete ground floor');
    console.log('3. No gaps between walls and corners');
    
    serverProcess.kill();
}

testViewportFixed().catch(console.error);