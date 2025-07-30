"""
Quick test script to verify modular system works
Run this in Unreal Engine Python console
"""

# Test 1: Import modules
print("=" * 60)
print("Testing modular system...")
print("=" * 60)

try:
    from uemcp_actor_ops import ActorOperations
    print("✓ Successfully imported ActorOperations")
except ImportError as e:
    print(f"✗ Failed to import ActorOperations: {e}")
    exit(1)

# Test 2: Create operations instance
try:
    actor_ops = ActorOperations()
    print("✓ Created ActorOperations instance")
except Exception as e:
    print(f"✗ Failed to create ActorOperations: {e}")
    exit(1)

# Test 3: Try to delete Fountain_LionHead_1
try:
    print("\nAttempting to delete Fountain_LionHead_1...")
    result = actor_ops.delete('Fountain_LionHead_1', validate=True)
    
    if result['success']:
        print(f"✓ {result['message']}")
        if 'validated' in result:
            print(f"  Validation: {'✓ Passed' if result['validated'] else '✗ Failed'}")
            if 'validation_errors' in result:
                for error in result['validation_errors']:
                    print(f"    Error: {error}")
    else:
        print(f"✗ Delete failed: {result.get('error', 'Unknown error')}")
        
except Exception as e:
    print(f"✗ Exception during delete: {e}")

print("\n" + "=" * 60)
print("Test complete!")
print("=" * 60)