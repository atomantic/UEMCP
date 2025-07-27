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

async function getAssetDimensions(assetPath) {
  const result = await executeCommand({
    type: 'asset.info',
    params: { assetPath }
  });
  return result;
}

async function getDimensionsForCategory(category, assets) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${category.toUpperCase()} DIMENSIONS`);
  console.log(`${'='.repeat(70)}`);
  
  for (const asset of assets) {
    const info = await getAssetDimensions(asset.path);
    
    console.log(`\n${asset.name}`);
    
    if (info.success && info.dimensions) {
      const dims = info.dimensions;
      console.log(`  Dimensions (cm): ${dims.x.toFixed(1)} x ${dims.y.toFixed(1)} x ${dims.z.toFixed(1)}`);
      console.log(`  Size (meters): ${(dims.x/100).toFixed(1)} x ${(dims.y/100).toFixed(1)} x ${(dims.z/100).toFixed(1)}`);
      
      // Determine grid alignment
      const xMeters = dims.x / 100;
      const yMeters = dims.y / 100;
      console.log(`  Grid alignment: ${xMeters}m along X, ${yMeters}m along Y`);
    } else {
      console.log(`  ERROR: ${info.error || 'No dimension data'}`);
    }
  }
}

async function main() {
  console.log('Getting dimensions for ModularOldTown building pieces...');
  
  // Key assets to get dimensions for
  const keyAssets = {
    'Basic Walls': [
      { name: 'SM_FlatWall_2m', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m' },
      { name: 'SM_FlatWall_3m', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m' },
      { name: 'SM_FlatStoneWall_2m', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_2m' },
      { name: 'SM_FlatStoneWall_3m', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_3m' },
    ],
    'Corner Pieces': [
      { name: 'SM_FlatWall_1m_Corner', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner' },
      { name: 'SM_FlatWall_1m_Corner_R', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner_R' },
      { name: 'SM_FlatStoneWall_1m_Corner', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_1m_Corner' },
      { name: 'SM_FlatStoneWall_1m_Corner_R', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_1m_Corner_R' },
    ],
    'Door Walls': [
      { name: 'SM_FlatWall_2m_SquareDoor', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m_SquareDoor' },
      { name: 'SM_FlatWall_3m_SquareDoor', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareDoor' },
      { name: 'SM_FlatWall_3m_ArchedDoor', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_ArchedDoor' },
    ],
    'Window Walls': [
      { name: 'SM_FlatWall_2m_SquareWin', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m_SquareWin' },
      { name: 'SM_FlatWall_3m_SquareWin', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareWin' },
      { name: 'SM_FlatWall_3m_ArchedWin', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_ArchedWin' },
    ],
    'Floors': [
      { name: 'SM_Floor_1m', path: '/Game/ModularOldTown/Meshes/Ground/SM_Floor_1m' },
      { name: 'SM_Floor_2m', path: '/Game/ModularOldTown/Meshes/Ground/SM_Floor_2m' },
    ],
    'Roofs': [
      { name: 'SM_Roof_1m', path: '/Game/ModularOldTown/Meshes/Roof_Parts/SM_Roof_1m' },
      { name: 'SM_Roof_2m', path: '/Game/ModularOldTown/Meshes/Roof_Parts/SM_Roof_2m' },
      { name: 'SM_Roof_3m_Top', path: '/Game/ModularOldTown/Meshes/Roof_Parts/SM_Roof_3m_Top' },
    ],
    'Arches': [
      { name: 'SM_FlatWall_3m_BigArch', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_BigArch' },
      { name: 'SM_FlatStoneWall_3m_BigArch', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_3m_BigArch' },
    ]
  };
  
  // Get dimensions for each category
  for (const [category, assets] of Object.entries(keyAssets)) {
    await getDimensionsForCategory(category, assets);
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('MODULAR GRID REFERENCE');
  console.log(`${'='.repeat(70)}`);
  console.log('Standard wall widths: 2m and 3m');
  console.log('Corner pieces: 1m x 1m');
  console.log('Wall thickness: Approximately 30cm');
  console.log('Standard height: 3m per floor');
  console.log('\nWhen building, align pieces on a 1m grid for perfect fit!');
}

main().catch(console.error);