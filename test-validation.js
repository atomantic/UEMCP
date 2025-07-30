#!/usr/bin/env node

/**
 * Test script for UEMCP validation feature
 * Tests various validation scenarios for actor operations
 */

// Test basic actor spawn with validation
console.log('=== Testing Actor Spawn with Validation ===');
console.log('Test 1: Spawn with validation enabled (default)');
console.log('Command: actor_spawn({ assetPath: "/Game/ModularOldTown/Meshes/SM_Ground_02", location: [1000, 2000, 0], name: "TestGround1" })');
console.log('\nExpected: Actor spawned successfully with validation confirming location, rotation, scale');

console.log('\n\nTest 2: Spawn with validation disabled');
console.log('Command: actor_spawn({ assetPath: "/Game/ModularOldTown/Meshes/SM_Ground_02", location: [2000, 2000, 0], name: "TestGround2", validate: false })');
console.log('\nExpected: Actor spawned successfully without validation results');

// Test actor modification with validation
console.log('\n\n=== Testing Actor Modify with Validation ===');
console.log('Test 3: Modify location with validation');
console.log('Command: actor_modify({ actorName: "TestGround1", location: [1500, 2500, 100] })');
console.log('\nExpected: Location changed with validation confirming new position');

console.log('\n\nTest 4: Modify rotation with specific angles');
console.log('Command: actor_modify({ actorName: "TestGround1", rotation: [0, 0, 45] })');
console.log('\nExpected: Rotation changed with validation confirming angles within tolerance');

console.log('\n\nTest 5: Modify mesh with validation');
console.log('Command: actor_modify({ actorName: "TestGround1", mesh: "/Game/ModularOldTown/Meshes/SM_Ground_01" })');
console.log('\nExpected: Mesh changed with validation confirming new asset path');

// Test actor duplication with validation
console.log('\n\n=== Testing Actor Duplicate with Validation ===');
console.log('Test 6: Duplicate with offset');
console.log('Command: actor_duplicate({ sourceName: "TestGround1", name: "TestGround3", offset: { z: 300 } })');
console.log('\nExpected: Actor duplicated with validation confirming position offset');

// Test actor deletion with validation
console.log('\n\n=== Testing Actor Delete with Validation ===');
console.log('Test 7: Delete actor with validation');
console.log('Command: actor_delete({ actorName: "TestGround3" })');
console.log('\nExpected: Actor deleted with validation confirming it no longer exists');

// Test edge cases
console.log('\n\n=== Testing Edge Cases ===');
console.log('Test 8: Modify non-existent actor');
console.log('Command: actor_modify({ actorName: "NonExistentActor", location: [0, 0, 0] })');
console.log('\nExpected: Error returned before validation');

console.log('\n\nTest 9: Spawn with invalid mesh path');
console.log('Command: actor_spawn({ assetPath: "/Game/Invalid/Path", name: "TestInvalid", validate: false })');
console.log('\nExpected: Error returned during spawn');

console.log('\n\n=== Manual Test Instructions ===');
console.log('To test these commands:');
console.log('1. Ensure UEMCP is running in Unreal Engine');
console.log('2. Use Claude Code or MCP client to execute these commands');
console.log('3. Check the responses for validation results');
console.log('4. Verify in UE viewport that changes were applied correctly');
console.log('\nValidation should catch any discrepancies between requested and actual values.');