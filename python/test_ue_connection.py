"""
Test script to verify Unreal Engine Python connection
Run this in Unreal's Python console to test
"""
import unreal

def test_connection() -> bool:
    """Test basic Unreal Engine Python API access"""
    print("=== UEMCP Connection Test ===")
    
    # Get project info
    project_name = unreal.SystemLibrary.get_project_name()
    project_dir = unreal.SystemLibrary.get_project_directory()
    engine_version = unreal.SystemLibrary.get_engine_version()
    
    print(f"Project Name: {project_name}")
    print(f"Project Directory: {project_dir}")
    print(f"Engine Version: {engine_version}")
    
    # List some assets
    asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
    
    # Get all assets in /Game
    filter_args = unreal.ARFilter()
    filter_args.package_paths = ['/Game']
    filter_args.recursive_paths = False
    
    assets = asset_registry.get_assets(filter_args)
    print(f"\nFound {len(assets)} assets in /Game")
    
    # List first 5 assets
    for i, asset in enumerate(assets[:5]):
        print(f"  {i+1}. {asset.asset_name} ({asset.asset_class})")
    
    print("\n=== Test Complete ===")
    return True

# Run the test
if __name__ == "__main__":
    test_connection()