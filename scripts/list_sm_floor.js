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
  // List all SM_Floor actors specifically
  const result = await executeCommand({
    type: 'level.actors',
    params: {
      filter: 'SM_Floor'
    }
  });
  
  if (result.success) {
    console.log('SM_Floor actors in level:', result.actors.length);
    
    if (result.actors.length > 0) {
      // Show first few floor actors
      console.log('\nFirst few floor actors:');
      result.actors.slice(0, 5).forEach(actor => {
        console.log(`- ${actor.name} at [${actor.location.x}, ${actor.location.y}, ${actor.location.z}]`);
      });
      
      // Calculate spacing between tiles
      if (result.actors.length >= 2) {
        const actor1 = result.actors[0];
        const actor2 = result.actors[1];
        const xDiff = Math.abs(actor2.location.x - actor1.location.x);
        const yDiff = Math.abs(actor2.location.y - actor1.location.y);
        console.log(`\nSpacing between first two tiles:`);
        console.log(`  X difference: ${xDiff} cm`);
        console.log(`  Y difference: ${yDiff} cm`);
      }
    }
  } else {
    console.log('Error:', result.error);
  }
}

main().catch(console.error);
