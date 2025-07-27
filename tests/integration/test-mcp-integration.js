#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Configuration
// Use environment variable or default to a common location
const PROJECT_PATH = process.env.UE_PROJECT_PATH || path.join(os.homedir(), 'Documents', 'Unreal Projects', 'MyProject');
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');
const CONFIG_PATH = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');

async function main() {
    console.log('🚀 Starting UEMCP MCP Server Test...\n');

    // 1. Start the MCP server
    console.log('📦 Starting MCP server...');
    const serverProcess = spawn('node', [SERVER_PATH], {
        env: {
            ...process.env,
            DEBUG: 'uemcp:*',
            UE_PROJECT_PATH: PROJECT_PATH
        },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`[SERVER] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`[SERVER ERROR] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err) => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });

    // 2. Update Claude Desktop config
    console.log('\n📝 Updating Claude Desktop configuration...');
    try {
        let config = {};
        
        // Try to read existing config
        try {
            const configContent = await fs.readFile(CONFIG_PATH, 'utf8');
            config = JSON.parse(configContent);
        } catch (err) {
            console.log('No existing config found, creating new one...');
        }

        // Add UEMCP server configuration
        if (!config.mcpServers) {
            config.mcpServers = {};
        }

        config.mcpServers.uemcp = {
            command: 'node',
            args: [SERVER_PATH],
            env: {
                UE_PROJECT_PATH: PROJECT_PATH
            }
        };

        // Write updated config
        await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
        await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
        console.log('✅ Claude Desktop configuration updated!');
        console.log(`Configuration written to: ${CONFIG_PATH}`);
        
    } catch (err) {
        console.error('Failed to update Claude Desktop config:', err);
    }

    // 3. Create a test MCP client to verify server is working
    console.log('\n🧪 Testing MCP server connection...');
    
    // Give server time to start
    setTimeout(async () => {
        try {
            // Create a simple test request
            const testRequest = {
                jsonrpc: '2.0',
                method: 'tools/list',
                id: 1
            };

            // Send to server stdin
            serverProcess.stdin.write(JSON.stringify(testRequest) + '\n');
            
            console.log('\n✨ MCP Server is running!');
            console.log('\nTo test with Claude Desktop:');
            console.log('1. Restart Claude Desktop to load the new configuration');
            console.log('2. In a new conversation, try: "Using the UEMCP server, list the assets in my Unreal project"');
            console.log('\nPress Ctrl+C to stop the server.');
            
        } catch (err) {
            console.error('Test failed:', err);
        }
    }, 2000);

    // Handle shutdown
    process.on('SIGINT', () => {
        console.log('\n\n🛑 Shutting down server...');
        serverProcess.kill();
        process.exit(0);
    });
}

main().catch(console.error);