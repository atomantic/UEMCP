#!/usr/bin/env node

import fetch from 'node-fetch';

const LISTENER_URL = 'http://localhost:8765';

async function callPythonProxy(code) {
  try {
    const response = await fetch(`${LISTENER_URL}/python_proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error calling Python proxy:', error.message);
    throw error;
  }
}

async function main() {
  console.log('Checking floor assets in ModularOldTown...\n');
  
  const code = `
import unreal

# List all assets in ModularOldTown/Meshes
assets = unreal.EditorAssetLibrary.list_assets("/Game/ModularOldTown/Meshes")

# Filter for floor-related assets
floor_assets = []
tile_assets = []
platform_assets = []
ground_assets = []

for asset in assets:
    asset_lower = asset.lower()
    if 'floor' in asset_lower:
        floor_assets.append(asset)
    elif 'tile' in asset_lower:
        tile_assets.append(asset)
    elif 'platform' in asset_lower:
        platform_assets.append(asset)
    elif 'ground' in asset_lower:
        ground_assets.append(asset)

print("=== Floor Assets ===")
if floor_assets:
    for asset in floor_assets:
        print(f"  {asset}")
else:
    print("  No floor assets found")

print("\\n=== Tile Assets ===")
if tile_assets:
    for asset in tile_assets:
        print(f"  {asset}")
else:
    print("  No tile assets found")

print("\\n=== Platform Assets ===")
if platform_assets:
    for asset in platform_assets:
        print(f"  {asset}")
else:
    print("  No platform assets found")

print("\\n=== Ground Assets ===")
if ground_assets:
    for asset in ground_assets:
        print(f"  {asset}")
else:
    print("  No ground assets found")

# Let's also check for any assets with "2m" in the name (for 2m tiles)
print("\\n=== 2m Assets (possible floor tiles) ===")
assets_2m = [asset for asset in assets if '2m' in asset.lower()]
if assets_2m:
    for asset in assets_2m:
        print(f"  {asset}")
else:
    print("  No 2m assets found")

# Check for wood floor specifically
print("\\n=== Wood Floor Assets ===")
wood_floor = [asset for asset in assets if 'wood' in asset.lower() and ('floor' in asset.lower() or 'plank' in asset.lower())]
if wood_floor:
    for asset in wood_floor:
        print(f"  {asset}")
else:
    print("  No wood floor assets found")

result = {
    'floor_assets': floor_assets,
    'tile_assets': tile_assets,
    'platform_assets': platform_assets,
    'ground_assets': ground_assets,
    'assets_2m': assets_2m,
    'wood_floor': wood_floor
}

result
`;

  try {
    const result = await callPythonProxy(code);
    console.log('\nPython execution result:');
    console.log(result.output || 'No output');
    
    if (result.error) {
      console.error('\nError:', result.error);
    }
    
    if (result.result) {
      console.log('\nStructured result:', JSON.stringify(result.result, null, 2));
    }
  } catch (error) {
    console.error('Failed to execute Python code:', error.message);
  }
}

main().catch(console.error);