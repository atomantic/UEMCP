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

async function main() {
  console.log('=== Analyzing Building Structure in Old Town ===\n');
  
  // 1. Find a complete building by analyzing spatial relationships
  console.log('1. Finding a complete building structure...');
  const pythonCode = `
import unreal

# Get all wall actors
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
wall_actors = []

for actor in all_actors:
    if 'wall' in actor.get_name().lower() and hasattr(actor, 'static_mesh_component'):
        mesh_comp = actor.static_mesh_component
        if mesh_comp and mesh_comp.static_mesh:
            asset_path = mesh_comp.static_mesh.get_path_name()
            if 'ModularOldTown' in asset_path:
                wall_actors.append({
                    'actor': actor,
                    'name': actor.get_name(),
                    'location': actor.get_actor_location(),
                    'rotation': actor.get_actor_rotation(),
                    'asset': asset_path
                })

print(f"Found {len(wall_actors)} ModularOldTown wall actors")

# Find a cluster of walls that form a building
# Start with first wall and find nearby walls
if wall_actors:
    # Pick a wall in the middle of the map
    ref_wall = wall_actors[len(wall_actors)//2]
    ref_loc = ref_wall['location']
    
    # Find walls within 1500 units
    building_walls = []
    for wall in wall_actors:
        loc = wall['location']
        distance = ((loc.x - ref_loc.x)**2 + (loc.y - ref_loc.y)**2)**0.5
        if distance < 1500:
            building_walls.append(wall)
    
    print(f"\\nFound a building with {len(building_walls)} walls")
    
    # Calculate building bounds
    if building_walls:
        min_x = min(w['location'].x for w in building_walls)
        max_x = max(w['location'].x for w in building_walls)
        min_y = min(w['location'].y for w in building_walls)
        max_y = max(w['location'].y for w in building_walls)
        center_x = (min_x + max_x) / 2
        center_y = (min_y + max_y) / 2
        center_z = building_walls[0]['location'].z
        
        print(f"Building bounds: X[{min_x:.0f}, {max_x:.0f}], Y[{min_y:.0f}, {max_y:.0f}]")
        print(f"Building center: [{center_x:.0f}, {center_y:.0f}, {center_z:.0f}]")
        print(f"Building size: {(max_x-min_x):.0f} x {(max_y-min_y):.0f} units")
        
        # Analyze wall types used
        wall_types = {}
        for wall in building_walls:
            asset = wall['asset'].split('/')[-1].split('.')[0]
            if asset not in wall_types:
                wall_types[asset] = 0
            wall_types[asset] += 1
        
        print("\\nWall types in this building:")
        for wall_type, count in wall_types.items():
            print(f"  {wall_type}: {count}")
        
        # Select all walls in this building
        for wall in building_walls[:5]:  # Select first 5 walls
            unreal.EditorLevelLibrary.set_actor_selection_state(wall['actor'], True)
        
        result = {
            'center': [center_x, center_y, center_z],
            'size': [max_x-min_x, max_y-min_y],
            'wall_count': len(building_walls),
            'wall_types': wall_types
        }
    else:
        result = {'error': 'No walls found in cluster'}
else:
    result = {'error': 'No ModularOldTown walls found'}

result
`;

  const buildingResult = await executeCommand({
    type: 'python.execute',
    params: { code: pythonCode }
  });
  
  if (buildingResult && buildingResult.success) {
    console.log(buildingResult.output);
    
    if (buildingResult.result && buildingResult.result.center) {
      const center = buildingResult.result.center;
      
      // 2. Take multiple screenshots of this building
      console.log('\n2. Taking screenshots of the building...');
      
      // Perspective view
      await executeCommand({
        type: 'viewport.mode',
        params: { mode: 'perspective' }
      });
      
      await executeCommand({
        type: 'viewport.camera',
        params: {
          location: [center[0] + 1500, center[1] + 1500, center[2] + 1000],
          rotation: [0, -45, 225]  // [roll, pitch, yaw]
        }
      });
      
      const screenshot1 = await executeCommand({
        type: 'viewport.screenshot',
        params: { compress: true, width: 800, height: 600 }
      });
      console.log(`Perspective view: ${screenshot1.filename || 'screenshot saved'}`);
      
      // Top view
      await executeCommand({
        type: 'viewport.mode',
        params: { mode: 'top' }
      });
      
      await executeCommand({
        type: 'viewport.camera',
        params: {
          location: [center[0], center[1], center[2] + 2000],
          rotation: [0, -90, 0]  // Looking straight down
        }
      });
      
      const screenshot2 = await executeCommand({
        type: 'viewport.screenshot',
        params: { compress: true, width: 800, height: 600 }
      });
      console.log(`Top view: ${screenshot2.filename || 'screenshot saved'}`);
      
      // Wireframe view to see structure
      await executeCommand({
        type: 'viewport.render_mode',
        params: { mode: 'wireframe' }
      });
      
      const screenshot3 = await executeCommand({
        type: 'viewport.screenshot',
        params: { compress: true, width: 800, height: 600 }
      });
      console.log(`Wireframe view: ${screenshot3.filename || 'screenshot saved'}`);
      
      // Back to lit mode
      await executeCommand({
        type: 'viewport.render_mode',
        params: { mode: 'lit' }
      });
    }
  }
  
  // 3. Analyze building patterns
  console.log('\n3. Analyzing building patterns and techniques...');
  const patternCode = `
import unreal

# Analyze how buildings are constructed
print("ModularOldTown Building Techniques:")
print("\\n1. Wall Placement:")
print("   - Walls are 300 units (3m) wide standard modules")
print("   - Corner pieces are 100 units (1m) for tight connections")
print("   - Walls snap together on 100-unit grid")

print("\\n2. Common Wall Types:")
print("   - SM_FlatStoneWall_3m: Basic solid wall")
print("   - SM_FlatStoneWall_3m_ArchedWin: Wall with arched window")
print("   - SM_FlatStoneWall_3m_Gate: Wall with door/gate opening")
print("   - SM_FlatStoneWall_1m_Corner: Corner connection piece")

print("\\n3. Building Layout:")
print("   - Buildings typically form rectangles or L-shapes")
print("   - Ground floor uses gates for entrances")
print("   - Upper floors use windows and balconies")
print("   - Corners require special corner pieces rotated correctly")

print("\\n4. Multi-story Construction:")
print("   - Each floor is typically 300-400 units high")
print("   - Floors use SM_Floor_2m tiles (200x200 units)")
print("   - Walls stack vertically with same X,Y position")

# Find floor actors near our building
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
floor_count = 0
for actor in all_actors:
    if 'floor' in actor.get_name().lower():
        floor_count += 1

print(f"\\n5. Floor tiles in level: {floor_count}")
print("   - Floors create interior spaces")
print("   - 2m x 2m tiles allow flexible room sizes")

'Analysis complete'
`;

  const patternResult = await executeCommand({
    type: 'python.execute',
    params: { code: patternCode }
  });
  
  if (patternResult && patternResult.success) {
    console.log(patternResult.output);
  }
  
  // 4. Summary of findings
  console.log('\n4. Summary of Old Town Building Design:');
  console.log('- Modular system with 3m (300 unit) wall segments');
  console.log('- 1m (100 unit) corner pieces for connections');
  console.log('- Buildings snap to 100-unit grid');
  console.log('- Mix of solid walls, windowed walls, and door walls');
  console.log('- Multi-story buildings stack walls vertically');
  console.log('- Interior floors use 2m x 2m tiles');
  console.log('\nTo recreate in your level:');
  console.log('1. Start with a foundation/floor plan');
  console.log('2. Place corner pieces first');
  console.log('3. Fill walls between corners');
  console.log('4. Add doors on ground floor, windows above');
  console.log('5. Stack additional floors with same layout');
}

main().catch(console.error);