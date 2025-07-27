#!/usr/bin/env node

/**
 * Test live communication with Unreal Engine
 * Make sure uemcp_listener is running in UE first!
 */

const http = require('http');

function sendCommand(command) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(command);
        
        const options = {
            hostname: 'localhost',
            port: 8765,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        
        const req = http.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });
        
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function testLiveConnection() {
    console.log('🔌 Testing Live UEMCP Connection to Unreal Engine...\n');
    
    try {
        // 1. Check if listener is running
        console.log('1️⃣ Checking listener status...');
        const response = await fetch('http://localhost:8765');
        const status = await response.json();
        console.log('✅ Listener is running!');
        console.log(`   Project: ${status.project}`);
        console.log(`   Engine: ${status.engine_version}\n`);
        
        // 2. Get project info
        console.log('2️⃣ Getting project information...');
        const projectInfo = await sendCommand({
            type: 'project.info',
            params: {}
        });
        console.log('✅ Project info retrieved:', projectInfo);
        
        // 3. List some assets
        console.log('\n3️⃣ Listing game assets...');
        const assets = await sendCommand({
            type: 'asset.list',
            params: { path: '/Game', limit: 5 }
        });
        console.log(`✅ Found ${assets.totalCount} assets. First 5:`);
        assets.assets.forEach(asset => {
            console.log(`   - ${asset.name} (${asset.type})`);
        });
        
        // 4. Create a test actor
        console.log('\n4️⃣ Creating a test cube in the level...');
        const actor = await sendCommand({
            type: 'actor.create',
            params: {
                type: 'cube',
                location: [200, 0, 100],
                name: 'Claude_TestCube'
            }
        });
        console.log('✅ Actor created:', actor);
        
        console.log('\n🎉 Live communication with Unreal Engine is working!');
        console.log('   Claude can now control your Unreal project.');
        
    } catch (error) {
        console.error('\n❌ Connection failed:', error.message);
        console.log('\nMake sure:');
        console.log('1. Unreal Editor is running with DemoMaze project');
        console.log('2. Python console has run: import uemcp_listener; uemcp_listener.start_listener()');
        console.log('3. No firewall is blocking localhost:8765');
    }
}

// Run the test
testLiveConnection();