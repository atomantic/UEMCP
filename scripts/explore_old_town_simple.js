const fetch = require('node-fetch');

async function executeCommand(command) {
  try {
    const response = await fetch('http://localhost:8765', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      timeout: 30000
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error('Server responded with error:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Request failed:', error.message);
    return null;
  }
}

async function main() {
  console.log('=== Exploring Old Town Map ===\n');
  
  // 1. Get current level info
  console.log('1. Current level actors:');
  const actorsResult = await executeCommand({
    type: 'level.actors',
    params: { limit: 30 }
  });
  
  if (actorsResult && actorsResult.success) {
    console.log(`Level: ${actorsResult.currentLevel}`);
    console.log(`Total actors: ${actorsResult.totalCount}\n`);
    
    // Look for building-related actors
    console.log('Building-related actors:');
    actorsResult.actors.forEach(actor => {
      const name = actor.name.toLowerCase();
      if (name.includes('wall') || name.includes('floor') || name.includes('roof') || 
          name.includes('door') || name.includes('window') || name.includes('building')) {
        console.log(`  - ${actor.name} (${actor.class})`);
        if (actor.assetPath) {
          console.log(`    Asset: ${actor.assetPath}`);
        }
      }
    });
  }
  
  // 2. Search for ModularOldTown assets
  console.log('\n2. Searching for ModularOldTown wall assets:');
  const wallActors = await executeCommand({
    type: 'level.actors',
    params: { filter: 'Wall', limit: 20 }
  });
  
  if (wallActors && wallActors.success) {
    console.log(`Found ${wallActors.totalCount} wall actors\n`);
    
    // Group by asset type
    const assetTypes = {};
    wallActors.actors.forEach(actor => {
      if (actor.assetPath) {
        if (!assetTypes[actor.assetPath]) {
          assetTypes[actor.assetPath] = [];
        }
        assetTypes[actor.assetPath].push(actor.name);
      }
    });
    
    console.log('Unique wall asset types:');
    Object.keys(assetTypes).forEach(asset => {
      console.log(`  ${asset} (${assetTypes[asset].length} instances)`);
    });
  }
  
  // 3. Take screenshots
  console.log('\n3. Taking screenshots...');
  
  // Set up camera for overview
  await executeCommand({
    type: 'viewport.camera',
    params: {
      location: [0, 0, 5000],
      rotation: [0, -90, 0]  // Look straight down
    }
  });
  
  const screenshot1 = await executeCommand({
    type: 'viewport.screenshot',
    params: { compress: true }
  });
  
  if (screenshot1 && screenshot1.success) {
    console.log(`Top-down screenshot: ${screenshot1.filename}`);
  }
  
  // Switch to perspective view
  await executeCommand({
    type: 'viewport.mode',
    params: { mode: 'perspective' }
  });
  
  await executeCommand({
    type: 'viewport.camera',
    params: {
      location: [3000, 3000, 2000],
      rotation: [0, -30, 225]
    }
  });
  
  const screenshot2 = await executeCommand({
    type: 'viewport.screenshot',
    params: { compress: true }
  });
  
  if (screenshot2 && screenshot2.success) {
    console.log(`Perspective screenshot: ${screenshot2.filename}`);
  }
  
  // 4. Check how to copy designs
  console.log('\n4. Methods to copy building designs:');
  console.log('- Select actors in Old Town map');
  console.log('- Copy to clipboard (Ctrl+C)');
  console.log('- Switch back to your map');
  console.log('- Paste (Ctrl+V)');
  console.log('');
  console.log('Alternative: Create Blueprint prefabs from building sections');
  console.log('- Select building actors');
  console.log('- Right-click -> Create Blueprint');
  console.log('- Save as reusable asset');
}

main().catch(console.error);