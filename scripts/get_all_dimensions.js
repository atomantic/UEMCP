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

async function getAssetDimensions(assetPath, assetName) {
  const result = await executeCommand({
    type: 'asset.info',
    params: { assetPath }
  });
  
  if (result.success && result.bounds) {
    const size = result.bounds.size;
    return {
      name: assetName,
      path: assetPath,
      dimensions: {
        x: size.x,
        y: size.y,
        z: size.z
      },
      dimensions_meters: {
        x: size.x / 100,
        y: size.y / 100,
        z: size.z / 100
      },
      vertices: result.numVertices,
      triangles: result.numTriangles
    };
  }
  return null;
}

async function main() {
  console.log('MODULAROLDTOWN BUILDING PIECES - COMPLETE DIMENSIONS REFERENCE');
  console.log('='.repeat(70));
  console.log('All measurements in centimeters (cm) and meters (m)\n');
  
  const categories = {
    'BASIC WALLS': [
      { name: 'SM_FlatWall_2m', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m' },
      { name: 'SM_FlatWall_3m', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m' },
      { name: 'SM_FlatStoneWall_2m', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_2m' },
      { name: 'SM_FlatStoneWall_3m', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_3m' },
    ],
    'CORNER PIECES': [
      { name: 'SM_FlatWall_1m_Corner', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner' },
      { name: 'SM_FlatWall_1m_Corner_R', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner_R' },
      { name: 'SM_FlatStoneWall_1m_Corner', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_1m_Corner' },
      { name: 'SM_FlatStoneWall_1m_Corner_R', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_1m_Corner_R' },
    ],
    'DOOR WALLS': [
      { name: 'SM_FlatWall_2m_SquareDoor', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m_SquareDoor' },
      { name: 'SM_FlatWall_3m_SquareDoor', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareDoor' },
      { name: 'SM_FlatWall_3m_ArchedDoor', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_ArchedDoor' },
      { name: 'SM_FlatStoneWall_3m_ArchedDoor', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_3m_ArchedDoor' },
    ],
    'WINDOW WALLS': [
      { name: 'SM_FlatWall_2m_SquareWin', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m_SquareWin' },
      { name: 'SM_FlatWall_3m_SquareWin', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareWin' },
      { name: 'SM_FlatWall_3m_ArchedWin', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_ArchedWin' },
      { name: 'SM_FlatStoneWall_3m_ArchedWin', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_3m_ArchedWin' },
    ],
    'FLOORS': [
      { name: 'SM_Floor_1m', path: '/Game/ModularOldTown/Meshes/Ground/SM_Floor_1m' },
      { name: 'SM_Floor_2m', path: '/Game/ModularOldTown/Meshes/Ground/SM_Floor_2m' },
      { name: 'SM_Ceiling_1m_Corner', path: '/Game/ModularOldTown/Meshes/Ground/SM_Ceiling_1m_Corner' },
    ],
    'ROOFS': [
      { name: 'SM_Roof_1m', path: '/Game/ModularOldTown/Meshes/Roof_Parts/SM_Roof_1m' },
      { name: 'SM_Roof_2m', path: '/Game/ModularOldTown/Meshes/Roof_Parts/SM_Roof_2m' },
      { name: 'SM_Roof_3m_Top', path: '/Game/ModularOldTown/Meshes/Roof_Parts/SM_Roof_3m_Top' },
      { name: 'SM_Roof_1m_Corner', path: '/Game/ModularOldTown/Meshes/Roof_Parts/SM_Roof_1m_Corner' },
      { name: 'SM_Roof_1m_Edge', path: '/Game/ModularOldTown/Meshes/Roof_Parts/SM_Roof_1m_Edge' },
    ],
    'ARCHES & GATES': [
      { name: 'SM_FlatWall_3m_BigArch', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_BigArch' },
      { name: 'SM_FlatStoneWall_3m_BigArch', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_3m_BigArch' },
      { name: 'SM_FlatWall_3m_Gate', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_Gate' },
      { name: 'SM_FlatStoneWall_3m_Gate', path: '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_3m_Gate' },
    ],
    'DECORATION': [
      { name: 'SM_WallDecor_2m', path: '/Game/ModularOldTown/Meshes/Decoration_Parts/SM_WallDecor_2m' },
      { name: 'SM_WallDecor_3m', path: '/Game/ModularOldTown/Meshes/Decoration_Parts/SM_WallDecor_3m' },
      { name: 'SM_SimpleBalcony_A', path: '/Game/ModularOldTown/Meshes/Decoration_Parts/SM_SimpleBalcony_A' },
      { name: 'SM_Stairs_A', path: '/Game/ModularOldTown/Meshes/Decoration_Parts/SM_Stairs_A' },
    ]
  };
  
  const allDimensions = {};
  
  for (const [category, assets] of Object.entries(categories)) {
    console.log(`\n${category}`);
    console.log('-'.repeat(70));
    
    const categoryDimensions = [];
    
    for (const asset of assets) {
      const dims = await getAssetDimensions(asset.path, asset.name);
      
      if (dims) {
        categoryDimensions.push(dims);
        
        console.log(`\n${dims.name}`);
        console.log(`Path: ${dims.path}`);
        console.log(`Dimensions: ${dims.dimensions.x.toFixed(1)} x ${dims.dimensions.y.toFixed(1)} x ${dims.dimensions.z.toFixed(1)} cm`);
        console.log(`Size (m): ${dims.dimensions_meters.x.toFixed(2)} x ${dims.dimensions_meters.y.toFixed(2)} x ${dims.dimensions_meters.z.toFixed(2)} m`);
        console.log(`Complexity: ${dims.vertices} vertices, ${dims.triangles} triangles`);
      } else {
        console.log(`\n${asset.name} - Failed to get dimensions`);
      }
    }
    
    allDimensions[category] = categoryDimensions;
  }
  
  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('BUILDING SYSTEM SUMMARY');
  console.log('='.repeat(70));
  
  console.log('\nSTANDARD DIMENSIONS:');
  console.log('- Wall widths: 1m (corners), 2m, 3m');
  console.log('- Wall thickness: ~1m (99.4cm)');
  console.log('- Wall height: ~2.8m (281.8cm)');
  console.log('- Floor/ceiling thickness: varies');
  
  console.log('\nMODULAR GRID:');
  console.log('- Use 100cm (1m) grid for perfect alignment');
  console.log('- Corner pieces are 1m x 1m');
  console.log('- Walls come in 2m and 3m widths');
  console.log('- All pieces designed to snap together seamlessly');
  
  console.log('\nBUILDING TIPS:');
  console.log('1. Start with corners at grid intersections');
  console.log('2. Fill between corners with appropriate wall pieces');
  console.log('3. Use door/window variants as needed');
  console.log('4. Add decorations (balconies, stairs) last');
  console.log('5. Roof pieces overlap walls slightly for weather protection');
  
  // Save results to file
  const fs = require('fs');
  fs.writeFileSync('modular_dimensions.json', JSON.stringify(allDimensions, null, 2));
  console.log('\nDimensions saved to modular_dimensions.json');
}

main().catch(console.error);