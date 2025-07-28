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
  // Get detailed floor information and spacing
  const result = await executeCommand({
    type: 'python.execute',
    params: {
      code: `
import unreal

# Get all actors and find floor tiles
all_actors = unreal.EditorLevelLibrary.get_all_level_actors()
floor_tiles = []

for actor in all_actors:
    label = actor.get_actor_label()
    # Find floor tiles specifically (F1 = first floor)
    if 'Floor_F1_' in label:
        location = actor.get_actor_location()
        floor_tiles.append({
            'name': label,
            'x': location.x,
            'y': location.y,
            'z': location.z
        })

# Sort by name to get grid pattern
floor_tiles.sort(key=lambda t: t['name'])

print(f"Found {len(floor_tiles)} first floor tiles")

if floor_tiles:
    # Parse grid positions from names (Floor_F1_ROW_COL)
    grid_tiles = {}
    for tile in floor_tiles:
        parts = tile['name'].split('_')
        if len(parts) >= 4:
            row = int(parts[2])
            col = int(parts[3])
            grid_tiles[(row, col)] = tile
    
    # Calculate spacing between adjacent tiles
    x_spacings = []
    y_spacings = []
    
    # Check horizontal spacing (same row, adjacent columns)
    for row in range(1, 5):
        for col in range(1, 8):
            if (row, col) in grid_tiles and (row, col+1) in grid_tiles:
                spacing = grid_tiles[(row, col+1)]['x'] - grid_tiles[(row, col)]['x']
                x_spacings.append(spacing)
    
    # Check vertical spacing (same column, adjacent rows)
    for col in range(1, 10):
        for row in range(1, 4):
            if (row, col) in grid_tiles and (row+1, col) in grid_tiles:
                spacing = grid_tiles[(row+1, col)]['y'] - grid_tiles[(row, col)]['y']
                y_spacings.append(spacing)
    
    if x_spacings:
        avg_x_spacing = sum(x_spacings) / len(x_spacings)
        print(f"\\nAverage X spacing between tiles: {avg_x_spacing:.1f} cm")
        print(f"Min X spacing: {min(x_spacings):.1f} cm")
        print(f"Max X spacing: {max(x_spacings):.1f} cm")
    
    if y_spacings:
        avg_y_spacing = sum(y_spacings) / len(y_spacings)
        print(f"\\nAverage Y spacing between tiles: {avg_y_spacing:.1f} cm")
        print(f"Min Y spacing: {min(y_spacings):.1f} cm")
        print(f"Max Y spacing: {max(y_spacings):.1f} cm")
    
    # Get actual tile dimensions
    if floor_tiles:
        first_actor = unreal.EditorLevelLibrary.get_actor_reference(floor_tiles[0]['name'])
        if first_actor:
            mesh_comp = first_actor.get_component_by_class(unreal.StaticMeshComponent)
            if mesh_comp and mesh_comp.static_mesh:
                bounds = mesh_comp.static_mesh.get_bounds()
                extent = bounds.box_extent
                print(f"\\nActual floor tile dimensions:")
                print(f"  Width (X): {extent.x * 2:.0f} cm")
                print(f"  Length (Y): {extent.y * 2:.0f} cm")
                print(f"  Height (Z): {extent.z * 2:.0f} cm")
                
                # Calculate gap
                tile_width = extent.x * 2
                tile_length = extent.y * 2
                
                if x_spacings:
                    x_gap = avg_x_spacing - tile_width
                    print(f"\\nX Gap between tiles: {x_gap:.1f} cm")
                
                if y_spacings:
                    y_gap = avg_y_spacing - tile_length
                    print(f"Y Gap between tiles: {y_gap:.1f} cm")
    
    # Show first few tiles for reference
    print("\\nFirst few floor tiles:")
    for tile in floor_tiles[:5]:
        print(f"  {tile['name']}: [{tile['x']:.0f}, {tile['y']:.0f}, {tile['z']:.0f}]")

result = {
    'tile_count': len(floor_tiles),
    'x_spacing': avg_x_spacing if x_spacings else None,
    'y_spacing': avg_y_spacing if y_spacings else None
}
`
    }
  });
  
  if (result.success) {
    console.log('\nAnalysis complete:', result.result);
  } else {
    console.log('Error:', result.error);
  }
}

main().catch(console.error);
