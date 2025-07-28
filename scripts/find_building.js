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
  // Use python to search for building-related actors
  const result = await executeCommand({
    type: 'python.execute',
    params: {
      code: `
import unreal

# Get all actors
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()

# Group actors by type
actor_types = {}
building_actors = []

for actor in all_actors:
    label = actor.get_actor_label()
    
    # Check for building-related actors
    if any(keyword in label for keyword in ['Wall', 'Floor', 'Door', 'Window', 'Corner', 'Foundation', 'House']):
        building_actors.append({
            'name': label,
            'location': actor.get_actor_location(),
            'class': actor.__class__.__name__
        })
    
    # Group by prefix
    prefix = label.split('_')[0] if '_' in label else label.split(' ')[0]
    if prefix not in actor_types:
        actor_types[prefix] = 0
    actor_types[prefix] += 1

print(f"Total actors: {len(all_actors)}")
print(f"\\nActor types:")
for prefix, count in sorted(actor_types.items()):
    print(f"  {prefix}: {count}")

print(f"\\nBuilding-related actors found: {len(building_actors)}")
if building_actors:
    print("\\nFirst 10 building actors:")
    for actor in building_actors[:10]:
        loc = actor['location']
        print(f"  {actor['name']} at [{loc.x:.0f}, {loc.y:.0f}, {loc.z:.0f}] ({actor['class']})")
    
    # Try to find a good camera position
    if building_actors:
        # Calculate center of building actors
        x_coords = [a['location'].x for a in building_actors]
        y_coords = [a['location'].y for a in building_actors]
        z_coords = [a['location'].z for a in building_actors]
        
        center_x = sum(x_coords) / len(x_coords)
        center_y = sum(y_coords) / len(y_coords)
        center_z = sum(z_coords) / len(z_coords)
        
        print(f"\\nBuilding center approximately at: [{center_x:.0f}, {center_y:.0f}, {center_z:.0f}]")

result = {
    'total_actors': len(all_actors),
    'building_actors': len(building_actors),
    'actor_types': actor_types
}
`
    }
  });
  
  if (result.success) {
    console.log('\nResult:', result.result);
  } else {
    console.log('Error:', result.error);
  }
}

main().catch(console.error);
