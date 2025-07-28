#!/usr/bin/env node

import fetch from 'node-fetch';

const LISTENER_URL = 'http://localhost:8765';

async function callCommand(type, params) {
  try {
    const response = await fetch(LISTENER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, params })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Command failed');
    }
    
    return result;
  } catch (error) {
    console.error(`Error calling ${type}:`, error.message);
    throw error;
  }
}

async function checkFloorAssets() {
  console.log('Checking available floor assets...\n');
  
  const result = await callCommand('asset.list', {
    folder: '/Game/ModularOldTown/Meshes',
    type: 'StaticMesh',
    filter: 'floor'
  });
  
  console.log('Floor assets:');
  result.assets?.forEach(asset => {
    console.log(`  ${asset.name} - ${asset.path}`);
  });
  
  // Also check for 2m tiles or other floor options
  const tileResult = await callCommand('asset.list', {
    folder: '/Game/ModularOldTown/Meshes',
    type: 'StaticMesh',
    filter: '2m'
  });
  
  console.log('\n2m Assets (possible floor tiles):');
  tileResult.assets?.forEach(asset => {
    console.log(`  ${asset.name} - ${asset.path}`);
  });
  
  return { floorAssets: result.assets, tileAssets: tileResult.assets };
}

async function buildSecondFloor() {
  console.log('\n=== Building Second Floor ===\n');
  
  // First check what assets are available
  const { floorAssets, tileAssets } = await checkFloorAssets();
  
  // House dimensions: 10m x 8m, floor at Z=392
  const floorZ = 392;
  const houseX = 10760; // Center X
  const houseY = 690;   // Center Y
  
  // Use 2m tiles in a 5x4 grid
  const tileSize = 200; // 2m = 200 units
  const tilesX = 5;
  const tilesY = 4;
  
  // Find the best floor tile asset
  let floorAssetPath = null;
  
  // Look for a wood floor or generic floor tile
  const possibleFloorAssets = [...(floorAssets || []), ...(tileAssets || [])];
  const floorAsset = possibleFloorAssets.find(asset => 
    asset.name.toLowerCase().includes('floor') || 
    asset.name.toLowerCase().includes('wood') ||
    asset.name.toLowerCase().includes('2m')
  );
  
  if (floorAsset) {
    floorAssetPath = floorAsset.path;
    console.log(`Using floor asset: ${floorAsset.name}`);
  } else {
    console.error('No suitable floor asset found!');
    // Try a fallback - look for any flat surface asset
    const fallbackResult = await callCommand('asset.list', {
      folder: '/Game/ModularOldTown/Meshes',
      type: 'StaticMesh',
      filter: 'wall'
    });
    
    // Use a wall rotated to be horizontal as a floor
    const wallAsset = fallbackResult.assets?.find(asset => 
      asset.name.toLowerCase().includes('2m') ||
      asset.name.toLowerCase().includes('wall')
    );
    
    if (wallAsset) {
      floorAssetPath = wallAsset.path;
      console.log(`Using wall asset as floor (will rotate): ${wallAsset.name}`);
    }
  }
  
  if (!floorAssetPath) {
    console.error('Could not find any suitable asset for floor!');
    return;
  }
  
  console.log('\nPlacing floor tiles...');
  
  // Calculate starting position (bottom-left corner)
  const startX = houseX - (tilesX * tileSize) / 2 + tileSize / 2;
  const startY = houseY - (tilesY * tileSize) / 2 + tileSize / 2;
  
  // Place floor tiles in a grid
  for (let x = 0; x < tilesX; x++) {
    for (let y = 0; y < tilesY; y++) {
      const posX = startX + x * tileSize;
      const posY = startY + y * tileSize;
      
      const actorName = `SecondFloorTile_${x}_${y}`;
      
      // If using a wall as floor, rotate it 90 degrees on pitch
      const rotation = floorAssetPath.includes('wall') ? [0, 90, 0] : [0, 0, 0];
      
      const result = await callCommand('actor.spawn', {
        assetPath: floorAssetPath,
        location: [posX, posY, floorZ],
        rotation: rotation,
        actorName: actorName,
        folderPath: 'Estate/House/SecondFloor/Floor'
      });
      
      if (result.success) {
        console.log(`  Placed ${actorName} at (${posX}, ${posY}, ${floorZ})`);
      }
    }
  }
  
  console.log('\nFloor tiles placed successfully!');
  
  // Now place corner pieces and walls
  await placeSecondFloorWalls(houseX, houseY, floorZ);
  
  // Take screenshots
  await takeScreenshots(houseX, houseY, floorZ);
  
  // Save the level
  console.log('\nSaving level...');
  await callCommand('level.save', {});
  console.log('Level saved!');
}

