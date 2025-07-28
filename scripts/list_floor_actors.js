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
  // List all floor actors
  const result = await executeCommand({
    type: 'level.actors',
    params: {
      filter: 'Floor'
    }
  });
  
  if (result.success) {
    console.log('Floor actors in level:', result.actors.length);
    
    // Get one floor actor to check its dimensions
    if (result.actors.length > 0) {
      const floorActor = result.actors[0];
      console.log('\nFirst floor actor:', floorActor.name);
      console.log('Location:', floorActor.location);
      
      // Now get its bounds
      const boundsResult = await executeCommand({
        type: 'python.execute',
        params: {
          code: `
import unreal

# Get the first floor actor by name
actor = unreal.EditorLevelLibrary.get_actor_reference("${floorActor.name}")

if actor:
    # Get actor bounds
    origin, extent = actor.get_actor_bounds(only_colliding_components=False)
    
    # extent is half-size, so double it for full dimensions
    width = extent.x * 2
    length = extent.y * 2
    height = extent.z * 2
    
    print(f"Floor actor bounds:")
    print(f"  Width (X): {width:.1f} cm ({width/100:.1f} m)")
    print(f"  Length (Y): {length:.1f} cm ({length/100:.1f} m)")
    print(f"  Height (Z): {height:.1f} cm")
    
    # Check the static mesh component
    mesh_comp = actor.get_component_by_class(unreal.StaticMeshComponent)
    if mesh_comp and mesh_comp.static_mesh:
        mesh_bounds = mesh_comp.static_mesh.get_bounds()
        mesh_extent = mesh_bounds.box_extent
        print(f"\\nMesh bounds:")
        print(f"  Width: {mesh_extent.x * 2:.1f} cm")
        print(f"  Length: {mesh_extent.y * 2:.1f} cm")
    
    result = {'width_cm': width, 'length_cm': length}
else:
    print("Could not find floor actor")
    result = None
`
        }
      });
      
      if (boundsResult.success) {
        console.log('\nFloor dimensions:', boundsResult.result);
      }
    }
  } else {
    console.log('Error:', result.error);
  }
}

main().catch(console.error);
