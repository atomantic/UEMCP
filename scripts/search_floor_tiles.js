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
  // Search more carefully for floor tiles or building components
  const result = await executeCommand({
    type: 'python.execute',
    params: {
      code: `
import unreal

# Get all actors and their labels
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
print(f"Total actors in level: {len(all_actors)}")

# Look for any static mesh actors
static_mesh_actors = []
for actor in all_actors:
    try:
        if actor.get_class().get_name() == 'StaticMeshActor':
            label = actor.get_actor_label()
            location = actor.get_actor_location()
            
            # Get the static mesh component
            mesh_comp = actor.get_component_by_class(unreal.StaticMeshComponent)
            mesh_name = "Unknown"
            if mesh_comp and mesh_comp.static_mesh:
                mesh_name = mesh_comp.static_mesh.get_name()
            
            static_mesh_actors.append({
                'label': label,
                'mesh_name': mesh_name,
                'location': {'x': location.x, 'y': location.y, 'z': location.z}
            })
    except:
        pass

print(f"\\nFound {len(static_mesh_actors)} static mesh actors")

# Filter for floor-related meshes
floor_actors = [a for a in static_mesh_actors if 'Floor' in a['mesh_name'] or 'floor' in a['label'].lower()]
print(f"\\nFloor actors: {len(floor_actors)}")

if floor_actors:
    print("\\nFloor actors found:")
    for i, actor in enumerate(floor_actors[:10]):
        print(f"  {i+1}. {actor['label']} (mesh: {actor['mesh_name']})")
        print(f"     Location: [{actor['location']['x']:.0f}, {actor['location']['y']:.0f}, {actor['location']['z']:.0f}]")
else:
    # Show some other actors to understand what's in the level
    print("\\nShowing first 10 static mesh actors:")
    for i, actor in enumerate(static_mesh_actors[:10]):
        print(f"  {i+1}. {actor['label']} (mesh: {actor['mesh_name']})")

result = {'floor_actors': floor_actors, 'total_static_mesh': len(static_mesh_actors)}
`
    }
  });
  
  if (result.success) {
    console.log('\nFloor actors found:', result.result);
  } else {
    console.log('Error:', result.error);
  }
}

main().catch(console.error);
