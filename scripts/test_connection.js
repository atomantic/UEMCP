const fetch = require('node-fetch');

async function testConnection() {
  try {
    const response = await fetch('http://localhost:8765', {
      method: 'GET',
      timeout: 2000
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Connection successful\!');
      console.log('Server response:', JSON.stringify(data, null, 2));
    } else {
      console.log('Server responded with error:', response.status);
    }
  } catch (error) {
    console.log('Connection failed:', error.message);
    console.log('Make sure the Python listener is running in Unreal Engine');
    console.log('You can start it by running this in the UE Python console:');
    console.log('  from uemcp_helpers import *');
    console.log('  start_listener()');
  }
}

testConnection();
