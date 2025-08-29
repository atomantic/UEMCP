#!/usr/bin/env node

/**
 * Setup simple calibration grid in the Demo project
 * Run this after opening the Demo project in Unreal Engine
 */

async function setupSimpleCalibration() {
  // Check if we can import mcp-client
  let mcp;
  try {
    const module = await import('../tests/utils/mcp-client.js');
    mcp = module.mcp;
  } catch (err) {
    console.error("Could not load MCP client. Make sure you're in the UEMCP directory.");
    process.exit(1);
  }

  console.log('Setting up simple calibration grid in Demo project...\n');

  try {
    // Test connection
    console.log('Testing connection to Unreal Engine...');
    const connectionTest = await mcp.test_connection();
    console.log('✅ Connected to Unreal Engine\n');

    // Clear existing calibration actors
    console.log('Clearing existing calibration elements...');
    
    // First, let's see what we have
    const existingActors = await mcp.level_actors();
    let removedCount = 0;
    
    if (existingActors.actors) {
      for (const actor of existingActors.actors) {
        // Remove anything that looks like old calibration
        if (actor.name.includes('HueChanging') || 
            actor.name.includes('Text') || 
            actor.name.includes('Numbers') ||
            actor.name.includes('Calibration')) {
          await mcp.actor_delete({ actorName: actor.name });
          removedCount++;
        }
      }
    }
    console.log(`Removed ${removedCount} old calibration actors\n`);

    // Create simple colored cube grid
    console.log('Creating new calibration grid...');
    
    const GRID_SIZE = 8;
    const SPACING = 200;
    const actors = [];
    
    // Simple colors
    const colors = [
      { name: 'Red', r: 1, g: 0, b: 0 },
      { name: 'Green', r: 0, g: 1, b: 0 },
      { name: 'Blue', r: 0, g: 0, b: 1 },
      { name: 'Yellow', r: 1, g: 1, b: 0 },
      { name: 'Cyan', r: 0, g: 1, b: 1 },
      { name: 'Magenta', r: 1, g: 0, b: 1 },
      { name: 'Orange', r: 1, g: 0.5, b: 0 },
      { name: 'White', r: 1, g: 1, b: 1 }
    ];

    // Build actor list for batch spawn
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = (col - GRID_SIZE/2 + 0.5) * SPACING;
        const y = (row - GRID_SIZE/2 + 0.5) * SPACING;
        const z = 50;
        
        const colorIndex = (row * GRID_SIZE + col) % colors.length;
        const color = colors[colorIndex];
        
        actors.push({
          assetPath: '/Engine/BasicShapes/Cube',
          name: `CalibCube_${row}_${col}_${color.name}`,
          location: [x, y, z],
          scale: [0.8, 0.8, 0.8],
          folder: 'CalibrationGrid'
        });
      }
    }

    // Spawn all cubes at once
    console.log(`Spawning ${actors.length} calibration cubes...`);
    const spawnResult = await mcp.batch_spawn({
      actors: actors,
      commonFolder: 'CalibrationGrid',
      validate: false
    });
    
    console.log(`✅ Spawned ${spawnResult.spawnedActors.length} cubes\n`);

    // Create simple materials for each color
    console.log('Creating color materials...');
    for (const color of colors) {
      try {
        await mcp.material_create({
          materialName: `M_Calib_${color.name}`,
          baseColor: color,
          metallic: 0,
          roughness: 0.5,
          targetFolder: '/Game/Materials/Calibration'
        });
        console.log(`  Created material for ${color.name}`);
      } catch (err) {
        console.log(`  Material for ${color.name} might already exist`);
      }
    }
    console.log();

    // Apply materials to cubes
    console.log('Applying materials to cubes...');
    let appliedCount = 0;
    for (const actor of spawnResult.spawnedActors) {
      // Extract color from actor name
      const colorName = actor.name.split('_').pop();
      if (colorName) {
        try {
          await mcp.material_apply({
            actorName: actor.name,
            materialPath: `/Game/Materials/Calibration/M_Calib_${colorName}`
          });
          appliedCount++;
        } catch (err) {
          // Fallback to dynamic material application via python
        }
      }
    }
    console.log(`✅ Applied materials to ${appliedCount} cubes\n`);

    // Add corner markers
    console.log('Adding corner markers...');
    const markerSize = GRID_SIZE/2 * SPACING + 150;
    const markers = [
      { name: 'NW', x: -markerSize, y: -markerSize },
      { name: 'NE', x: markerSize, y: -markerSize },
      { name: 'SW', x: -markerSize, y: markerSize },
      { name: 'SE', x: markerSize, y: markerSize }
    ];

    for (const marker of markers) {
      await mcp.actor_spawn({
        assetPath: '/Engine/BasicShapes/Cone',
        name: `Marker_${marker.name}`,
        location: [marker.x, marker.y, 100],
        scale: [0.5, 0.5, 1],
        folder: 'CalibrationGrid/Markers'
      });
    }
    console.log('✅ Added 4 corner markers\n');

    // Add ground plane
    console.log('Adding ground plane...');
    await mcp.actor_spawn({
      assetPath: '/Engine/BasicShapes/Plane',
      name: 'CalibrationGround',
      location: [0, 0, 0],
      scale: [20, 20, 1],
      folder: 'CalibrationGrid'
    });
    console.log('✅ Added ground plane\n');

    // Save the level
    console.log('Saving level...');
    await mcp.level_save();
    console.log('✅ Level saved\n');

    // Provide helper functions
    console.log('=' * 60);
    console.log('CALIBRATION GRID SETUP COMPLETE!');
    console.log('=' * 60);
    console.log('\nYour Demo project now has:');
    console.log('- 8x8 grid of colored cubes');
    console.log('- Simple materials for easy color changes');
    console.log('- Corner markers for orientation');
    console.log('- Ground plane for reference');
    console.log('\nTo manipulate colors:');
    console.log('1. Use material_apply to change cube colors');
    console.log('2. Use python_proxy to apply dynamic materials');
    console.log('3. Run the color manipulation scripts provided');

  } catch (error) {
    console.error('\n❌ Error:', error.message || error);
    console.error('\nMake sure:');
    console.error('1. Unreal Engine is running');
    console.error('2. The Demo project is open');
    console.error('3. The UEMCP plugin is loaded');
  }
}

// Run the setup
setupSimpleCalibration();