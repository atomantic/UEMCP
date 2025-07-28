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

async function exploreOldTownBuildings() {
  console.log('=== Exploring Old Town Buildings ===\n');
  
  // 1. Get overview of actors in the level
  console.log('1. Getting overview of building-related actors...');
  const pythonCode = `
import unreal

# Get all actors
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Categorize actors by type/name
building_categories = {
    'walls': [],
    'floors': [],
    'roofs': [],
    'doors': [],
    'windows': [],
    'stairs': [],
    'balconies': [],
    'other_building': []
}

# Analyze actors
for actor in all_actors:
    actor_name = actor.get_name()
    actor_class = actor.__class__.__name__
    
    # Get the static mesh component if it exists
    asset_path = None
    if hasattr(actor, 'static_mesh_component'):
        mesh_comp = actor.static_mesh_component
        if mesh_comp and mesh_comp.static_mesh:
            asset_path = mesh_comp.static_mesh.get_path_name()
    
    # Categorize based on name
    name_lower = actor_name.lower()
    actor_info = {'name': actor_name, 'class': actor_class, 'asset': asset_path}
    
    if 'wall' in name_lower:
        building_categories['walls'].append(actor_info)
    elif 'floor' in name_lower:
        building_categories['floors'].append(actor_info)
    elif 'roof' in name_lower:
        building_categories['roofs'].append(actor_info)
    elif 'door' in name_lower:
        building_categories['doors'].append(actor_info)
    elif 'window' in name_lower:
        building_categories['windows'].append(actor_info)
    elif 'stair' in name_lower:
        building_categories['stairs'].append(actor_info)
    elif 'balcon' in name_lower:
        building_categories['balconies'].append(actor_info)
    elif any(keyword in name_lower for keyword in ['sm_', 'building', 'house', 'arch', 'column']):
        building_categories['other_building'].append(actor_info)

# Print summary
print("Building Actor Categories:")
for category, actors in building_categories.items():
    if actors:
        print(f"\\n{category.upper()}: {len(actors)} actors")
        # Show unique assets used
        unique_assets = set(a['asset'] for a in actors if a['asset'])
        for asset in list(unique_assets)[:5]:  # Show first 5 unique assets
            print(f"  - {asset}")

# Return counts
result = {category: len(actors) for category, actors in building_categories.items()}
result['total_analyzed'] = len(all_actors)
result
`;

  const overviewResult = await executeCommand({
    type: 'python.execute',
    params: { code: pythonCode }
  });
  
  if (overviewResult && overviewResult.success) {
    console.log(overviewResult.output);
  }
  
  // 2. Look for specific building structures
  console.log('\n\n2. Analyzing building structures and patterns...');
  const structureCode = `
import unreal

# Find complete building structures by looking at actor groupings
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Look for actor folders/groups
folders = set()
building_groups = {}

for actor in all_actors:
    # Get folder path
    folder_path = actor.get_folder_path()
    if folder_path:
        folders.add(str(folder_path))
        
    # Check if actor is part of a building group
    actor_name = actor.get_name()
    if 'building' in actor_name.lower() or 'house' in actor_name.lower():
        # Extract building number/id if present
        import re
        match = re.search(r'(building|house)[_\\s]*(\\d+)', actor_name.lower())
        if match:
            building_id = match.group(2)
            if building_id not in building_groups:
                building_groups[building_id] = []
            building_groups[building_id].append(actor_name)

print("Folder Structure in Level:")
for folder in sorted(folders)[:20]:  # Show first 20 folders
    print(f"  {folder}")

print(f"\\nFound {len(building_groups)} numbered building groups")

# Look for specific modular pieces
print("\\nSearching for modular building pieces...")
modular_pieces = []
for actor in all_actors[:1000]:  # Check first 1000 actors
    if hasattr(actor, 'static_mesh_component'):
        mesh_comp = actor.static_mesh_component
        if mesh_comp and mesh_comp.static_mesh:
            asset_path = mesh_comp.static_mesh.get_path_name()
            if 'modular' in asset_path.lower() and 'oldtown' in asset_path.lower():
                modular_pieces.append({
                    'actor': actor.get_name(),
                    'asset': asset_path,
                    'location': actor.get_actor_location(),
                    'rotation': actor.get_actor_rotation()
                })

print(f"\\nFound {len(modular_pieces)} ModularOldTown pieces")
if modular_pieces:
    print("Sample pieces:")
    for piece in modular_pieces[:10]:
        print(f"  {piece['actor']} -> {piece['asset']}")

len(modular_pieces)
`;

  const structureResult = await executeCommand({
    type: 'python.execute',
    params: { code: structureCode }
  });
  
  if (structureResult && structureResult.success) {
    console.log(structureResult.output);
  }
  
  // 3. Take screenshots of interesting areas
  console.log('\n\n3. Taking screenshots to visualize building designs...');
  
  // First, switch to a good viewing angle
  await executeCommand({
    type: 'viewport.mode',
    params: { mode: 'perspective' }
  });
  
  // Move camera to a good overview position
  await executeCommand({
    type: 'viewport.camera',
    params: {
      location: [5000, 5000, 3000],
      rotation: [0, -30, 225]  // Look down at angle towards buildings
    }
  });
  
  // Take overview screenshot
  const screenshotResult1 = await executeCommand({
    type: 'viewport.screenshot',
    params: { compress: true }
  });
  
  if (screenshotResult1 && screenshotResult1.success) {
    console.log(`Overview screenshot saved: ${screenshotResult1.filename}`);
  }
  
  // 4. Find a specific building to focus on
  console.log('\n4. Finding a complete building to study...');
  const findBuildingCode = `
import unreal

# Look for a complete building structure
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find actors that might be part of complete buildings
potential_buildings = []
for actor in all_actors:
    actor_name = actor.get_name()
    # Look for walls that might indicate a building
    if 'wall' in actor_name.lower() and 'sm_' in actor_name.lower():
        location = actor.get_actor_location()
        potential_buildings.append({
            'actor': actor,
            'name': actor_name,
            'location': location
        })

# Group by proximity (buildings usually have walls close together)
if potential_buildings:
    # Take first wall as reference
    ref_wall = potential_buildings[0]
    ref_loc = ref_wall['location']
    
    # Find nearby walls (within 1000 units)
    nearby_walls = []
    for wall in potential_buildings:
        loc = wall['location']
        distance = ((loc.x - ref_loc.x)**2 + (loc.y - ref_loc.y)**2)**0.5
        if distance < 1000:
            nearby_walls.append(wall)
    
    print(f"Found a building area with {len(nearby_walls)} walls")
    if nearby_walls:
        # Calculate center of this building
        center_x = sum(w['location'].x for w in nearby_walls) / len(nearby_walls)
        center_y = sum(w['location'].y for w in nearby_walls) / len(nearby_walls)
        center_z = sum(w['location'].z for w in nearby_walls) / len(nearby_walls)
        
        print(f"Building center approximately at: [{center_x:.1f}, {center_y:.1f}, {center_z:.1f}]")
        
        # Focus on first wall
        first_wall = nearby_walls[0]['actor']
        unreal.EditorLevelLibrary.set_actor_selection_state(first_wall, True)
        
        result = {
            'building_center': [center_x, center_y, center_z],
            'wall_count': len(nearby_walls),
            'first_wall_name': nearby_walls[0]['name']
        }
    else:
        result = {'error': 'No nearby walls found'}
else:
    result = {'error': 'No wall actors found'}
    
result
`;

  const buildingResult = await executeCommand({
    type: 'python.execute',
    params: { code: buildingCode }
  });
  
  if (buildingResult && buildingResult.success && buildingResult.result.building_center) {
    console.log('Found a building structure!');
    const center = buildingResult.result.building_center;
    
    // Focus camera on this building
    await executeCommand({
      type: 'viewport.camera',
      params: {
        location: [center[0] + 1000, center[1] + 1000, center[2] + 800],
        rotation: [0, -45, 225]
      }
    });
    
    // Take screenshot of the building
    const buildingScreenshot = await executeCommand({
      type: 'viewport.screenshot',
      params: { compress: true }
    });
    
    if (buildingScreenshot && buildingScreenshot.success) {
      console.log(`Building screenshot saved: ${buildingScreenshot.filename}`);
    }
  }
  
  // 5. List specific actors to understand building composition
  console.log('\n5. Getting detailed actor list for reference...');
  const actorsResult = await executeCommand({
    type: 'level.actors',
    params: { filter: 'SM_Wall', limit: 10 }
  });
  
  if (actorsResult && actorsResult.success) {
    console.log(`\nFound ${actorsResult.totalCount} wall actors. Sample:`);
    actorsResult.actors.forEach(actor => {
      console.log(`  ${actor.name}: ${actor.assetPath || 'No asset path'}`);
      if (actor.location) {
        console.log(`    Location: [${actor.location.x}, ${actor.location.y}, ${actor.location.z}]`);
      }
    });
  }
}

// Run the exploration
exploreOldTownBuildings().catch(console.error);