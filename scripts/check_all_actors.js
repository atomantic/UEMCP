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
  // First take a screenshot
  console.log('Taking screenshot of current level...');
  const screenshotResult = await executeCommand({
    type: 'viewport.screenshot',
    params: {}
  });
  
  if (screenshotResult.success) {
    console.log('Screenshot saved to:', screenshotResult.path);
  }
  
  // Now list all actors to see what's actually in the level
  console.log('\nListing all actors in level...');
  const actorsResult = await executeCommand({
    type: 'level.actors',
    params: {}
  });
  
  if (actorsResult.success) {
    console.log(`Total actors: ${actorsResult.actors.length}`);
    
    // Group actors by type
    const actorsByType = {};
    actorsResult.actors.forEach(actor => {
      const type = actor.name.split('_')[0];
      if (\!actorsByType[type]) {
        actorsByType[type] = [];
      }
      actorsByType[type].push(actor);
    });
    
    console.log('\nActors by type:');
    Object.entries(actorsByType).forEach(([type, actors]) => {
      console.log(`  ${type}: ${actors.length} actors`);
      if (type === 'SM' && actors.length < 10) {
        actors.forEach(a => console.log(`    - ${a.name}`));
      }
    });
  }
}

main().catch(console.error);
