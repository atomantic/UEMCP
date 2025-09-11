#!/usr/bin/env node

/**
 * Diagnostic test for restart_listener issue
 * This version provides detailed debugging information
 */

const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, error: 'Invalid JSON' });
        }
      });
    });
    
    req.on('error', (e) => {
      resolve({ error: e.message });
    });
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testRestart() {
  console.log('Restart Listener Diagnostic Test\n');
  console.log('='.repeat(50));
  
  // Test 1: Check if server is running
  console.log('\n1. Initial server check...');
  let result = await makeRequest({
    hostname: 'localhost',
    port: 8765,
    path: '/',
    method: 'GET'
  });
  
  if (result.error) {
    console.log('   ❌ Server is offline:', result.error);
    console.log('\n   To start the server:');
    console.log('   1. Open Unreal Engine with UEMCP plugin');
    console.log('   2. In Python console run: start_listener()');
    return;
  }
  
  console.log('   ✅ Server is online');
  console.log('   Version:', result.data.version);
  console.log('   Has manifest:', !!result.data.manifest);
  
  // Test 2: Send restart command
  console.log('\n2. Sending restart command...');
  const restartData = JSON.stringify({
    type: 'system.restart',
    params: {}
  });
  
  result = await makeRequest({
    hostname: 'localhost',
    port: 8765,
    path: '/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': restartData.length
    }
  }, restartData);
  
  if (result.error) {
    console.log('   ⚠️ Connection error (may be normal during restart):', result.error);
  } else if (result.data && result.data.success) {
    console.log('   ✅ Restart scheduled:', result.data.message);
  } else {
    console.log('   ❌ Restart failed:', result.data);
  }
  
  // Test 3: Monitor server status
  console.log('\n3. Monitoring server status...');
  const startTime = Date.now();
  let isBackOnline = false;
  let attempts = 0;
  const maxAttempts = 20; // 10 seconds max
  
  while (attempts < maxAttempts && !isBackOnline) {
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
    
    result = await makeRequest({
      hostname: 'localhost',
      port: 8765,
      path: '/',
      method: 'GET'
    });
    
    if (!result.error && result.data && result.data.status === 'online') {
      isBackOnline = true;
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`   ✅ Server back online after ${elapsed.toFixed(1)}s`);
    } else {
      process.stdout.write('.');
    }
  }
  
  if (!isBackOnline) {
    console.log('\n   ❌ Server did not come back online');
    console.log('   Time waited:', ((Date.now() - startTime) / 1000).toFixed(1) + 's');
    
    // Try to diagnose the issue
    console.log('\n4. Diagnostic information:');
    console.log('   - Check UE Output Log for Python errors');
    console.log('   - Look for "UEMCP: Restarting listener..." message');
    console.log('   - Check for "Server thread did not stop gracefully" error');
    console.log('   - Verify port 8765 is not blocked by another process');
  }
  
  console.log('\n' + '='.repeat(50));
  if (isBackOnline) {
    console.log('✅ Restart test completed successfully');
  } else {
    console.log('❌ Restart test failed - server did not restart');
    console.log('\nTroubleshooting steps:');
    console.log('1. Check UE logs: ~/Library/Logs/Unreal Engine/HomeEditor/Home.log');
    console.log('2. Try manual restart in UE: restart_listener()');
    console.log('3. Check if port 8765 is in use: lsof -i :8765');
  }
}

// Run the test
testRestart().catch(error => {
  console.error('Fatal error:', error);
});