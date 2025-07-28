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
  // Use python to find floor tiles more precisely
  const result = await executeCommand({
    type: 'python.execute',
    params: {
      code: `
import unreal

# Get all actors
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Find floor tiles
floor_tiles = []
for actor in all_actors:
    if actor.get_actor_label().startswith('SM_Floor_2m'):
        location = actor.get_actor_location()
        floor_tiles.append({
            'name': actor.get_actor_label(),
            'location': {'x': location.x, 'y': location.y, 'z': location.z}
        })

# Sort by location for easier analysis
floor_tiles.sort(key=lambda a: (a['location']['x'], a['location']['y']))

print(f"Found {len(floor_tiles)} floor tiles")

if len(floor_tiles) > 0:
    print("\\nFirst 10 floor tiles:")
    for i, tile in enumerate(floor_tiles[:10]):
        print(f"  {tile['name']}: [{tile['location']['x']:.0f}, {tile['location']['y']:.0f}]")
    
    # Calculate spacing
    if len(floor_tiles) >= 2:
        # Find two tiles in same row (same Y)
        for i in range(len(floor_tiles)-1):
            if abs(floor_tiles[i]['location']['y'] - floor_tiles[i+1]['location']['y']) < 10:
                x_spacing = floor_tiles[i+1]['location']['x'] - floor_tiles[i]['location']['x']
                print(f"\\nX spacing between tiles in same row: {x_spacing:.0f} cm")
                break
        
        # Find two tiles in same column (same X)
        for i in range(len(floor_tiles)-1):
            for j in range(i+1, len(floor_tiles)):
                if abs(floor_tiles[i]['location']['x'] - floor_tiles[j]['location']['x']) < 10:
                    y_spacing = abs(floor_tiles[j]['location']['y'] - floor_tiles[i]['location']['y'])
                    print(f"Y spacing between tiles in same column: {y_spacing:.0f} cm")
                    break
    
    # Get actual mesh dimensions
    if len(floor_tiles) > 0:
        first_actor = unreal.EditorLevelLibrary.get_actor_reference(floor_tiles[0]['name'])
        if first_actor:
            mesh_comp = first_actor.get_component_by_class(unreal.StaticMeshComponent)
            if mesh_comp and mesh_comp.static_mesh:
                bounds = mesh_comp.static_mesh.get_bounds()
                extent = bounds.box_extent
                print(f"\\nActual floor tile dimensions:")
                print(f"  Width (X): {extent.x * 2:.0f} cm")
                print(f"  Length (Y): {extent.y * 2:.0f} cm")

result = floor_tiles[:5] if floor_tiles else []
`
    }
  });
  
  if (result.success) {
    console.log('\nFloor tiles data:', result.result);
  } else {
    console.log('Error:', result.error);
  }
}

main().catch(console.error);
