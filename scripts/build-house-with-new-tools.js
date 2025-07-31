#!/usr/bin/env node

/**
 * Example: Building a house using the new MCP tools
 * Demonstrates practical usage of enhanced asset_info, batch_spawn, and placement_validate
 */

import { createMCPClient } from '../server/tests/utils/mcp-client.js';
import { fileURLToPath } from 'url';

async function buildHouseWithNewTools() {
  const client = createMCPClient();
  
  console.log('🏠 Building a House with New UEMCP Tools\n');
  
  try {
    // Test connection
    console.log('1. Testing connection...');
    await client.callTool('test_connection', {});
    console.log('✅ Connected to Unreal Engine\n');
    
    // Step 1: Analyze assets to understand their properties
    console.log('2. Analyzing modular assets...\n');
    
    const wallInfo = await client.callTool('asset_info', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a'
    });
    
    const cornerInfo = await client.callTool('asset_info', {
      assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Corner_01b'
    });
    
    console.log('   Wall dimensions:', wallInfo.bounds.size);
    console.log('   Wall pivot:', wallInfo.pivot?.type);
    console.log('   Corner dimensions:', cornerInfo.bounds.size);
    console.log('   Corner pivot:', cornerInfo.pivot?.type);
    console.log('\n');
    
    // Step 2: Calculate positions based on asset dimensions
    const wallWidth = wallInfo.bounds.size.x;
    if (!Number.isFinite(wallWidth) || wallWidth === 0) {
      throw new Error(`Invalid wall width retrieved: ${wallWidth}. Ensure the asset dimensions are valid and properly defined.`);
    }
    const cornerSize = cornerInfo.bounds.size.x;
    if (!Number.isFinite(cornerSize) || cornerSize === 0) {
      throw new Error(`Invalid corner size retrieved: ${cornerSize}. Ensure the asset dimensions are valid and properly defined.`);
    }
    
    console.log('3. Building house foundation with batch_spawn...\n');
    
    // Define all actors for the house foundation
    const foundationActors = [
      // Corners
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Corner_01b', name: 'Corner_NW', location: [-600, -600, 0], rotation: [0, 0, 0] },
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Corner_01b', name: 'Corner_NE', location: [600, -600, 0], rotation: [0, 0, 90] },
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Corner_01b', name: 'Corner_SE', location: [600, 600, 0], rotation: [0, 0, 180] },
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Corner_01b', name: 'Corner_SW', location: [-600, 600, 0], rotation: [0, 0, 270] },
      
      // North wall segments (3 walls between corners)
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a', name: 'Wall_N1', location: [-300, -600, 0], rotation: [0, 0, 0] },
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a', name: 'Wall_N2', location: [0, -600, 0], rotation: [0, 0, 0] },
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a', name: 'Wall_N3', location: [300, -600, 0], rotation: [0, 0, 0] },
      
      // South wall segments
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a', name: 'Wall_S1', location: [-300, 600, 0], rotation: [0, 0, 180] },
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a', name: 'Wall_S2', location: [0, 600, 0], rotation: [0, 0, 180] },
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a', name: 'Wall_S3', location: [300, 600, 0], rotation: [0, 0, 180] },
      
      // East wall segments
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a', name: 'Wall_E1', location: [600, -300, 0], rotation: [0, 0, 90] },
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a', name: 'Wall_E2', location: [600, 0, 0], rotation: [0, 0, 90] },
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a', name: 'Wall_E3', location: [600, 300, 0], rotation: [0, 0, 90] },
      
      // West wall segments
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a', name: 'Wall_W1', location: [-600, -300, 0], rotation: [0, 0, -90] },
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a', name: 'Wall_W2', location: [-600, 0, 0], rotation: [0, 0, -90] },
      { assetPath: '/Game/ModularOldTown/Meshes/SM_OT_Wall_01a', name: 'Wall_W3', location: [-600, 300, 0], rotation: [0, 0, -90] }
    ];
    
    // Spawn all foundation actors in one batch
    const spawnResult = await client.callTool('batch_spawn', {
      actors: foundationActors,
      folder: 'House/Foundation',
      updateViewport: true,
      validateAfterSpawn: true
    });
    
    console.log(`   Spawned ${spawnResult.spawnedActors?.length || 0} actors in ${(spawnResult.executionTime / 1000).toFixed(2)}s`);
    
    if (spawnResult.failedSpawns?.length > 0) {
      console.log(`   ⚠️  Failed to spawn ${spawnResult.failedSpawns.length} actors:`);
      spawnResult.failedSpawns.forEach(fail => {
        console.log(`      - ${fail.name}: ${fail.error}`);
      });
    }
    console.log('\n');
    
    // Step 3: Validate placement
    console.log('4. Validating building placement...\n');
    
    const allActorNames = foundationActors.map(a => a.name);
    const validation = await client.callTool('placement_validate', {
      actors: allActorNames,
      tolerances: {
        gap: 10.0,      // Allow up to 10 units gap
        overlap: 1.0,   // Very small overlap tolerance
        alignment: 5.0  // 5 unit grid alignment
      }
    });
    
    console.log(`   Overall status: ${validation.summary?.overallStatus}`);
    console.log(`   Gaps: ${validation.gaps?.length || 0}`);
    console.log(`   Overlaps: ${validation.overlaps?.length || 0}`);
    console.log(`   Alignment issues: ${validation.alignmentIssues?.length || 0}`);
    
    if (validation.gaps?.length > 0) {
      console.log('\n   ⚠️  Gaps detected:');
      validation.gaps.forEach(gap => {
        console.log(`      - ${gap.actor1} <-> ${gap.actor2}: ${gap.distance.toFixed(1)} units`);
        if (gap.suggestedFix) {
          console.log(`        Fix: ${gap.suggestedFix}`);
        }
      });
    }
    
    if (validation.overlaps?.length > 0) {
      console.log('\n   ⚠️  Overlaps detected:');
      validation.overlaps.forEach(overlap => {
        console.log(`      - ${overlap.actor1} overlaps ${overlap.actor2} by ${overlap.overlapAmount.toFixed(1)} units`);
      });
    }
    
    // Step 4: Take a screenshot
    console.log('\n5. Taking screenshots...\n');
    
    // Top-down view
    await client.callTool('viewport_mode', { mode: 'top' });
    await client.callTool('viewport_fit', { filter: 'Wall', padding: 20 });
    const topScreenshot = await client.callTool('viewport_screenshot', {
      width: 1280,
      height: 720,
      compress: true
    });
    console.log('   ✅ Top-down view captured');
    
    // Perspective view
    await client.callTool('viewport_mode', { mode: 'perspective' });
    await client.callTool('viewport_camera', {
      location: [1500, 1500, 800],
      rotation: [0, -30, -45]
    });
    const perspScreenshot = await client.callTool('viewport_screenshot', {
      width: 1280,
      height: 720,
      compress: true
    });
    console.log('   ✅ Perspective view captured\n');
    
    console.log('🎉 House foundation built successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Total actors spawned: ${spawnResult.spawnedActors?.length || 0}`);
    console.log(`   - Time to spawn: ${(spawnResult.executionTime / 1000).toFixed(2)}s`);
    console.log(`   - Placement validation: ${validation.summary?.overallStatus}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Add doors and windows using batch_spawn');
    console.log('   2. Build upper floors by duplicating with Z offset');
    console.log('   3. Import roof assets from FAB using asset_import');
    console.log('   4. Validate each step with placement_validate');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildHouseWithNewTools();
}

export { buildHouseWithNewTools };