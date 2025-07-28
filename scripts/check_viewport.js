const fetch = require('node-fetch');

async function executeCommand(command) {
  const response = await fetch('http://localhost:8765', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  return await response.json();
}

async function main() {
  // Set camera to look at origin from a better angle
  console.log('Setting viewport camera...');
  await executeCommand({
    type: 'viewport.camera',
    params: {
      location: { x: 2000, y: -2000, z: 1500 },
      rotation: { pitch: -30, yaw: 45, roll: 0 }
    }
  });
  
  // Take screenshot
  console.log('Taking screenshot...');
  const screenshotResult = await executeCommand({
    type: 'viewport.screenshot',
    params: { 
      width: 1280, 
      height: 720,
      compress: false 
    }
  });
  
  if (screenshotResult.success) {
    console.log('Screenshot path:', screenshotResult.path);
  }
  
  // Check project info
  console.log('\nChecking project info...');
  const projectResult = await executeCommand({
    type: 'project.info',
    params: {}
  });
  
  if (projectResult.success) {
    console.log('Project:', projectResult.project);
  }
}

main().catch(console.error);
