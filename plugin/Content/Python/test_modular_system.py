"""
Test script for UEMCP modular system
Run this in Unreal Engine Python console to verify the modular implementation
"""

import unreal
import json
from datetime import datetime


def test_imports():
    """Test that all modules can be imported."""
    print("\n" + "="*60)
    print("Testing module imports...")
    print("="*60)
    
    modules = [
        'uemcp_utils',
        'uemcp_validation',
        'uemcp_actor_ops',
        'uemcp_viewport_ops', 
        'uemcp_asset_ops',
        'uemcp_level_ops',
        'uemcp_command_registry',
        'uemcp_system_ops',
        'uemcp_listener_modular'
    ]
    
    results = []
    for module in modules:
        try:
            mod = __import__(module)
            results.append((module, True, "OK"))
            print(f"✓ {module}")
        except Exception as e:
            results.append((module, False, str(e)))
            print(f"✗ {module}: {str(e)}")
    
    success_count = sum(1 for _, success, _ in results if success)
    print(f"\nImport test: {success_count}/{len(modules)} modules imported successfully")
    
    return all(success for _, success, _ in results)


def test_command_registry():
    """Test command registry functionality."""
    print("\n" + "="*60)
    print("Testing command registry...")
    print("="*60)
    
    try:
        from uemcp_command_registry import get_registry, register_all_operations
        from uemcp_system_ops import register_system_operations
        
        # Get registry
        registry = get_registry()
        
        # Register all operations
        register_all_operations()
        register_system_operations()
        
        # List commands
        commands = registry.list_commands()
        print(f"Total commands registered: {len(commands)}")
        
        # Show by category
        categories = registry.get_commands_by_category()
        print("\nCommands by category:")
        for category, cmds in sorted(categories.items()):
            print(f"  {category}: {len(cmds)} commands")
            if len(cmds) <= 5:
                for cmd in cmds:
                    print(f"    - {cmd}")
        
        return True
        
    except Exception as e:
        print(f"Command registry test failed: {str(e)}")
        return False


def test_operations():
    """Test individual operation classes."""
    print("\n" + "="*60)
    print("Testing operation classes...")
    print("="*60)
    
    tests = []
    
    # Test actor operations
    try:
        from uemcp_actor_ops import ActorOperations
        actor_ops = ActorOperations()
        
        # Test spawning a cube
        result = actor_ops.spawn(
            assetPath='/Engine/BasicShapes/Cube',
            location=[0, 0, 100],
            name='TestCube_Modular',
            validate=False  # Skip validation for speed
        )
        
        if result['success']:
            print("✓ ActorOperations.spawn() - Created test cube")
            
            # Test deletion
            delete_result = actor_ops.delete('TestCube_Modular', validate=False)
            if delete_result['success']:
                print("✓ ActorOperations.delete() - Deleted test cube")
                tests.append(('ActorOperations', True))
            else:
                print("✗ ActorOperations.delete() failed")
                tests.append(('ActorOperations', False))
        else:
            print("✗ ActorOperations.spawn() failed")
            tests.append(('ActorOperations', False))
            
    except Exception as e:
        print(f"✗ ActorOperations test failed: {str(e)}")
        tests.append(('ActorOperations', False))
    
    # Test level operations
    try:
        from uemcp_level_ops import LevelOperations
        level_ops = LevelOperations()
        
        # Get project info
        result = level_ops.get_project_info()
        if result['success']:
            print(f"✓ LevelOperations.get_project_info() - Project: {result.get('projectName', 'Unknown')}")
            tests.append(('LevelOperations', True))
        else:
            print("✗ LevelOperations.get_project_info() failed")
            tests.append(('LevelOperations', False))
            
    except Exception as e:
        print(f"✗ LevelOperations test failed: {str(e)}")
        tests.append(('LevelOperations', False))
    
    # Test asset operations
    try:
        from uemcp_asset_ops import AssetOperations
        asset_ops = AssetOperations()
        
        # List some assets
        result = asset_ops.list_assets(path='/Engine/BasicShapes', limit=5)
        if result['success']:
            print(f"✓ AssetOperations.list_assets() - Found {len(result['assets'])} assets")
            tests.append(('AssetOperations', True))
        else:
            print("✗ AssetOperations.list_assets() failed")
            tests.append(('AssetOperations', False))
            
    except Exception as e:
        print(f"✗ AssetOperations test failed: {str(e)}")
        tests.append(('AssetOperations', False))
    
    # Test viewport operations
    try:
        from uemcp_viewport_ops import ViewportOperations
        viewport_ops = ViewportOperations()
        
        # Get current camera info (non-destructive test)
        editor_subsystem = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem)
        location, rotation = editor_subsystem.get_level_viewport_camera_info()
        print(f"✓ ViewportOperations - Current camera at: ({location.x:.1f}, {location.y:.1f}, {location.z:.1f})")
        tests.append(('ViewportOperations', True))
        
    except Exception as e:
        print(f"✗ ViewportOperations test failed: {str(e)}")
        tests.append(('ViewportOperations', False))
    
    success_count = sum(1 for _, success in tests if success)
    print(f"\nOperation tests: {success_count}/{len(tests)} passed")
    
    return all(success for _, success in tests)


