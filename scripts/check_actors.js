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
  // Take a screenshot
  console.log('Taking screenshot...');
  const screenshotResult = await executeCommand({
    type: 'viewport.screenshot',
    params: {}
  });
  
  if (screenshotResult.success) {
    console.log('Screenshot saved to:', screenshotResult.path);
  }
  
  // List all actors
  const actorsResult = await executeCommand({
    type: 'level.actors',
    params: {}
  });
  
  if (actorsResult.success) {
    console.log(`\nTotal actors: ${actorsResult.actors.length}`);
    
    // Find SM actors
    const smActors = actorsResult.actors.filter(a => a.name.startsWith('SM_'));
    console.log(`\nSM_ actors: ${smActors.length}`);
    
    if (smActors.length > 0) {
      console.log('\nAll SM_ actors:');
      smActors.forEach(actor => {
        console.log(`  ${actor.name} at [${actor.location.x}, ${actor.location.y}, ${actor.location.z}]`);
      });
    }
  }
}

main().catch(console.error);
