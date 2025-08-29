#!/usr/bin/env node

/**
 * Ultra-simple calibration grid using basic shapes with no complex materials
 * Just uses basic colors that are built into Unreal Engine
 */

import { mcp } from '../tests/utils/mcp-client.js';

async function createUltraSimpleGrid() {
  console.log('Creating ultra-simple calibration grid...');
  
  // Very simple 5x5 grid
  const GRID_SIZE = 5;
  const SPACING = 300;
  
  // Use basic engine materials (these always exist)
  const materials = [
    '/Engine/BasicShapes/BasicShapeMaterial',  // Default gray
    '/Engine/MapTemplates/Materials/BasicAsset01', // Basic white
    '/Engine/MapTemplates/Materials/BasicAsset02', // Basic dark
    '/Engine/MapTemplates/Materials/BasicAsset03', // Basic mid-tone
  ];
  
  // Use different basic shapes for variety
  const shapes = [
    '/Engine/BasicShapes/Cube',
    '/Engine/BasicShapes/Sphere', 
    '/Engine/BasicShapes/Cylinder',
    '/Engine/BasicShapes/Cone'
  ];
  
  const actors = [];
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const x = (col - GRID_SIZE/2) * SPACING;
      const y = (row - GRID_SIZE/2) * SPACING;
      const z = 0;
      
      // Use different shapes for different positions
      const shapeIndex = (row + col) % shapes.length;
      const shape = shapes[shapeIndex];
      
      actors.push({
        assetPath: shape,
        name: `Grid_${row}_${col}`,
        location: [x, y, z],
        scale: [0.5, 0.5, 0.5],
        folder: 'SimpleGrid'
      });
    }
  }
  
  // Spawn all at once
  const result = await mcp.batch_spawn({
    actors: actors,
    commonFolder: 'SimpleGrid',
    validate: false
  });
  
  console.log(`Created ${result.spawnedActors.length} grid elements`);
  
  // Apply different materials to create a pattern
  for (let i = 0; i < result.spawnedActors.length; i++) {
    const actor = result.spawnedActors[i];
    const materialIndex = i % materials.length;
    
    await mcp.material_apply({
      actorName: actor.name,
      materialPath: materials[materialIndex]
    });
  }
  
  // Add a floor plane for reference
  await mcp.actor_spawn({
    assetPath: '/Engine/BasicShapes/Plane',
    name: 'GridFloor',
    location: [0, 0, -50],
    scale: [20, 20, 1],
    folder: 'SimpleGrid'
  });
  
  await mcp.level_save();
  
  console.log('Ultra-simple grid created!');
  console.log('This grid uses only built-in Unreal assets and materials.');
  console.log('You can easily select and modify individual elements.');
}

createUltraSimpleGrid().catch(console.error);