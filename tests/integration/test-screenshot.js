#!/usr/bin/env node

const { MCPClient } = require('@modelcontextprotocol/client');
const { StdioClientTransport } = require('@modelcontextprotocol/client/stdio');
const path = require('path');

async function testScreenshot() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.join(__dirname, 'server/dist/index.js')],
    env: { 
      DEBUG: 'uemcp:*',
      UE_PROJECT_PATH: '/Users/antic/Documents/Unreal Projects/Home/Home.uproject'
    }
  });
  
  const client = new MCPClient({
    name: 'test-client',
    version: '1.0.0'
  }, { transport });

  try {
    await client.connect();
    console.log('Connected to MCP server');
    
    // Take screenshot
    console.log('Taking viewport screenshot...');
    const result = await client.callTool('viewport_screenshot', {
      width: 1280,
      height: 720,
      compress: false
    });
    
    console.log('\nScreenshot result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testScreenshot().catch(console.error);