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

async function getDimensionsViaPython(assetPath) {
  const pythonCode = `
import unreal

asset_path = "${assetPath}"
asset = unreal.EditorAssetLibrary.load_asset(asset_path)

if asset and isinstance(asset, unreal.StaticMesh):
    bounds = asset.get_bounds()
    extent = bounds.box_extent
    
    # Get dimensions (extent * 2 gives full size)
    dimensions = {
        'x': float(extent.x * 2),
        'y': float(extent.y * 2), 
        'z': float(extent.z * 2)
    }
    
    # Get additional info
    info = {
        'name': asset.get_name(),
        'dimensions': dimensions,
        'dimensions_meters': {
            'x': dimensions['x'] / 100,
            'y': dimensions['y'] / 100,
            'z': dimensions['z'] / 100
        },
        'num_vertices': asset.get_num_vertices(0),
        'num_triangles': asset.get_num_triangles(0),
        'origin': {
            'x': float(bounds.origin.x),
            'y': float(bounds.origin.y),
            'z': float(bounds.origin.z)
        }
    }
    
    print(f"Asset: {info['name']}")
    print(f"Dimensions (cm): {dimensions['x']:.1f} x {dimensions['y']:.1f} x {dimensions['z']:.1f}")
    print(f"Dimensions (m): {info['dimensions_meters']['x']:.1f} x {info['dimensions_meters']['y']:.1f} x {info['dimensions_meters']['z']:.1f}")
    print(f"Vertices: {info['num_vertices']}, Triangles: {info['num_triangles']}")
    
    result = info
else:
    print(f"Failed to load asset: {asset_path}")
    result = None
`;

  const response = await executeCommand({
    type: 'python.execute',
    params: { code: pythonCode }
  });
  
  return response;
}

async function main() {
  console.log('Getting dimensions for ModularOldTown building pieces using Python API...\n');
  
  // Key assets organized by category
  const keyAssets = {
    'BASIC WALLS': [
      '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m',
      '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m',
      '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_2m',
      '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_3m',
    ],
    'CORNER PIECES': [
      '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner',
      '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner_R',
      '/Game/ModularOldTown/Meshes/Walls/SM_FlatStoneWall_1m_Corner',
    ],
    'DOOR WALLS': [
      '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m_SquareDoor',
      '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareDoor',
      '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_ArchedDoor',
    ],
    'WINDOW WALLS': [
      '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_2m_SquareWin',
      '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareWin',
      '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_ArchedWin',
    ],
    'FLOORS': [
      '/Game/ModularOldTown/Meshes/Ground/SM_Floor_1m',
      '/Game/ModularOldTown/Meshes/Ground/SM_Floor_2m',
    ],
    'ROOFS': [
      '/Game/ModularOldTown/Meshes/Roof_Parts/SM_Roof_1m',
      '/Game/ModularOldTown/Meshes/Roof_Parts/SM_Roof_2m',
      '/Game/ModularOldTown/Meshes/Roof_Parts/SM_Roof_3m_Top',
    ]
  };
  
  // Process each category
  for (const [category, assets] of Object.entries(keyAssets)) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(category);
    console.log(`${'='.repeat(70)}`);
    
    for (const assetPath of assets) {
      console.log(`\nQuerying: ${assetPath}`);
      try {
        await getDimensionsViaPython(assetPath);
      } catch (error) {
        console.log(`Error: ${error.message}`);
      }
      console.log('');
    }
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('MODULAR BUILDING SYSTEM SUMMARY');
  console.log(`${'='.repeat(70)}`);
  console.log('\nBased on asset naming conventions:');
  console.log('- 1m pieces: 100cm width (corner pieces)');
  console.log('- 2m pieces: 200cm width');
  console.log('- 3m pieces: 300cm width');
  console.log('- Standard height: ~300cm per floor');
  console.log('- Wall thickness: ~30cm');
  console.log('\nUse these standard sizes to create perfectly aligned modular buildings!');
}

main().catch(console.error);