def test_command_dispatch():
    """Test command dispatching."""
    print("\n" + "="*60)
    print("Testing command dispatch...")
    print("="*60)
    
    try:
        from uemcp_command_registry import dispatch_command
        
        # Test a simple command
        result = dispatch_command('test_connection', {})
        if result.get('success'):
            print(f"✓ Dispatch test_connection: UE {result.get('unrealVersion', 'Unknown')}")
        else:
            print("✗ Dispatch test_connection failed")
            return False
        
        # Test with parameters
        result = dispatch_command('help', {'category': 'actor'})
        if result.get('success'):
            print(f"✓ Dispatch help with params: {len(result.get('tools', []))} actor tools")
        else:
            print("✗ Dispatch help failed")
            return False
        
        # Test invalid command
        result = dispatch_command('invalid_command', {})
        if not result.get('success') and 'Unknown command' in result.get('error', ''):
            print("✓ Invalid command handled correctly")
        else:
            print("✗ Invalid command not handled properly")
            return False
        
        return True
        
    except Exception as e:
        print(f"Command dispatch test failed: {str(e)}")
        return False


def test_validation():
    """Test validation functionality."""
    print("\n" + "="*60)
    print("Testing validation system...")
    print("="*60)
    
    try:
        from uemcp_validation import ValidationResult, validate_location, validate_rotation
        
        # Test validation result
        result = ValidationResult()
        result.add_error("Test error")
        result.add_warning("Test warning")
        
        if not result.success and len(result.errors) == 1 and len(result.warnings) == 1:
            print("✓ ValidationResult working correctly")
        else:
            print("✗ ValidationResult not working as expected")
            return False
        
        # Test location validation
        if validate_location([100, 200, 300], [100, 200, 300]):
            print("✓ Location validation: exact match")
        else:
            print("✗ Location validation failed for exact match")
            return False
        
        # Test rotation validation with normalization
        if validate_rotation([0, 0, 450], [0, 0, 90]):  # 450° = 90°
            print("✓ Rotation validation: angle normalization working")
        else:
            print("✗ Rotation validation: angle normalization failed")
            return False
        
        return True
        
    except Exception as e:
        print(f"Validation test failed: {str(e)}")
        return False


def run_all_tests():
    """Run all tests and provide summary."""
    print("\n" + "="*60)
    print(f"UEMCP Modular System Test Suite")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    test_results = []
    
    # Run each test
    tests = [
        ("Module Imports", test_imports),
        ("Command Registry", test_command_registry),
        ("Operations", test_operations),
        ("Command Dispatch", test_command_dispatch),
        ("Validation", test_validation)
    ]
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            test_results.append((test_name, result))
        except Exception as e:
            print(f"\n✗ {test_name} test crashed: {str(e)}")
            test_results.append((test_name, False))
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    passed = 0
    for test_name, result in test_results:
        status = "PASSED" if result else "FAILED"
        symbol = "✓" if result else "✗"
        print(f"{symbol} {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nTotal: {passed}/{len(test_results)} tests passed")
    
    if passed == len(test_results):
        print("\n🎉 All tests passed! The modular system is ready to use.")
        print("\nNext steps:")
        print("1. Run: from uemcp_migrate import migrate_to_modular")
        print("2. Run: migrate_to_modular()")
        print("3. Run: restart_listener()")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        print("The modular system may not be fully functional.")
    
    return passed == len(test_results)


# Make it easy to run from console
if __name__ == "__main__":
    run_all_tests()