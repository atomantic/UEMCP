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
  console.log('=== Building Copy/Recreation Workflow ===\n');
  
  console.log('OPTION 1: Copy Existing Building from Old Town');
  console.log('----------------------------------------------');
  
  // Select a building in Old Town
  const selectCode = `
import unreal

# Find and select a complete building
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Look for a specific building area (you can adjust these coordinates)
building_actors = []
target_area_center = unreal.Vector(0, 0, 0)  # Adjust to building location

for actor in all_actors:
    if hasattr(actor, 'static_mesh_component'):
        mesh_comp = actor.static_mesh_component
        if mesh_comp and mesh_comp.static_mesh:
            asset_path = mesh_comp.static_mesh.get_path_name()
            if 'ModularOldTown' in asset_path:
                location = actor.get_actor_location()
                # Find actors within 2000 units of center
                distance = (location - target_area_center).size()
                if distance < 2000:
                    building_actors.append(actor)

# Select all actors in this building
unreal.EditorLevelLibrary.deselect_all_actors()
for actor in building_actors[:50]:  # Select up to 50 actors
    unreal.EditorLevelLibrary.set_actor_selection_state(actor, True)

print(f"Selected {len(building_actors[:50])} actors from building")
print("\\nTo copy this building:")
print("1. With actors selected, press Ctrl+C (or Cmd+C on Mac)")
print("2. Switch to your HomeWorld map:")
print("   - File -> Open Level -> /Game/Maps/HomeWorld")
print("3. Press Ctrl+V (or Cmd+V) to paste")
print("4. Move the pasted building to desired location")

len(building_actors)
`;

  const selectResult = await executeCommand({
    type: 'python.execute',
    params: { code: selectCode }
  });
  
  if (selectResult && selectResult.success) {
    console.log(selectResult.output);
  }
  
  console.log('\n\nOPTION 2: Create Building Blueprint');
  console.log('-----------------------------------');
  console.log('1. With building actors selected (from Option 1)');
  console.log('2. Right-click in viewport -> Create Blueprint -> Harvest Components');
  console.log('3. Name it something like "BP_OldTownHouse_Style1"');
  console.log('4. Save in /Game/Blueprints/ folder');
  console.log('5. This blueprint can be reused in any map');
  
  console.log('\n\nOPTION 3: Manually Recreate (Recommended for Learning)');
  console.log('-----------------------------------------------------');
  
  // Generate building plan
  const buildingPlanCode = `
import unreal

print("Building Recreation Guide:")
print("\\n1. Basic House Structure (10m x 10m):")
print("   Ground Floor:")
print("   - 4x SM_FlatStoneWall_3m for walls")
print("   - 4x SM_FlatStoneWall_1m_Corner for corners")
print("   - 1x SM_FlatStoneWall_3m_Gate for entrance")
print("   - 25x SM_Floor_2m tiles (5x5 grid) for floor")
print("")
print("2. Placement Grid (example for 10x10m building):")
print("   Corners: [0,0], [1000,0], [1000,1000], [0,1000]")
print("   North Wall: X=0-1000, Y=0")
print("   South Wall: X=0-1000, Y=1000") 
print("   East Wall: X=1000, Y=0-1000")
print("   West Wall: X=0, Y=0-1000")
print("")
print("3. Second Floor (same footprint):")
print("   - Copy ground floor walls")
print("   - Move up by 300-400 units")
print("   - Replace gate with window wall")
print("   - Add floor tiles at Z=300")
print("")
print("4. Rotation Values:")
print("   - North/South walls: Yaw=0")
print("   - East/West walls: Yaw=90 or -90")
print("   - Corners: Varies by position")

# Return sample building data
result = {
    'building_size': [1000, 1000],  # 10x10 meters
    'wall_height': 300,
    'assets_needed': {
        'walls': 'SM_FlatStoneWall_3m',
        'corners': 'SM_FlatStoneWall_1m_Corner',
        'doors': 'SM_FlatStoneWall_3m_Gate',
        'windows': 'SM_FlatStoneWall_3m_ArchedWin',
        'floors': 'SM_Floor_2m'
    },
    'grid_size': 100  # Snap to 100-unit grid
}
result
`;

  const planResult = await executeCommand({
    type: 'python.execute',
    params: { code: buildingPlanCode }
  });
  
  if (planResult && planResult.success) {
    console.log(planResult.output);
  }
  
  console.log('\n\nNext Steps:');
  console.log('-----------');
  console.log('1. Decide which option works best for you:');
  console.log('   - Copy: Fastest, exact replica');
  console.log('   - Blueprint: Reusable, customizable');
  console.log('   - Manual: Best for learning the system');
  console.log('');
  console.log('2. To return to your map:');
  console.log('   File -> Open Level -> /Game/Maps/HomeWorld');
  console.log('');
  console.log('3. Remember to save your work frequently!');
}

main().catch(console.error);