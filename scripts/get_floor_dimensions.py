import json
import urllib.request

def execute_command(command):
    url = 'http://localhost:8765'
    data = json.dumps(command).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        return {'success': False, 'error': str(e)}

# Get floor dimensions using python proxy
result = execute_command({
    'type': 'python_proxy',
    'params': {
        'code': '''
import unreal

# Get the floor asset
asset_path = "/Game/ModularOldTown/Meshes/SM_Floor_2m"
asset = unreal.EditorAssetLibrary.load_asset(asset_path)

if asset:
    # Get the static mesh bounds
    bounds = asset.get_bounds()
    box_extent = bounds.box_extent
    
    # Box extent is half the size in each dimension
    width = box_extent.x * 2
    length = box_extent.y * 2
    height = box_extent.z * 2
    
    print(f"SM_Floor_2m dimensions:")
    print(f"  Width (X): {width:.1f} cm ({width/100:.1f} m)")
    print(f"  Length (Y): {length:.1f} cm ({length/100:.1f} m)")
    print(f"  Height (Z): {height:.1f} cm ({height/100:.1f} m)")
else:
    print("Could not load floor asset")
'''
    }
})

if result.get('success'):
    print("\nFloor tile information retrieved successfully")
else:
    print(f"Error: {result.get('error')}")
