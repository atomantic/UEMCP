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

async function openOldTownMap() {
  console.log('=== Opening Old Town Map ===\n');
  
  // First, save the current level
  console.log('1. Saving current level...');
  const saveResult = await executeCommand({
    type: 'level.save',
    params: {}
  });
  
  if (saveResult && saveResult.success) {
    console.log('Current level saved successfully.\n');
  }
  
  // Open the Old Town map
  console.log('2. Opening Old Town map...');
  const pythonCode = `
import unreal

# Load the Old Town map
old_town_path = '/Game/ModularOldTown/Maps/Old_Town'
print(f"Loading map: {old_town_path}")

try:
    # Load the level
    success = unreal.EditorLevelLibrary.load_level(old_town_path)
    
    if success:
        print("Successfully loaded Old Town map!")
        
        # Wait a moment for the level to fully load
        import time
        time.sleep(1)
        
        # Get some info about the loaded level
        current_world = unreal.EditorLevelLibrary.get_editor_world()
        all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
        
        print(f"\\nLevel loaded: {current_world.get_name()}")
        print(f"Total actors in level: {len(all_actors)}")
        
        # Look for building-related actors
        building_actors = []
        for actor in all_actors:
            actor_name = actor.get_name()
            if any(keyword in actor_name.lower() for keyword in ['wall', 'floor', 'roof', 'door', 'window', 'building', 'house']):
                building_actors.append(actor_name)
        
        print(f"\\nFound {len(building_actors)} building-related actors")
        print("Sample building actors:")
        for actor_name in building_actors[:10]:
            print(f"  - {actor_name}")
            
        result = {
            'success': True,
            'level_name': current_world.get_name(),
            'total_actors': len(all_actors),
            'building_actors_count': len(building_actors),
            'sample_actors': building_actors[:20]
        }
    else:
        print("Failed to load Old Town map")
        result = {'success': False, 'error': 'Failed to load level'}
        
except Exception as e:
    print(f"Error loading map: {str(e)}")
    result = {'success': False, 'error': str(e)}
    
result
`;

  const loadResult = await executeCommand({
    type: 'python.execute',
    params: { code: pythonCode }
  });
  
  if (loadResult && loadResult.success) {
    console.log(loadResult.output);
    
    if (loadResult.result && loadResult.result.success) {
      console.log('\n3. Taking a screenshot of the Old Town map...');
      
      // Take a screenshot
      const screenshotResult = await executeCommand({
        type: 'viewport.screenshot',
        params: { compress: true }
      });
      
      if (screenshotResult && screenshotResult.success) {
        console.log(`Screenshot saved to: ${screenshotResult.filename}`);
      }
      
      // Get more detailed actor information
      console.log('\n4. Getting detailed actor information...');
      const actorsResult = await executeCommand({
        type: 'level.actors',
        params: { filter: 'SM_', limit: 20 }
      });
      
      if (actorsResult && actorsResult.success) {
        console.log(`\nFound ${actorsResult.totalCount} static mesh actors`);
        console.log('Sample actors with their assets:');
        actorsResult.actors.forEach(actor => {
          if (actor.assetPath) {
            console.log(`  - ${actor.name}: ${actor.assetPath}`);
          }
        });
      }
    }
  }
}

// Run the script
openOldTownMap().catch(console.error);