async function placeSecondFloorWalls(centerX, centerY, floorZ) {
  console.log('\nPlacing second floor walls and corners...');
  
  // Get available wall and corner assets
  const wallResult = await callCommand('asset.list', {
    folder: '/Game/ModularOldTown/Meshes',
    type: 'StaticMesh',
    filter: 'wall'
  });
  
  const cornerResult = await callCommand('asset.list', {
    folder: '/Game/ModularOldTown/Meshes',
    type: 'StaticMesh',
    filter: 'corner'
  });
  
  // Find appropriate assets
  const wallAsset = wallResult.assets?.find(asset => 
    asset.name.toLowerCase().includes('window') &&
    asset.name.toLowerCase().includes('3m')
  );
  
  const cornerAsset = cornerResult.assets?.find(asset => 
    asset.name.toLowerCase().includes('corner') &&
    asset.name.toLowerCase().includes('3m')
  );
  
  if (!wallAsset || !cornerAsset) {
    console.error('Could not find wall or corner assets!');
    return;
  }
  
  console.log(`Using wall: ${wallAsset.name}`);
  console.log(`Using corner: ${cornerAsset.name}`);
  
  // House dimensions
  const width = 1000;  // 10m
  const depth = 800;   // 8m
  const wallHeight = 300; // 3m walls
  
  // Calculate positions
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  
  // Place corners first
  const corners = [
    { name: 'NE_Corner', x: centerX - halfWidth, y: centerY - halfDepth, yaw: 0 },
    { name: 'SE_Corner', x: centerX + halfWidth, y: centerY - halfDepth, yaw: 90 },
    { name: 'SW_Corner', x: centerX + halfWidth, y: centerY + halfDepth, yaw: 180 },
    { name: 'NW_Corner', x: centerX - halfWidth, y: centerY + halfDepth, yaw: 270 }
  ];
  
  for (const corner of corners) {
    await callCommand('actor.spawn', {
      assetPath: cornerAsset.path,
      location: [corner.x, corner.y, floorZ],
      rotation: [0, 0, corner.yaw],
      actorName: `SecondFloor_${corner.name}`,
      folderPath: 'Estate/House/SecondFloor/Structure'
    });
  }
  
  // Place walls between corners
  // North wall (faces south into building)
  for (let i = 1; i < 3; i++) {
    const x = centerX - halfWidth + 150 + (i - 1) * 300;
    await callCommand('actor.spawn', {
      assetPath: wallAsset.path,
      location: [x, centerY - halfDepth, floorZ],
      rotation: [0, 0, 270], // Faces south
      actorName: `SecondFloor_NorthWall_${i}`,
      folderPath: 'Estate/House/SecondFloor/Structure'
    });
  }
  
  // South wall (faces north into building)
  for (let i = 1; i < 3; i++) {
    const x = centerX - halfWidth + 150 + (i - 1) * 300;
    await callCommand('actor.spawn', {
      assetPath: wallAsset.path,
      location: [x, centerY + halfDepth, floorZ],
      rotation: [0, 0, 90], // Faces north
      actorName: `SecondFloor_SouthWall_${i}`,
      folderPath: 'Estate/House/SecondFloor/Structure'
    });
  }
  
  // East wall (faces west into building)
  for (let i = 1; i < 2; i++) {
    const y = centerY - halfDepth + 150 + (i - 1) * 300;
    await callCommand('actor.spawn', {
      assetPath: wallAsset.path,
      location: [centerX + halfWidth, y, floorZ],
      rotation: [0, 0, 180], // Faces west
      actorName: `SecondFloor_EastWall_${i}`,
      folderPath: 'Estate/House/SecondFloor/Structure'
    });
  }
  
  // West wall (faces east into building)
  for (let i = 1; i < 2; i++) {
    const y = centerY - halfDepth + 150 + (i - 1) * 300;
    await callCommand('actor.spawn', {
      assetPath: wallAsset.path,
      location: [centerX - halfWidth, y, floorZ],
      rotation: [0, 0, 0], // Faces east
      actorName: `SecondFloor_WestWall_${i}`,
      folderPath: 'Estate/House/SecondFloor/Structure'
    });
  }
  
  console.log('Second floor walls and corners placed!');
}

async function takeScreenshots(centerX, centerY, floorZ) {
  console.log('\nTaking screenshots...');
  
  // 1. Perspective view from southwest
  await callCommand('viewport.camera', {
    location: [centerX + 1500, centerY + 1200, floorZ + 800],
    rotation: [0, -30, -135]
  });
  await callCommand('viewport.screenshot', {});
  console.log('  Screenshot 1: Perspective view');
  
  // 2. Top-down view
  await callCommand('viewport.mode', { mode: 'top' });
  await callCommand('viewport.camera', {
    location: [centerX, centerY, floorZ + 2000],
    rotation: [-90, 0, 0]
  });
  await callCommand('viewport.screenshot', {});
  console.log('  Screenshot 2: Top view');
  
  // 3. Wireframe to check alignment
  await callCommand('viewport.render_mode', { mode: 'wireframe' });
  await callCommand('viewport.screenshot', {});
  console.log('  Screenshot 3: Wireframe view');
  
  // Reset to perspective lit mode
  await callCommand('viewport.mode', { mode: 'perspective' });
  await callCommand('viewport.render_mode', { mode: 'lit' });
}

// Run the script
buildSecondFloor().catch(console.error);