#!/usr/bin/env node

/**
 * Test script for enhanced asset_info tool
 * Tests the new bounds, pivot, socket, and collision information
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const TEST_ASSETS = [
  '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m',
  '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner',
  '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareDoor',
  '/Game/ModularOldTown/Meshes/Ground/SM_Floor_1m',
];

async function testAssetInfo(assetPath) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing asset: ${assetPath}`);
  console.log('='.repeat(80));
  
  const args = ['test-connection.js', '--tool', 'asset_info', '--args', JSON.stringify({ assetPath })];
  
  try {
    const { stdout, stderr } = await execFileAsync('node', args);
    
    if (stderr) {
      console.error('Error:', stderr);
    }
    
    // Parse the response to check for new fields
    const response = stdout;
    
    // Check for new enhanced fields
    const hasNewFields = {
      bounds: response.includes('Bounding Box:'),
      pivot: response.includes('Pivot:'),
      collision: response.includes('Collision:'),
      sockets: response.includes('Sockets'),
      materials: response.includes('Material Slots'),
      minMax: response.includes('Min:') && response.includes('Max:'),
    };
    
    console.log('\nEnhanced fields detected:');
    Object.entries(hasNewFields).forEach(([field, found]) => {
      console.log(`  ${field}: ${found ? '✅' : '❌'}`);
    });
    
    console.log('\nFull response:');
    console.log(response);
    
  } catch (error) {
    console.error('Failed to execute command:', error);
  }
}

async function runTests() {
  console.log('Testing Enhanced Asset Info Tool');
  console.log('================================\n');
  
  for (const asset of TEST_ASSETS) {
    await testAssetInfo(asset);
  }
  
  console.log('\n\nTest Summary:');
  console.log('The enhanced asset_info tool should now provide:');
  console.log('  - Detailed bounds (min/max, size, extent, origin)');
  console.log('  - Pivot information (type and offset)');
  console.log('  - Collision data (primitives, complexity)');
  console.log('  - Socket information (names, locations, rotations)');
  console.log('  - Material slots with paths');
  console.log('  - LOD count for meshes');
  console.log('  - Component info for blueprints');
}

runTests().catch(console.error);