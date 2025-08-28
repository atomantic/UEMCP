// Node.js 18+ has built-in fetch, no need for node-fetch package

const LISTENER_PORT = process.env.UEMCP_LISTENER_PORT || '8765';
const httpEndpoint = `http://localhost:${LISTENER_PORT}`;

async function executeCommand(command) {
  try {
    const response = await fetch(httpEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      timeout: 10000,
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error body');
      throw new Error(`HTTP ${response.status}: ${response.statusText}. Body: ${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error executing command:', error.message);
    throw error;
  }
}

async function testPythonAndGetInfo() {
  console.log('Testing Python execution and getting asset info...\n');
  
  // First test simple Python execution
  console.log('1. Testing Python execution:');
  const testResult = await executeCommand({
    type: 'python.execute',
    params: {
      code: `
import unreal
print("Python execution working!")
print(f"Project name: {unreal.SystemLibrary.get_project_name()}")
result = {"test": "success"}
`
    }
  });
  console.log('Result:', JSON.stringify(testResult, null, 2));
  
  // Now try to get asset info using the existing asset.info command
  console.log('\n2. Testing asset.info command:');
  const assetInfoResult = await executeCommand({
    type: 'asset.info',
    params: {
      assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m'
    }
  });
  console.log('Result:', JSON.stringify(assetInfoResult, null, 2));
  
  // If asset.info returns bounds, let's calculate dimensions from that
  if (assetInfoResult.success && assetInfoResult.bounds) {
    const size = assetInfoResult.bounds.size;
    console.log('\nCalculated dimensions:');
    console.log(`  Width (X): ${size.x.toFixed(1)} cm (${(size.x/100).toFixed(1)} m)`);
    console.log(`  Depth (Y): ${size.y.toFixed(1)} cm (${(size.y/100).toFixed(1)} m)`);
    console.log(`  Height (Z): ${size.z.toFixed(1)} cm (${(size.z/100).toFixed(1)} m)`);
  }
}

testPythonAndGetInfo().catch(console.error);