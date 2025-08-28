#!/usr/bin/env node

/**
 * Test script for actor_snap_to_socket tool
 * Tests socket-based actor placement for modular building
 */

import { MCPClient } from '../tests/utils/mcp-client.js';

async function testSocketSnap() {
  const client = new MCPClient();
  
  try {
    console.log('🧪 Testing actor_snap_to_socket tool...\n');
    
    // Step 1: Spawn a wall with sockets
    console.log('1️⃣ Spawning base wall with door socket...');
    const wallResult = await client.callTool('actor_spawn', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Wall_Plain_Door_01',
      location: [0, 0, 0],
      rotation: [0, 0, 0],
      name: 'TestWall_01'
    });
    console.log('✅ Wall spawned:', wallResult.content[0].text);
    
    // Step 2: Get socket information from the wall
    console.log('\n2️⃣ Getting socket information from wall...');
    const assetInfo = await client.callTool('asset_info', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Wall_Plain_Door_01'
    });
    
    // Parse socket info
    const infoText = assetInfo.content[0].text;
    const socketMatch = infoText.match(/Sockets.*?(\w+Socket)/s);
    const socketName = socketMatch ? socketMatch[1] : 'DoorSocket';
    console.log(`✅ Found socket: ${socketName}`);
    
    // Step 3: Spawn a door
    console.log('\n3️⃣ Spawning door to snap to wall socket...');
    const doorResult = await client.callTool('actor_spawn', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_MOT_Door_01',
      location: [500, 500, 0],  // Start away from wall
      rotation: [0, 0, 0],
      name: 'TestDoor_01'
    });
    console.log('✅ Door spawned at offset location');
    
    // Step 4: Snap door to wall socket
    console.log('\n4️⃣ Snapping door to wall socket...');
    const snapResult = await client.callTool('actor_snap_to_socket', {
      sourceActor: 'TestDoor_01',
      targetActor: 'TestWall_01',
      targetSocket: socketName,
      validate: true
    });
    console.log('✅ Socket snap result:', snapResult.content[0].text);
    
    // Step 5: Validate placement
    console.log('\n5️⃣ Validating placement...');
    const validateResult = await client.callTool('placement_validate', {
      actors: ['TestWall_01', 'TestDoor_01'],
      tolerance: 5
    });
    console.log('✅ Validation result:', validateResult.content[0].text);
    
    // Step 6: Take screenshot
    console.log('\n6️⃣ Taking screenshot of result...');
    await client.callTool('viewport_focus', {
      actorName: 'TestWall_01'
    });
    const screenshotResult = await client.callTool('viewport_screenshot', {
      width: 800,
      height: 600
    });
    console.log('✅ Screenshot taken');
    
    // Test with offset
    console.log('\n7️⃣ Testing snap with offset...');
    const snapWithOffsetResult = await client.callTool('actor_snap_to_socket', {
      sourceActor: 'TestDoor_01',
      targetActor: 'TestWall_01',
      targetSocket: socketName,
      offset: [0, 0, 50],  // Raise door by 50 units
      validate: true
    });
    console.log('✅ Socket snap with offset:', snapWithOffsetResult.content[0].text);
    
    // Clean up
    console.log('\n8️⃣ Cleaning up test actors...');
    await client.callTool('actor_delete', {
      actorName: 'TestWall_01'
    });
    await client.callTool('actor_delete', {
      actorName: 'TestDoor_01'
    });
    console.log('✅ Test actors deleted');
    
    console.log('\n✨ All socket snap tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run tests
console.log('==========================================');
console.log('Socket-Based Actor Placement Test');
console.log('==========================================\n');

testSocketSnap().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});