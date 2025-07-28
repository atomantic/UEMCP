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
  const result = await executeCommand({
    type: 'python.execute',
    params: {
      code: `
import unreal

# Get floor asset dimensions
asset_path = "/Game/ModularOldTown/Meshes/SM_Floor_2m"
asset = unreal.EditorAssetLibrary.load_asset(asset_path)

if asset:
    bounds = asset.get_bounds()
    box_extent = bounds.box_extent
    
    width = box_extent.x * 2
    length = box_extent.y * 2
    height = box_extent.z * 2
    
    print(f"SM_Floor_2m dimensions:")
    print(f"  Width (X): {width:.1f} cm ({width/100:.1f} m)")
    print(f"  Length (Y): {length:.1f} cm ({length/100:.1f} m)")
    print(f"  Height (Z): {height:.1f} cm")
    
    # Return the dimensions
    result = {
        'width_cm': width,
        'length_cm': length,
        'height_cm': height,
        'width_m': width/100,
        'length_m': length/100
    }
else:
    print("Could not load floor asset")
    result = None
`
    }
  });
  
  if (result.success) {
    console.log('Floor dimensions:', result.result);
  } else {
    console.log('Error:', result.error);
  }
}

main().catch(console.error);
