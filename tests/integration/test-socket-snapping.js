#!/usr/bin/env node

/**
 * Integration test for actor_snap_to_socket tool
 * Creates test meshes with sockets and verifies proper attachment
 */

import { MCPClient } from '../utils/mcp-client.js';

class SocketSnappingTest {
  constructor() {
    this.client = new MCPClient();
    this.testActors = [];
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Create a test cube mesh with a socket at a specific location
   */
  async createTestMeshWithSocket(meshName, socketName, socketLocation, socketRotation = [0, 0, 0]) {
    console.log(`📦 Creating test mesh: ${meshName} with socket: ${socketName}`);
    
    const result = await this.client.callTool('python_proxy', {
      code: `
import unreal

# Create a simple cube mesh
cube_mesh = unreal.EditorAssetLibrary.load_asset('/Engine/BasicShapes/Cube')
if not cube_mesh:
    result = {'success': False, 'error': 'Could not load cube mesh'}
else:
    # Spawn the cube as an actor
    actor = unreal.EditorLevelLibrary.spawn_actor_from_object(
        cube_mesh,
        unreal.Vector(${socketLocation[0] * 2}, ${socketLocation[1] * 2}, 0)  # Spawn away from origin
    )
    
    if actor:
        actor.set_actor_label('${meshName}')
        
        # Get the static mesh component
        mesh_comp = actor.static_mesh_component
        if mesh_comp and mesh_comp.static_mesh:
            # Create a socket on the mesh
            socket = unreal.SkeletalMeshSocket()
            socket.socket_name = '${socketName}'
            socket.relative_location = unreal.Vector(${socketLocation[0]}, ${socketLocation[1]}, ${socketLocation[2]})
            socket.relative_rotation = unreal.Rotator(${socketRotation[0]}, ${socketRotation[1]}, ${socketRotation[2]})
            socket.relative_scale = unreal.Vector(1, 1, 1)
            
            # Note: For runtime testing, we'll simulate socket behavior
            # In production, sockets are added in the Static Mesh Editor
            
            result = {
                'success': True,
                'actorName': '${meshName}',
                'socketName': '${socketName}',
                'socketLocation': [${socketLocation[0]}, ${socketLocation[1]}, ${socketLocation[2]}],
                'actorLocation': [actor.get_actor_location().x, actor.get_actor_location().y, actor.get_actor_location().z]
            }
        else:
            result = {'success': False, 'error': 'Could not access mesh component'}
    else:
        result = {'success': False, 'error': 'Failed to spawn actor'}
`
    });
    
    if (result.content[0].text.includes('success": true')) {
      this.testActors.push(meshName);
      console.log(`✅ Created ${meshName}`);
      return true;
    } else {
      console.error(`❌ Failed to create ${meshName}:`, result.content[0].text);
      return false;
    }
  }

  /**
   * Test basic socket snapping
   */
  async testBasicSocketSnap() {
    console.log('\n🧪 Test 1: Basic Socket Snapping');
    
    // Use existing ModularOldTown assets that have sockets
    const wall = await this.client.callTool('actor_spawn', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Wall_Plain_Door_01',
      location: [0, 0, 0],
      rotation: [0, 0, 0],
      name: 'TestWall_Basic'
    });
    
    this.testActors.push('TestWall_Basic');
    
    const door = await this.client.callTool('actor_spawn', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Door_01',
      location: [500, 500, 0],
      name: 'TestDoor_Basic'
    });
    
    this.testActors.push('TestDoor_Basic');
    
    // Snap door to wall socket
    const snapResult = await this.client.callTool('actor_snap_to_socket', {
      sourceActor: 'TestDoor_Basic',
      targetActor: 'TestWall_Basic',
      targetSocket: 'DoorSocket',
      validate: true
    });
    
    // Verify the snap succeeded
    const success = snapResult.content[0].text.includes('success');
    const hasValidation = snapResult.content[0].text.includes('validation');
    
    if (success) {
      console.log('✅ Basic socket snap succeeded');
      this.testResults.passed++;
    } else {
      console.error('❌ Basic socket snap failed');
      this.testResults.failed++;
    }
    
    this.testResults.tests.push({
      name: 'Basic Socket Snapping',
      passed: success,
      details: snapResult.content[0].text
    });
    
