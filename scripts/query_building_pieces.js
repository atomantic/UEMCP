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

async function getAssetInfo(assetPath) {
  try {
    const result = await executeCommand({
      type: 'asset.info',
      params: { assetPath }
    });
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function searchBuildingPieces() {
  console.log('Searching for modular building pieces in /Game/ModularOldTown/Meshes...\n');
  
  // Get all static meshes in the Meshes folder
  const assetListResult = await executeCommand({
    type: 'asset.list',
    params: {
      path: '/Game/ModularOldTown/Meshes',
      limit: 1000,
      assetType: 'StaticMesh'
    }
  });
  
  if (!assetListResult.success) {
    console.error('Failed to list assets:', assetListResult.error);
    return;
  }
  
  const meshAssets = assetListResult.assets || [];
  
  // Focus on building components
  const buildingComponents = {
    walls: [],
    corners: [],
    doors: [],
    windows: [],
    floors: [],
    roofs: [],
    stairs: [],
    arches: [],
    balconies: []
  };
  
  // Filter and categorize building pieces
  for (const asset of meshAssets) {
    const name = asset.name.toLowerCase();
    const path = asset.path.toLowerCase();
    
    // Skip props, vegetation, cliffs, etc.
    if (path.includes('/props/') || path.includes('/vegetation/') || path.includes('/cliffsrocks/')) {
      continue;
    }
    
    // Categorize building pieces
    if (name.includes('wall') && !name.includes('roof')) {
      if (name.includes('corner')) {
        buildingComponents.corners.push(asset);
      } else if (name.includes('door')) {
        buildingComponents.doors.push(asset);
      } else if (name.includes('win')) {
        buildingComponents.windows.push(asset);
      } else if (name.includes('arch')) {
        buildingComponents.arches.push(asset);
      } else {
        buildingComponents.walls.push(asset);
      }
    } else if (name.includes('corner') && !name.includes('wall')) {
      buildingComponents.corners.push(asset);
    } else if (name.includes('door') && !name.includes('wall')) {
      buildingComponents.doors.push(asset);
    } else if (name.includes('window') || (name.includes('win') && !name.includes('wall'))) {
      buildingComponents.windows.push(asset);
    } else if (name.includes('floor')) {
      buildingComponents.floors.push(asset);
    } else if (name.includes('roof')) {
      buildingComponents.roofs.push(asset);
    } else if (name.includes('stair')) {
      buildingComponents.stairs.push(asset);
    } else if (name.includes('arch')) {
      buildingComponents.arches.push(asset);
    } else if (name.includes('balcon')) {
      buildingComponents.balconies.push(asset);
    }
  }
  
  // Output detailed information for each category
  for (const [category, assets] of Object.entries(buildingComponents)) {
    if (assets.length === 0) continue;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${category.toUpperCase()} (${assets.length} pieces)`);
    console.log(`${'='.repeat(60)}`);
    
    // Sort assets by name for better organization
    assets.sort((a, b) => a.name.localeCompare(b.name));
    
    for (const asset of assets) {
      const info = await getAssetInfo(asset.path);
      
      console.log(`\n${asset.name}`);
      console.log(`Path: ${asset.path}`);
      
      if (info.success && info.dimensions) {
        const dims = info.dimensions;
        console.log(`Dimensions: ${dims.x.toFixed(1)} x ${dims.y.toFixed(1)} x ${dims.z.toFixed(1)} cm`);
        
        // Convert to meters for easier planning
        console.log(`Size (meters): ${(dims.x/100).toFixed(1)} x ${(dims.y/100).toFixed(1)} x ${(dims.z/100).toFixed(1)} m`);
        
        if (info.boundingBox) {
          const min = info.boundingBox.min;
          const max = info.boundingBox.max;
          console.log(`Bounds: [${min.x.toFixed(0)}, ${min.y.toFixed(0)}, ${min.z.toFixed(0)}] to [${max.x.toFixed(0)}, ${max.y.toFixed(0)}, ${max.z.toFixed(0)}]`);
        }
      } else if (!info.success) {
        console.log(`Error getting info: ${info.error}`);
      }
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);
  for (const [category, assets] of Object.entries(buildingComponents)) {
    if (assets.length > 0) {
      console.log(`${category}: ${assets.length} pieces`);
    }
  }
}

// Run the search
searchBuildingPieces().catch(console.error);