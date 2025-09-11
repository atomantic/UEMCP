#!/usr/bin/env node

/**
 * Test restart_listener functionality
 */

async function testRestartListener() {
  console.log('Testing restart_listener functionality...\n');
  
  try {
    // Check initial status
    console.log('1. Checking initial server status...');
    let response = await fetch('http://localhost:8765');
    let data = await response.json();
    console.log(`   Status: ${data.status}`);
    console.log(`   Version: ${data.version}`);
    
    // Call restart_listener
    console.log('\n2. Calling restart_listener...');
    response = await fetch('http://localhost:8765', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'restart_listener',
        params: {}
      })
    });
    
    // The connection will drop during restart, so we might get an error
    console.log('   Restart command sent (connection may drop)');
    
    // Wait for restart to complete
    console.log('\n3. Waiting for server to restart...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if server is back online
    console.log('\n4. Checking server status after restart...');
    let attempts = 0;
    let online = false;
    
    while (attempts < 10 && !online) {
      try {
        response = await fetch('http://localhost:8765');
        data = await response.json();
        if (data.status === 'online') {
          online = true;
          console.log(`   ✅ Server is back online!`);
          console.log(`   Status: ${data.status}`);
          console.log(`   Version: ${data.version}`);
        }
      } catch (error) {
        // Server not ready yet
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (!online) {
      throw new Error('Server did not come back online after restart');
    }
    
    // Test a command to ensure it's fully functional
    console.log('\n5. Testing command execution after restart...');
    response = await fetch('http://localhost:8765', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'test_connection',
        params: {}
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('   ✅ Command execution successful');
    } else {
      throw new Error('Command execution failed after restart');
    }
    
    console.log('\n✅ restart_listener test PASSED!');
    
  } catch (error) {
    console.error('\n❌ restart_listener test FAILED:', error.message);
    process.exit(1);
  }
}

// Run the test
testRestartListener().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});