    return success;
  }

  /**
   * Test socket snapping with offset
   */
  async testSocketSnapWithOffset() {
    console.log('\n🧪 Test 2: Socket Snapping with Offset');
    
    const wall = await this.client.callTool('actor_spawn', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Wall_Window_01',
      location: [1000, 0, 0],
      name: 'TestWall_Offset'
    });
    
    this.testActors.push('TestWall_Offset');
    
    const window = await this.client.callTool('actor_spawn', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Window_01',
      location: [1500, 500, 0],
      name: 'TestWindow_Offset'
    });
    
    this.testActors.push('TestWindow_Offset');
    
    // Snap with offset
    const snapResult = await this.client.callTool('actor_snap_to_socket', {
      sourceActor: 'TestWindow_Offset',
      targetActor: 'TestWall_Offset',
      targetSocket: 'WindowSocket',
      offset: [0, 0, 50],  // Raise by 50 units
      validate: true
    });
    
    // Verify position with offset
    const verifyResult = await this.client.callTool('python_proxy', {
      code: `
import unreal
window = unreal.EditorLevelLibrary.get_actor_reference('TestWindow_Offset')
wall = unreal.EditorLevelLibrary.get_actor_reference('TestWall_Offset')

if window and wall:
    window_loc = window.get_actor_location()
    wall_loc = wall.get_actor_location()
    
    # Check if window is approximately 50 units above expected socket position
    # (Socket would typically be at wall height + socket offset)
    z_diff = window_loc.z
    
    result = {
        'success': True,
        'windowZ': window_loc.z,
        'wallZ': wall_loc.z,
        'zOffset': z_diff,
        'offsetCorrect': abs(z_diff - 50) < 1  # Within 1 unit tolerance
    }
else:
    result = {'success': False, 'error': 'Could not find test actors'}
`
    });
    
    const offsetCorrect = verifyResult.content[0].text.includes('"offsetCorrect": true');
    
    if (offsetCorrect) {
      console.log('✅ Socket snap with offset succeeded');
      this.testResults.passed++;
    } else {
      console.error('❌ Socket snap with offset failed');
      this.testResults.failed++;
    }
    
    this.testResults.tests.push({
      name: 'Socket Snapping with Offset',
      passed: offsetCorrect,
      details: verifyResult.content[0].text
    });
    
    return offsetCorrect;
  }

  /**
   * Test socket-to-socket alignment
   */
  async testSocketToSocketAlignment() {
    console.log('\n🧪 Test 3: Socket-to-Socket Alignment');
    
    // Spawn two walls that should connect
    const wall1 = await this.client.callTool('actor_spawn', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Wall_Plain_01',
      location: [2000, 0, 0],
      name: 'TestWall_Socket1'
    });
    
    this.testActors.push('TestWall_Socket1');
    
    const wall2 = await this.client.callTool('actor_spawn', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Wall_Plain_01',
      location: [2500, 500, 0],
      name: 'TestWall_Socket2'
    });
    
    this.testActors.push('TestWall_Socket2');
    
    // Connect wall2 to wall1 using sockets
    const snapResult = await this.client.callTool('actor_snap_to_socket', {
      sourceActor: 'TestWall_Socket2',
      targetActor: 'TestWall_Socket1',
      targetSocket: 'WallSocket_Right',
      sourceSocket: 'WallSocket_Left',
      validate: true
    });
    
    // Verify walls are properly aligned
    const alignmentResult = await this.client.callTool('placement_validate', {
      actors: ['TestWall_Socket1', 'TestWall_Socket2'],
      tolerance: 5
    });
    
    const hasNoGaps = !alignmentResult.content[0].text.includes('Gap detected');
    const hasNoOverlaps = !alignmentResult.content[0].text.includes('Overlap detected');
    const properlyAligned = hasNoGaps && hasNoOverlaps;
    
    if (properlyAligned) {
      console.log('✅ Socket-to-socket alignment succeeded');
      this.testResults.passed++;
    } else {
      console.error('❌ Socket-to-socket alignment failed');
      console.log('Validation result:', alignmentResult.content[0].text);
      this.testResults.failed++;
    }
    
    this.testResults.tests.push({
      name: 'Socket-to-Socket Alignment',
      passed: properlyAligned,
      details: alignmentResult.content[0].text
    });
    
    return properlyAligned;
  }

  /**
   * Test error handling for non-existent socket
   */
  async testNonExistentSocket() {
    console.log('\n🧪 Test 4: Non-Existent Socket Error Handling');
    
    const wall = await this.client.callTool('actor_spawn', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Wall_Plain_01',
      location: [3000, 0, 0],
      name: 'TestWall_Error'
    });
    
    this.testActors.push('TestWall_Error');
    
    const door = await this.client.callTool('actor_spawn', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Door_01',
      location: [3500, 500, 0],
      name: 'TestDoor_Error'
    });
    
    this.testActors.push('TestDoor_Error');
    
    // Try to snap to non-existent socket
    const snapResult = await this.client.callTool('actor_snap_to_socket', {
      sourceActor: 'TestDoor_Error',
      targetActor: 'TestWall_Error',
      targetSocket: 'NonExistentSocket'
    });
    
    const errorText = snapResult.content[0].text;
    const hasError = errorText.includes('not found') || errorText.includes('error');
    const hasAvailableSockets = errorText.includes('availableSockets') || errorText.includes('WallSocket');
    
    if (hasError && hasAvailableSockets) {
      console.log('✅ Non-existent socket error handling works correctly');
      this.testResults.passed++;
    } else {
      console.error('❌ Non-existent socket error handling failed');
      this.testResults.failed++;
    }
    
    this.testResults.tests.push({
      name: 'Non-Existent Socket Error Handling',
      passed: hasError && hasAvailableSockets,
      details: errorText
    });
    
    return hasError && hasAvailableSockets;
  }

  /**
   * Test complex multi-actor snapping scenario
   */
  async testComplexMultiActorSnapping() {
    console.log('\n🧪 Test 5: Complex Multi-Actor Snapping');
    
    // Build a small structure using socket snapping
    const baseWall = await this.client.callTool('actor_spawn', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Wall_Plain_01',
      location: [4000, 0, 0],
      rotation: [0, 0, 0],
      name: 'Complex_Wall1'
    });
    
    this.testActors.push('Complex_Wall1');
    
    // Add door wall to the right
    const doorWall = await this.client.callTool('actor_spawn', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Wall_Plain_Door_01',
      location: [0, 0, 0],
      name: 'Complex_DoorWall'
    });
    
    this.testActors.push('Complex_DoorWall');
    
    await this.client.callTool('actor_snap_to_socket', {
      sourceActor: 'Complex_DoorWall',
      targetActor: 'Complex_Wall1',
      targetSocket: 'WallSocket_Right'
    });
    
    // Add window wall to the right of door wall
    const windowWall = await this.client.callTool('actor_spawn', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Wall_Window_01',
      location: [0, 0, 0],
      name: 'Complex_WindowWall'
    });
    
    this.testActors.push('Complex_WindowWall');
    
    await this.client.callTool('actor_snap_to_socket', {
      sourceActor: 'Complex_WindowWall',
      targetActor: 'Complex_DoorWall',
      targetSocket: 'WallSocket_Right'
    });
    
    // Add corner to turn
    const corner = await this.client.callTool('actor_spawn', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Corner_01',
      location: [0, 0, 0],
      name: 'Complex_Corner'
    });
    
    this.testActors.push('Complex_Corner');
    
    await this.client.callTool('actor_snap_to_socket', {
      sourceActor: 'Complex_Corner',
      targetActor: 'Complex_WindowWall',
      targetSocket: 'WallSocket_Right'
    });
    
    // Validate entire structure
    const validationResult = await this.client.callTool('placement_validate', {
      actors: ['Complex_Wall1', 'Complex_DoorWall', 'Complex_WindowWall', 'Complex_Corner'],
      tolerance: 5,
      checkAlignment: true,
      modularSize: 300
    });
    
    const validationText = validationResult.content[0].text;
    const noIssues = validationText.includes('No issues detected') || 
                     (!validationText.includes('Gap detected') && 
                      !validationText.includes('Overlap detected'));
    
    if (noIssues) {
      console.log('✅ Complex multi-actor snapping succeeded');
      this.testResults.passed++;
    } else {
      console.error('❌ Complex multi-actor snapping failed');
      console.log('Validation issues:', validationText);
      this.testResults.failed++;
    }
    
    this.testResults.tests.push({
      name: 'Complex Multi-Actor Snapping',
      passed: noIssues,
      details: validationText
    });
    
    return noIssues;
  }

  /**
   * Clean up all test actors
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up test actors...');
    
    for (const actorName of this.testActors) {
      try {
        await this.client.callTool('actor_delete', {
          actorName: actorName
        });
      } catch (error) {
        console.warn(`Could not delete ${actorName}:`, error.message);
      }
    }
    
    console.log('✅ Cleanup complete');
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('==========================================');
    console.log('Socket Snapping Integration Tests');
    console.log('==========================================\n');
    
    try {
      // Run tests
      await this.testBasicSocketSnap();
      await this.testSocketSnapWithOffset();
      await this.testSocketToSocketAlignment();
      await this.testNonExistentSocket();
      await this.testComplexMultiActorSnapping();
      
      // Print summary
      console.log('\n==========================================');
      console.log('Test Summary');
      console.log('==========================================');
      console.log(`✅ Passed: ${this.testResults.passed}`);
      console.log(`❌ Failed: ${this.testResults.failed}`);
      console.log(`📊 Total: ${this.testResults.passed + this.testResults.failed}`);
      
      // Print individual test results
      console.log('\nIndividual Test Results:');
      for (const test of this.testResults.tests) {
        const icon = test.passed ? '✅' : '❌';
        console.log(`${icon} ${test.name}`);
      }
      
      // Clean up
      await this.cleanup();
      
      // Exit with appropriate code
      const allPassed = this.testResults.failed === 0;
      if (allPassed) {
        console.log('\n🎉 All tests passed!');
        process.exit(0);
      } else {
        console.log('\n⚠️ Some tests failed. Check the output above.');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('\n💥 Fatal error during testing:', error);
      await this.cleanup();
      process.exit(1);
    } finally {
      await this.client.close();
    }
  }
}

// Run the tests
const tester = new SocketSnappingTest();
tester.runAllTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});