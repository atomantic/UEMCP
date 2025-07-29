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

async function exploreMaps() {
  console.log('=== Exploring Unreal Engine Maps ===\n');
  
  // 1. Get current level actors
  console.log('1. Current Level Actors:');
  const actorsResult = await executeCommand({
    type: 'level.actors',
    params: { limit: 10 }
  });
  
  if (actorsResult && actorsResult.success) {
    console.log(`Current Level: ${actorsResult.currentLevel}`);
    console.log(`Total Actors: ${actorsResult.totalCount}`);
    if (actorsResult.actors && actorsResult.actors.length > 0) {
      console.log('\nFirst few actors:');
      actorsResult.actors.slice(0, 5).forEach(actor => {
        console.log(`  - ${actor.name} (${actor.class})`);
      });
    }
  }
  
  // 2. Check for available maps/levels using Python
  console.log('\n\n2. Checking for available maps/levels:');
  const pythonCode = `
import unreal

# Get all level/map assets in the project
asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
all_assets = asset_registry.get_all_assets()

# Filter for map/level assets
maps = []
for asset in all_assets:
    if asset.asset_class_path.asset_name == 'World':
        maps.append({
            'name': asset.asset_name,
            'path': str(asset.package_name),
            'folder': str(asset.package_path)
        })

# Sort by path
maps.sort(key=lambda x: x['path'])

# Also check for Old Town specific content
old_town_found = False
for asset in all_assets:
    if 'OldTown' in str(asset.package_name) and asset.asset_class_path.asset_name == 'World':
        old_town_found = True
        
print(f"Found {len(maps)} map(s) in the project")
for i, map_info in enumerate(maps[:10]):  # Show first 10
    print(f"{i+1}. {map_info['name']} - {map_info['path']}")
    
if old_town_found:
    print("\\nOld Town map found!")
    
# Get current level
current_world = unreal.EditorLevelLibrary.get_editor_world()
current_level_name = current_world.get_name() if current_world else "Unknown"
print(f"\\nCurrent Level: {current_level_name}")

# Return structured data
result = {
    'maps': maps[:20],  # Return first 20 maps
    'current_level': current_level_name,
    'old_town_found': old_town_found,
    'total_maps': len(maps)
}
result
`;

  const mapsResult = await executeCommand({
    type: 'python.execute',
    params: { code: pythonCode }
  });
  
  if (mapsResult && mapsResult.success) {
    console.log(mapsResult.output);
    if (mapsResult.result) {
      console.log('\nStructured map data:', JSON.stringify(mapsResult.result, null, 2));
    }
  }
  
  // 3. Check if we can open a different map
  console.log('\n\n3. Checking how to switch between maps:');
  const switchMapCode = `
import unreal

# Get the editor subsystem for level operations
editor_subsystem = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)

# Check available methods for loading levels
print("Available level loading methods:")
print("- unreal.EditorLevelLibrary.load_level()")
print("- unreal.EditorLoadingAndSavingUtils.load_map()")
print("- editor_subsystem.load_level()")

# Example of how to load a level (commented out to avoid actually switching)
# unreal.EditorLevelLibrary.load_level('/Game/Maps/YourMapName')

print("\\nTo switch to a different map, use:")
print("unreal.EditorLevelLibrary.load_level('/Game/Path/To/MapName')")
print("\\nNote: This will switch the current level in the editor!")
`;

  const switchResult = await executeCommand({
    type: 'python.execute',
    params: { code: switchMapCode }
  });
  
  if (switchResult && switchResult.success) {
    console.log(switchResult.output);
  }
  
  // 4. Check for copying assets between levels
  console.log('\n\n4. Checking asset copying capabilities:');
  const copyAssetsCode = `
import unreal

print("Methods for copying actors between levels:")
print("1. Copy actors to clipboard:")
print("   unreal.EditorLevelLibrary.copy_actors_to_clipboard(actors)")
print("   unreal.EditorLevelLibrary.paste_actors_from_clipboard()")
print("")
print("2. Duplicate actors:")
print("   unreal.EditorLevelLibrary.duplicate_actors(actors)")
print("")
print("3. Save actor as asset (prefab):")
print("   - Select actors in level")
print("   - Right-click -> Create Blueprint")
print("   - This creates a reusable asset")
print("")
print("4. Migrate assets between projects:")
print("   unreal.EditorAssetLibrary.migrate_asset()")
print("")
print("Best practice: Create Blueprint prefabs of building designs")
print("that can be reused across different levels/maps.")
`;

  const copyResult = await executeCommand({
    type: 'python.execute',
    params: { code: copyAssetsCode }
  });
  
  if (copyResult && copyResult.success) {
    console.log(copyResult.output);
  }
}

// Run the exploration
exploreMaps().catch(console.error);