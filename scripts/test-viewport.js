const { MCPClient } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/transport.js');
const { spawn } = require('child_process');

async function testViewport() {
  console.log('Testing viewport controls...');
  
  const serverPath = require.resolve('./server/dist/index.js');
  const serverProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      DEBUG: 'uemcp:*'
    }
  });

  const transport = new StdioClientTransport({
    stdioServiceProcess: serverProcess,
    readable: serverProcess.stdout,
    writable: serverProcess.stdin
  });

  const client = new MCPClient({
    name: 'viewport-test-client',
    version: '1.0.0'
  });

  try {
    await client.connect(transport);
    console.log('Connected to UEMCP server');

    // 1. Switch to top viewport mode
    console.log('\n1. Switching to top viewport mode...');
    const modeResult = await client.callTool({
      name: 'viewport_mode',
      arguments: { mode: 'top' }
    });
    console.log('Viewport mode result:', modeResult.content[0].text);

    // 2. Position camera above the house
    console.log('\n2. Positioning camera above house...');
    const cameraResult = await client.callTool({
      name: 'viewport_camera',
      arguments: {
        location: [10760, 690, 2000],
        rotation: [-90, 0, 0]  // Pitch=-90 for looking straight down
      }
    });
    console.log('Camera position result:', cameraResult.content[0].text);

    // 3. Take screenshot
    console.log('\n3. Taking screenshot...');
    const screenshotResult = await client.callTool({
      name: 'viewport_screenshot',
      arguments: {}
    });
    console.log('Screenshot result:', screenshotResult.content[0].text);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    serverProcess.kill();
    process.exit(0);
  }
}

testViewport().catch(console.error);