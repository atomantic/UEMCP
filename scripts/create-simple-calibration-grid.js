#!/usr/bin/env node

/**
 * Create a simple calibration grid using colored cubes
 * Much simpler than text rendering with complex materials
 */

import { mcp } from '../tests/utils/mcp-client.js';

async function createSimpleCalibrationGrid() {
  console.log('Creating simple calibration grid...');
  
  // Grid configuration
  const GRID_SIZE = 10;  // 10x10 grid
  const CELL_SIZE = 100; // 100 units per cell
  const CUBE_SIZE = 50;  // Cubes are 50 units (half cell size)
  
  // Colors for the grid (simple RGB values)
  const colors = [
    { name: 'Red', r: 1, g: 0, b: 0 },
    { name: 'Green', r: 0, g: 1, b: 0 },
    { name: 'Blue', r: 0, g: 0, b: 1 },
    { name: 'Yellow', r: 1, g: 1, b: 0 },
    { name: 'Cyan', r: 0, g: 1, b: 1 },
    { name: 'Magenta', r: 1, g: 0, b: 1 },
    { name: 'White', r: 1, g: 1, b: 1 },
    { name: 'Gray', r: 0.5, g: 0.5, b: 0.5 },
    { name: 'Orange', r: 1, g: 0.5, b: 0 },
    { name: 'Purple', r: 0.5, g: 0, b: 1 }
  ];
  
  // Clear existing calibration actors first
  console.log('Clearing existing calibration actors...');
  const existingActors = await mcp.level_actors({ filter: 'Calibration' });
  if (existingActors.actors) {
    for (const actor of existingActors.actors) {
      await mcp.actor_delete({ actorName: actor.name });
    }
  }
  
  // Create materials for each color
  console.log('Creating color materials...');
  for (const color of colors) {
    await mcp.material_create({
      materialName: `M_Calibration_${color.name}`,
      baseColor: color,
      metallic: 0,
      roughness: 0.8,
      targetFolder: '/Game/Materials/Calibration'
    });
  }
  
  // Create the grid
  console.log('Creating calibration grid...');
  const actors = [];
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const colorIndex = (row * GRID_SIZE + col) % colors.length;
      const color = colors[colorIndex];
      
      const x = (col - GRID_SIZE / 2) * CELL_SIZE;
      const y = (row - GRID_SIZE / 2) * CELL_SIZE;
      const z = 0;
      
      actors.push({
        assetPath: '/Engine/BasicShapes/Cube',
        name: `CalibrationCube_R${row}_C${col}_${color.name}`,
        location: [x, y, z],
        scale: [CUBE_SIZE/100, CUBE_SIZE/100, CUBE_SIZE/100], // Cube is 100 units by default
        folder: 'CalibrationGrid'
      });
    }
  }
  
  // Batch spawn all cubes
  const result = await mcp.batch_spawn({
    actors: actors,
    commonFolder: 'CalibrationGrid',
    validate: false // Skip validation for speed
  });
  
  console.log(`Created ${result.spawnedActors.length} calibration cubes`);
  
  // Apply materials to cubes
  console.log('Applying materials to cubes...');
  for (let i = 0; i < result.spawnedActors.length; i++) {
    const actor = result.spawnedActors[i];
    const colorIndex = i % colors.length;
    const color = colors[colorIndex];
    
    await mcp.material_apply({
      actorName: actor.name,
      materialPath: `/Game/Materials/Calibration/M_Calibration_${color.name}`
    });
  }
  
  // Add reference markers at corners
  console.log('Adding corner markers...');
  const cornerPositions = [
    { name: 'NW', x: -GRID_SIZE/2 * CELL_SIZE - 100, y: -GRID_SIZE/2 * CELL_SIZE - 100 },
    { name: 'NE', x: GRID_SIZE/2 * CELL_SIZE + 100, y: -GRID_SIZE/2 * CELL_SIZE - 100 },
    { name: 'SW', x: -GRID_SIZE/2 * CELL_SIZE - 100, y: GRID_SIZE/2 * CELL_SIZE + 100 },
    { name: 'SE', x: GRID_SIZE/2 * CELL_SIZE + 100, y: GRID_SIZE/2 * CELL_SIZE + 100 }
  ];
  
  for (const corner of cornerPositions) {
    await mcp.actor_spawn({
      assetPath: '/Engine/BasicShapes/Sphere',
      name: `CalibrationMarker_${corner.name}`,
      location: [corner.x, corner.y, 100],
      scale: [0.5, 0.5, 0.5],
      folder: 'CalibrationGrid/Markers'
    });
  }
  
  // Save the level
  await mcp.level_save();
  
  console.log('Calibration grid created successfully!');
  console.log('You can now easily:');
  console.log('- Change colors by modifying the materials');
  console.log('- Select cubes by name pattern (CalibrationCube_*)');
  console.log('- Adjust individual cube colors');
  console.log('- Use python_proxy to programmatically change colors');
}

// Run the script
createSimpleCalibrationGrid().catch(console.error);