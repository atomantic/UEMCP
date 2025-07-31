#!/usr/bin/env node

/**
 * Test script for batch_spawn tool
 * Demonstrates spawning multiple actors efficiently
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Test configurations
const TEST_CASES = [
  {
    name: 'Basic batch spawn test',
    actors: [
      {
        assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m',
        location: [0, 0, 0],
        rotation: [0, 0, 0],
        name: 'Wall_1',
      },
      {
        assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m',
        location: [300, 0, 0],
        rotation: [0, 0, 0],
        name: 'Wall_2',
      },
      {
        assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m',
        location: [600, 0, 0],
        rotation: [0, 0, 0],
        name: 'Wall_3',
      },
    ],
  },
  {
    name: 'Spawn with common folder',
    actors: [
      {
        assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner',
        location: [0, 0, 0],
        rotation: [0, 0, 0],
        name: 'Corner_1',
      },
      {
        assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_1m_Corner',
        location: [0, 300, 0],
        rotation: [0, 0, 90],
        name: 'Corner_2',
      },
    ],
    commonFolder: 'BatchTest/Corners',
  },
  {
    name: 'Mixed asset types',
    actors: [
      {
        assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m',
        location: [0, 600, 0],
        name: 'MixedWall',
      },
      {
        assetPath: '/Game/ModularOldTown/Meshes/Ground/SM_Floor_1m',
        location: [0, 600, -10],
        scale: [3, 3, 1],
        name: 'MixedFloor',
      },
      {
        assetPath: '/Game/ModularOldTown/Meshes/Walls/SM_FlatWall_3m_SquareDoor',
        location: [300, 600, 0],
        rotation: [0, 0, 180],
        name: 'MixedDoor',
      },
    ],
    commonFolder: 'BatchTest/Mixed',
  },
];

async function runBatchSpawnTest(testCase) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Test: ${testCase.name}`);
  console.log('='.repeat(80));
  
  const args = ['test-connection.js', '--tool', 'batch_spawn', '--args', JSON.stringify({
    actors: testCase.actors,
    commonFolder: testCase.commonFolder,
    validate: true,
  })];
  
  try {
    const { stdout, stderr } = await execFileAsync('node', args);
    
    if (stderr) {
      console.error('Error:', stderr);
    }
    
    // Parse response for results
    const response = stdout;
    console.log('\nResponse:');
    console.log(response);
    
    // Check for success indicators
    const hasSuccess = response.includes('spawned successfully');
    const hasFailed = response.includes('Failed to spawn');
    const hasTime = response.includes('Execution time');
    
    console.log('\nValidation:');
    console.log(`  Success message: ${hasSuccess ? '✅' : '❌'}`);
    console.log(`  Timing info: ${hasTime ? '✅' : '❌'}`);
    if (hasFailed) {
      console.log('  ⚠️  Some spawns failed');
    }
    
  } catch (error) {
    console.error('Failed to execute command:', error);
  }
}

async function runAllTests() {
  console.log('Testing Batch Spawn Tool');
  console.log('========================\n');
  
  console.log('This tool enables efficient spawning of multiple actors in a single operation.');
  console.log('Benefits:');
  console.log('  - Reduced overhead vs individual spawns');
  console.log('  - Automatic viewport update batching');
  console.log('  - Common folder organization');
  console.log('  - Batch validation');
  
  for (const testCase of TEST_CASES) {
    await runBatchSpawnTest(testCase);
  }
  
  console.log('\n\nUsage Example:');
  console.log('batch_spawn({');
  console.log('  actors: [');
  console.log('    { assetPath: "/Game/Wall", location: [0, 0, 0], name: "Wall1" },');
  console.log('    { assetPath: "/Game/Wall", location: [300, 0, 0], name: "Wall2" }');
  console.log('  ],');
  console.log('  commonFolder: "Building/Walls",');
  console.log('  validate: true');
  console.log('})');
}

runAllTests().catch(console.error);