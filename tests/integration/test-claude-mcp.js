#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

const os = require('os');

// Use environment variable or default to a common location
const PROJECT_PATH = process.env.UE_PROJECT_PATH || path.join(os.homedir(), 'Documents', 'Unreal Projects', 'MyProject');
const SERVER_PATH = path.join(__dirname, 'server', 'dist', 'index.js');

async function testMCPWithClaude() {
    console.log('🧪 Testing UEMCP MCP Server with Claude CLI...\n');

    // 1. Start the MCP server in the background
    console.log('📦 Starting MCP server...');
    const serverProcess = spawn('node', [SERVER_PATH], {
        env: {
            ...process.env,
            DEBUG: 'uemcp:*',
            UE_PROJECT_PATH: PROJECT_PATH
        },
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', (data) => {
        console.log(`[SERVER] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`[SERVER ERROR] ${data.toString().trim()}`);
    });

    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
        // 2. Create a test prompt file for Claude
        const testPrompt = `Using the UEMCP MCP server, please:
1. Check if the MCP server is accessible
2. List available tools from the UEMCP server
3. If available, use the project info tool to get information about the Unreal project at: ${PROJECT_PATH}
4. List any assets or components found in the project

Please provide the results of each step.`;

        const promptFile = path.join(__dirname, 'test-prompt.txt');
        await fs.writeFile(promptFile, testPrompt);

        console.log('\n🤖 Sending test request to Claude...');
        console.log('Prompt:', testPrompt);
        console.log('\n---\n');

        // 3. Use Claude CLI to test the MCP integration
        // First, let's check if claude CLI is available
        try {
            const { stdout: versionOut } = await execAsync('claude --version');
            console.log('Claude CLI version:', versionOut.trim());
        } catch (err) {
            console.error('Claude CLI not found. Please install it first: npm install -g @anthropic-ai/claude-cli');
            throw err;
        }

        // 4. Send the prompt to Claude with MCP server configured
        const claudeProcess = spawn('claude', ['--file', promptFile], {
            env: {
                ...process.env,
                CLAUDE_MCP_SERVERS: JSON.stringify({
                    uemcp: {
                        command: 'node',
                        args: [SERVER_PATH],
                        env: {
                            UE_PROJECT_PATH: PROJECT_PATH
                        }
                    }
                })
            },
            stdio: 'pipe'
        });

        let output = '';
        claudeProcess.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            process.stdout.write(text);
        });

        claudeProcess.stderr.on('data', (data) => {
            console.error(`[CLAUDE ERROR] ${data.toString()}`);
        });

        await new Promise((resolve, reject) => {
            claudeProcess.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Claude process exited with code ${code}`));
                }
            });
            claudeProcess.on('error', reject);
        });

        console.log('\n\n✅ Test completed!');
        
        // Clean up
        await fs.unlink(promptFile).catch(() => {});

    } catch (err) {
        console.error('\n❌ Test failed:', err.message);
    } finally {
        // Stop the server
        console.log('\n🛑 Stopping MCP server...');
        serverProcess.kill();
    }
}

// Alternative test using direct MCP communication
async function directMCPTest() {
    console.log('\n📡 Direct MCP Communication Test\n');

    const serverProcess = spawn('node', [SERVER_PATH], {
        env: {
            ...process.env,
            DEBUG: 'uemcp:*',
            UE_PROJECT_PATH: PROJECT_PATH
        },
        stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Send MCP requests
    const requests = [
        {
            jsonrpc: '2.0',
            method: 'initialize',
            params: {
                protocolVersion: '0.1.0',
                capabilities: {}
            },
            id: 1
        },
        {
            jsonrpc: '2.0',
            method: 'tools/list',
            id: 2
        },
        {
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
                name: 'project_info',
                arguments: {
                    projectPath: PROJECT_PATH
                }
            },
            id: 3
        }
    ];

    let responses = [];
    serverProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
            try {
                const response = JSON.parse(line);
                if (response.jsonrpc) {
                    responses.push(response);
                    console.log('Response:', JSON.stringify(response, null, 2));
                }
            } catch (err) {
                console.log('[SERVER]', line);
            }
        }
    });

    serverProcess.stderr.on('data', (data) => {
        console.error('[ERROR]', data.toString());
    });

    // Send requests
    for (const request of requests) {
        console.log('\nSending:', JSON.stringify(request, null, 2));
        serverProcess.stdin.write(JSON.stringify(request) + '\n');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Wait for responses
    await new Promise(resolve => setTimeout(resolve, 2000));

    serverProcess.kill();
    console.log('\n✅ Direct MCP test completed');
}

// Main execution
async function main() {
    console.log('🚀 UEMCP MCP Integration Test Suite\n');
    console.log('Project Path:', PROJECT_PATH);
    console.log('Server Path:', SERVER_PATH);
    console.log('\n---\n');

    // Run direct MCP test first
    await directMCPTest().catch(console.error);

    // Then try Claude CLI test if available
    console.log('\n---\n');
    await testMCPWithClaude().catch(err => {
        console.log('\n💡 Claude CLI test skipped:', err.message);
        console.log('\nTo test with Claude Desktop instead:');
        console.log('1. Make sure Claude Desktop is restarted');
        console.log('2. In a new conversation, ask Claude to use the UEMCP server');
    });
}

main().catch(console.error);