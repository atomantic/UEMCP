#!/usr/bin/env node

const http = require('http');

async function callTool(toolName, params) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      type: toolName,
      params: params
    });

    const options = {
      hostname: 'localhost',
      port: 8765,
      path: '/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    console.log('Testing viewport controls...\n');

    // 1. Switch to top viewport mode
    console.log('1. Switching to top viewport mode...');
    const modeResult = await callTool('viewport.mode', { mode: 'top' });
    console.log('Result:', modeResult.success ? 'Success' : 'Failed');
    if (modeResult.error) console.log('Error:', modeResult.error);
    
    // 2. Position camera above the house
    console.log('\n2. Positioning camera above house...');
    console.log('   Location: [10760, 690, 2000]');
    console.log('   Rotation: [-90, 0, 0] (Pitch=-90 for looking straight down)');
    const cameraResult = await callTool('viewport.camera', {
      location: [10760, 690, 2000],
      rotation: [-90, 0, 0]
    });
    console.log('Result:', cameraResult.success ? 'Success' : 'Failed');
    if (cameraResult.error) console.log('Error:', cameraResult.error);
    
    // 3. Take screenshot
    console.log('\n3. Taking screenshot...');
    const screenshotResult = await callTool('viewport.screenshot', {});
    console.log('Result:', screenshotResult.success ? 'Success' : 'Failed');
    if (screenshotResult.data && screenshotResult.data.path) {
      console.log('Screenshot saved to:', screenshotResult.data.path);
    }
    if (screenshotResult.error) console.log('Error:', screenshotResult.error);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();