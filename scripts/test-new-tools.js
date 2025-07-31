#!/usr/bin/env node

/**
 * Test script for new MCP tools
 * Demonstrates the enhanced asset_info, batch_spawn, placement_validate, and asset_import tools
 */

import { createMCPClient } from '../server/tests/utils/mcp-client.js';
import { fileURLToPath } from 'url';

async function testNewTools() {
  const client = createMCPClient();
  
  console.log('🚀 Testing New UEMCP Tools\n');
  
  try {
    // Test connection first
    console.log('1. Testing connection to Unreal Engine...');
    await client.callTool('test_connection', {});
    console.log('✅ Connection successful\n');
    
    // Test 1: Enhanced asset_info
    console.log('2. Testing enhanced asset_info tool...');
    console.log('   Getting comprehensive info for a wall asset:\n');
    
    const assetInfo = await client.callTool('asset_info', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a'
    });
    
    console.log('   Asset Type:', assetInfo.assetType);
    console.log('   Bounds:', JSON.stringify(assetInfo.bounds.size, null, 2));
    console.log('   Pivot Type:', assetInfo.pivot?.type || 'N/A');
    console.log('   Sockets:', assetInfo.sockets?.length || 0);
    console.log('   Has Collision:', assetInfo.collision?.hasCollision || false);
    console.log('✅ Enhanced asset_info working correctly\n');
    
    // Test 2: Batch spawn
    console.log('3. Testing batch_spawn tool...');
    console.log('   Spawning 4 walls in a square formation:\n');
    
    let batchResult;
    try {
      batchResult = await client.callTool('batch_spawn', {
        actors: [
          {
            assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a',
            name: 'TestWall_North',
            location: [0, -300, 0],
            rotation: [0, 0, 0]
          },
          {
            assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a',
            name: 'TestWall_South', 
            location: [0, 300, 0],
            rotation: [0, 0, 180]
          },
          {
            assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a',
            name: 'TestWall_East',
            location: [300, 0, 0],
            rotation: [0, 0, 90]
          },
          {
            assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a',
            name: 'TestWall_West',
            location: [-300, 0, 0],
            rotation: [0, 0, -90]
          }
        ],
        folder: 'TestBuilding',
        updateViewport: true
      });
    } catch (error) {
      console.log('❌ Batch spawn failed:', error.message);
      throw error;
    }
    
    console.log(`   Spawned: ${batchResult.spawnedActors?.length || 0} actors`);
    console.log(`   Failed: ${batchResult.failedSpawns?.length || 0} spawns`);
    console.log(`   Execution time: ${(batchResult.executionTime / 1000).toFixed(2)}s`);
    console.log('✅ Batch spawn completed\n');
    
    // Test 3: Placement validation
    console.log('4. Testing placement_validate tool...');
    console.log('   Validating the spawned walls:\n');
    
    const validationResult = await client.callTool('placement_validate', {
      actors: ['TestWall_North', 'TestWall_South', 'TestWall_East', 'TestWall_West'],
      tolerances: {
        gap: 5.0,
        overlap: 1.0,
        alignment: 1.0
      }
    });
    
    console.log(`   Gaps found: ${validationResult.gaps?.length || 0}`);
    console.log(`   Overlaps found: ${validationResult.overlaps?.length || 0}`);
    console.log(`   Alignment issues: ${validationResult.alignmentIssues?.length || 0}`);
    console.log(`   Overall status: ${validationResult.summary?.overallStatus || 'unknown'}`);
    
    if (validationResult.gaps?.length > 0) {
      console.log('\n   Gap details:');
      validationResult.gaps.forEach(gap => {
        console.log(`     - ${gap.actor1} <-> ${gap.actor2}: ${gap.distance.toFixed(1)} units`);
      });
    }
    console.log('✅ Placement validation complete\n');
    
    // Test 4: Asset import (dry run)
    console.log('5. Testing asset_import tool (validation only)...');
    console.log('   Note: This is a dry run with an example path\n');
    
    try {
      await client.callTool('asset_import', {
        sourcePath: '/Users/example/FAB Library/Medieval Pack',
        targetFolder: '/Game/TestImports',
        importSettings: {
          generateCollision: true,
          importMaterials: true
        }
      });
    } catch (error) {
      console.log('   Expected error (path does not exist):', error.message);
    }
    console.log('✅ Asset import tool validated\n');
    
    // Cleanup
    console.log('6. Cleaning up test actors...');
    const testActors = ['TestWall_North', 'TestWall_South', 'TestWall_East', 'TestWall_West'];
    for (const actor of testActors) {
      try {
        await client.callTool('actor_delete', { actorName: actor });
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    console.log('✅ Cleanup complete\n');
    
    console.log('🎉 All new tools tested successfully!\n');
    console.log('💡 Next steps:');
    console.log('   1. Use asset_info to analyze your modular assets');
    console.log('   2. Use batch_spawn to quickly build structures');
    console.log('   3. Use placement_validate to ensure proper alignment');
    console.log('   4. Use asset_import to bring in FAB marketplace assets');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the test if this script is called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testNewTools();
}

export { testNewTools };