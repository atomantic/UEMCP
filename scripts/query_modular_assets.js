const fetch = require('node-fetch');

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
      timeout: 10000, // 10 second timeout
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

async function searchModularAssets() {
  console.log('Searching for modular building assets...\n');
  
  // First, list all assets in the ModularOldTown folder
  const assetListResult = await executeCommand({
    type: 'asset.list',
    params: {
      path: '/Game/ModularOldTown',
      limit: 1000,  // Get all assets
      assetType: 'StaticMesh'
    }
  });
  
  if (!assetListResult.success) {
    console.error('Failed to list assets:', assetListResult.error);
    return;
  }
  
  console.log(`Found ${assetListResult.totalCount} assets in /Game/ModularOldTown\n`);
  
  // Categorize assets by type
  const categories = {
    walls: [],
    corners: [],
    doors: [],
    windows: [],
    floors: [],
    roofs: [],
    stairs: [],
    other: []
  };
  
  const meshAssets = assetListResult.assets || [];
  
  // Categorize each asset based on its name
  for (const asset of meshAssets) {
    const name = asset.name.toLowerCase();
    
    if (name.includes('wall')) {
      categories.walls.push(asset);
    } else if (name.includes('corner')) {
      categories.corners.push(asset);
    } else if (name.includes('door')) {
      categories.doors.push(asset);
    } else if (name.includes('window')) {
      categories.windows.push(asset);
    } else if (name.includes('floor')) {
      categories.floors.push(asset);
    } else if (name.includes('roof')) {
      categories.roofs.push(asset);
    } else if (name.includes('stair')) {
      categories.stairs.push(asset);
    } else {
      categories.other.push(asset);
    }
  }
  
  // Now get detailed info for each category
  for (const [category, assets] of Object.entries(categories)) {
    if (assets.length === 0) continue;
    
    console.log(`\n${category.toUpperCase()} (${assets.length} items):`);
    console.log('='.repeat(50));
    
    for (const asset of assets) {
      // Get detailed info for each asset
      const assetInfo = await executeCommand({
        type: 'asset.info',
        params: {
          assetPath: asset.path
        }
      });
      
      if (assetInfo.success) {
        console.log(`\n• ${asset.name}`);
        console.log(`  Path: ${asset.path}`);
        if (assetInfo.dimensions) {
          console.log(`  Dimensions: ${assetInfo.dimensions.x} x ${assetInfo.dimensions.y} x ${assetInfo.dimensions.z}`);
        }
        if (assetInfo.boundingBox) {
          console.log(`  Bounding Box Min: [${assetInfo.boundingBox.min.x}, ${assetInfo.boundingBox.min.y}, ${assetInfo.boundingBox.min.z}]`);
          console.log(`  Bounding Box Max: [${assetInfo.boundingBox.max.x}, ${assetInfo.boundingBox.max.y}, ${assetInfo.boundingBox.max.z}]`);
        }
        if (assetInfo.pivot) {
          console.log(`  Pivot: [${assetInfo.pivot.x}, ${assetInfo.pivot.y}, ${assetInfo.pivot.z}]`);
        }
        if (assetInfo.triangles) {
          console.log(`  Triangles: ${assetInfo.triangles}`);
        }
        if (assetInfo.vertices) {
          console.log(`  Vertices: ${assetInfo.vertices}`);
        }
      } else {
        console.log(`\n• ${asset.name} - Failed to get details: ${assetInfo.error}`);
      }
    }
  }
}

// Run the search
searchModularAssets().catch(console.error);