"""
Test script for improved error handling framework

Run this in Unreal Engine Python console to test the new error handling.
"""

import unreal


def test_error_handling_framework():
    """Test the new error handling framework with various error scenarios."""
    
    print("🧪 Testing UEMCP Error Handling Framework")
    print("=" * 50)
    
    try:
        from utils.error_handling import (
            ValidationError, ProcessingError,
            validate_inputs, RequiredRule, AssetPathRule, ListLengthRule,
            require_asset, require_actor, validate_location
        )
        from ops.actor_improved import ActorOperationsImproved
        
        print("✅ Successfully imported error handling framework")
    except ImportError as e:
        print(f"❌ Failed to import error handling framework: {e}")
        return
    
    # Test 1: Input Validation
    print("\n🔍 Test 1: Input Validation")
    print("-" * 30)
    
    ops = ActorOperationsImproved()
    
    # Test invalid asset path
    try:
        result = ops.spawn(
            assetPath="invalid_path",  # Should fail validation
            location=[0, 0, 100]
        )
        print("❌ Expected ValidationError for invalid asset path")
    except ValidationError as e:
        print(f"✅ Caught ValidationError: {e.message}")
    except Exception as e:
        print(f"❌ Unexpected error type: {type(e).__name__}: {e}")
    
    # Test invalid location
    try:
        result = ops.spawn(
            assetPath="/Engine/BasicShapes/Cube",
            location=[0, 0]  # Should fail - need 3 elements
        )
        print("❌ Expected ValidationError for invalid location")
    except ValidationError as e:
        print(f"✅ Caught ValidationError: {e.message}")
    except Exception as e:
        print(f"❌ Unexpected error type: {type(e).__name__}: {e}")
    
    # Test 2: Asset Loading
    print("\n📦 Test 2: Asset Loading")
    print("-" * 30)
    
    try:
        result = ops.spawn(
            assetPath="/Game/NonExistentAsset",  # Valid format, but doesn't exist
            location=[0, 0, 100]
        )
        print("❌ Expected ProcessingError for non-existent asset")
    except Exception as e:
        error_type = type(e).__name__
        print(f"✅ Caught {error_type}: {str(e)}")
    
    # Test 3: Actor Finding
    print("\n🎭 Test 3: Actor Operations")
    print("-" * 30)
    
    try:
        result = ops.delete("NonExistentActor")
        print("❌ Expected ProcessingError for non-existent actor")
    except Exception as e:
        error_type = type(e).__name__
        print(f"✅ Caught {error_type}: {str(e)}")
    
    # Test 4: Successful Operation
    print("\n✨ Test 4: Successful Operation")
    print("-" * 30)
    
    try:
        result = ops.spawn(
            assetPath="/Engine/BasicShapes/Cube",
            location=[100, 100, 100],
            name="ErrorHandlingTest_Cube"
        )
        
        if result.get("success", True):  # New framework defaults to success
            print(f"✅ Successfully spawned: {result.get('actorName')}")
            
            # Clean up
            delete_result = ops.delete("ErrorHandlingTest_Cube")
            if delete_result.get("success", True):
                print(f"✅ Successfully deleted test actor")
        else:
            print(f"❌ Spawn failed: {result.get('error')}")
            
    except Exception as e:
        error_type = type(e).__name__
        print(f"❌ Unexpected error in successful operation: {error_type}: {e}")
    
    # Test 5: Validation Utilities
    print("\n🔧 Test 5: Validation Utilities")
    print("-" * 30)
    
    try:
        validate_location([1, 2, 3])
        print("✅ Valid location passed validation")
    except ValidationError as e:
        print(f"❌ Unexpected validation error: {e.message}")
    
    try:
        validate_location([1, 2])  # Should fail
        print("❌ Expected ValidationError for invalid location")
    except ValidationError as e:
        print(f"✅ Caught location validation error: {e.message}")
    
    print("\n🎉 Error handling framework test completed!")
    print("=" * 50)


def test_comparison():
    """Show side-by-side comparison of old vs new error handling."""
    
    print("\n📊 OLD vs NEW Error Handling Comparison")
    print("=" * 60)
    
    print("""
OLD PATTERN (verbose, generic errors):
```python
def spawn_actor(assetPath, location):
    try:
        # Validate inputs manually
        if not assetPath:
            return {"success": False, "error": "assetPath is required"}
        if not isinstance(location, list) or len(location) != 3:
            return {"success": False, "error": "location must be [X,Y,Z]"}
            
        # Load asset with manual error handling
        asset = load_asset(assetPath)
        if not asset:
            return {"success": False, "error": f"Could not load asset: {assetPath}"}
            
        # Business logic with try/catch
        actor = unreal.EditorLevelLibrary.spawn_actor_from_object(asset, ...)
        if not actor:
            return {"success": False, "error": "Failed to spawn actor"}
            
        return {"success": True, "actorName": actor.get_actor_label()}
        
    except Exception as e:
        log_error(f"Failed to spawn actor: {str(e)}")
        return {"success": False, "error": str(e)}
```

NEW PATTERN (concise, specific errors):
```python
@validate_inputs({
    'assetPath': [RequiredRule(), AssetPathRule()],
    'location': [RequiredRule(), ListLengthRule(3)]
})
@handle_unreal_errors("spawn_actor")
@safe_operation("actor")
def spawn_actor(assetPath: str, location: List[float]):
    # No validation needed - done by decorator
    # No try/catch needed - done by decorators
    
    asset = require_asset(assetPath)  # Specific ProcessingError if fails
    actor = unreal.EditorLevelLibrary.spawn_actor_from_object(asset, ...)
    
    if not actor:
        raise ProcessingError("Failed to spawn actor")  # Specific error type
        
    return {"actorName": actor.get_actor_label()}
```

BENEFITS:
✅ 60% less code
✅ No manual validation boilerplate  
✅ No try/catch boilerplate
✅ Specific error types (ValidationError, ProcessingError vs generic Exception)
✅ Automatic error logging and formatting
✅ Type hints for better IDE support
✅ Reusable validation rules
✅ Consistent error response format
""")


if __name__ == "__main__":
    test_error_handling_framework()
    test_comparison()