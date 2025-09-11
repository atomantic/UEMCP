#!/usr/bin/env node

/**
 * Test restart_listener functionality (safe version)
 * This version doesn't fail if the server is initially offline
 */

async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:8765');
    const data = await response.json();
    return data.status === 'online';
  } catch (error) {
    return false;
  }
}

async function sendRestartCommand() {
  try {
    const response = await fetch('http://localhost:8765', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'system.restart',
        params: {}
      })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    // Connection might drop during restart
    return null;
  }
}

async function testRestartListener() {
  console.log('Testing restart_listener functionality (safe version)...\n');
  
  // Check initial status
  console.log('1. Checking server status...');
  let isOnline = await checkServerStatus();
  
  if (!isOnline) {
    console.log('   ⚠️  Server is offline. Please start the listener in Unreal Engine.');
    console.log('   Run this in UE Python console: start_listener()');
    return;
  }
  
  console.log('   ✅ Server is online');
  
  // Send restart command
  console.log('\n2. Sending restart command...');
  const result = await sendRestartCommand();
  
  if (result && result.success) {
    console.log('   ✅ Restart command accepted:', result.message);
  } else if (!result) {
    console.log('   ⚠️  Connection dropped (expected during restart)');
  } else {
    console.log('   ❌ Restart failed:', result.error);
    return;
  }
  
  // Wait for restart
  console.log('\n3. Waiting for server to restart...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if back online
  console.log('\n4. Checking if server is back online...');
  let attempts = 0;
  let backOnline = false;
  
  while (attempts < 10 && !backOnline) {
    backOnline = await checkServerStatus();
    if (!backOnline) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  if (backOnline) {
    console.log('   ✅ Server successfully restarted!');
    
    // Test a command
    console.log('\n5. Testing command execution...');
    try {
      const response = await fetch('http://localhost:8765', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test_connection',
          params: {}
        })
      });
      const data = await response.json();
      if (data.success) {
        console.log('   ✅ Commands working after restart');
      } else {
        console.log('   ❌ Command failed:', data.error);
      }
    } catch (error) {
      console.log('   ❌ Failed to execute command:', error.message);
    }
  } else {
    console.log('   ❌ Server did not come back online');
    console.log('   Check Unreal Engine logs for errors');
  }
  
  console.log('\n' + '='.repeat(50));
  if (backOnline) {
    console.log('✅ Restart test completed successfully');
  } else {
    console.log('❌ Restart test failed - check UE logs');
  }
}

// Run the test
testRestartListener().catch(error => {
  console.error('Fatal error:', error);
});