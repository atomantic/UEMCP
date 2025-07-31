#!/usr/bin/env node

/**
 * Example: FAB Asset Import Workflow
 * Shows how to find, import, and use FAB marketplace assets
 */

import { createMCPClient } from '../server/tests/utils/mcp-client.js';
import { fileURLToPath } from 'url';
import os from 'os';
import path from 'path';
import fs from 'fs';

async function fabAssetWorkflow() {
  const client = createMCPClient();
  
  console.log('🎨 FAB Asset Import Workflow Example\n');
  
  try {
    // Test connection
    console.log('1. Testing connection...');
    await client.callTool('test_connection', {});
    console.log('✅ Connected to Unreal Engine\n');
    
    // Common FAB library locations
    const fabPaths = [
      path.join(os.homedir(), 'FAB Library'),
      path.join(os.homedir(), 'Documents', 'FAB Library'),
      path.join(os.homedir(), 'Epic Games', 'FAB Library'),
      '/Users/Shared/FAB Library'
    ];
    
    console.log('2. Looking for FAB library location...\n');
    let fabLibraryPath = null;
    
    // Try to find FAB library
    for (const fabPath of fabPaths) {
      if (fs.existsSync(fabPath)) {
        fabLibraryPath = fabPath;
        console.log(`   ✅ Found FAB library at: ${fabPath}`);
        break;
      }
    }
    
    if (!fabLibraryPath) {
      console.log('   ℹ️  FAB library not found in common locations');
      console.log('   Please ensure FAB/Quixel Bridge is installed and assets are downloaded\n');
      fabLibraryPath = path.join(os.homedir(), 'FAB Library'); // Use default for example
    }
    
    // Example import paths (these would be actual downloaded assets)
    console.log('3. Example import scenarios:\n');
    
    // Scenario 1: Import a single mesh
    console.log('   A. Import single static mesh:');
    console.log(`      asset_import({`);
    console.log(`        sourcePath: "${path.join(fabLibraryPath, 'Medieval Castle Pack', 'Meshes', 'castle_wall.fbx')}",`);
    console.log(`        targetFolder: "/Game/FAB/Castle",`);
    console.log(`        importSettings: {`);
    console.log(`          generateCollision: true,`);
    console.log(`          importMaterials: true,`);
    console.log(`          importTextures: true`);
    console.log(`        }`);
    console.log(`      })\n`);
    
    // Scenario 2: Batch import a pack
    console.log('   B. Batch import entire asset pack:');
    console.log(`      asset_import({`);
    console.log(`        sourcePath: "${path.join(fabLibraryPath, 'Medieval Castle Pack')}",`);
    console.log(`        targetFolder: "/Game/FAB/Castle",`);
    console.log(`        batchImport: true,`);
    console.log(`        importSettings: {`);
    console.log(`          generateCollision: true,`);
    console.log(`          generateLODs: true,`);
    console.log(`          preserveHierarchy: true`);
    console.log(`        }`);
    console.log(`      })\n`);
    
    // Scenario 3: Import textures only
    console.log('   C. Import textures for materials:');
    console.log(`      asset_import({`);
    console.log(`        sourcePath: "${path.join(fabLibraryPath, 'Stone Materials', 'Textures')}",`);
    console.log(`        targetFolder: "/Game/Materials/Stone",`);
    console.log(`        assetType: "texture",`);
    console.log(`        batchImport: true,`);
    console.log(`        importSettings: {`);
    console.log(`          // Note: sRGB and compression should be set based on texture type:`);
    console.log(`          // - Albedo/Diffuse: sRGB = true, compressionSettings = "TC_Default"`);
    console.log(`          // - Normal maps: sRGB = false, compressionSettings = "TC_Normalmap"`);
    console.log(`          // - Masks/Roughness/Metallic: sRGB = false, compressionSettings = "TC_Masks"`);
    console.log(`          sRGB: true,  // Set based on texture type`);
    console.log(`          compressionSettings: "TC_Default"  // Set based on texture type`);
    console.log(`        }`);
    console.log(`      })\n`);
    
    // Demonstrate finding castle assets in the project
    console.log('4. Finding castle/medieval assets already in project...\n');
    
    const castleAssets = await client.callTool('asset_list', {
      path: '/Game',
      assetType: 'StaticMesh',
      limit: 50
    });
    
    const medievalAssets = castleAssets.assets.filter(asset => 
      asset.name.toLowerCase().includes('castle') || 
      asset.name.toLowerCase().includes('medieval') ||
      asset.name.toLowerCase().includes('stone')
    );
    
    if (medievalAssets.length > 0) {
      console.log(`   Found ${medievalAssets.length} castle/medieval assets:`);
      medievalAssets.slice(0, 5).forEach(asset => {
        console.log(`   - ${asset.name} (${asset.path})`);
      });
      if (medievalAssets.length > 5) {
        console.log(`   ... and ${medievalAssets.length - 5} more`);
      }
    } else {
      console.log('   No castle/medieval assets found in project');
    }
    
    console.log('\n5. Complete workflow example:\n');
    console.log('   // Step 1: Import FAB assets');
    console.log('   const importResult = await asset_import({...});\n');
    console.log('   // Step 2: Analyze imported assets');
    console.log('   const assetInfo = await asset_info({ assetPath: importResult.importedAssets[0].targetPath });\n');
    console.log('   // Step 3: Spawn in level using batch_spawn');
    console.log('   const spawnResult = await batch_spawn({ actors: [...] });\n');
    console.log('   // Step 4: Validate placement');
    console.log('   const validation = await placement_validate({ actors: [...] });\n');
    
    console.log('🎉 FAB workflow example complete!\n');
    console.log('📚 Resources:');
    console.log('   - Download FAB assets: https://fab.com');
    console.log('   - Install Quixel Bridge for easy downloads');
    console.log('   - Assets download to your FAB Library folder');
    console.log('   - Use asset_import to bring them into UE projects');
    
  } catch (error) {
    console.error('❌ Workflow failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fabAssetWorkflow();
}

export { fabAssetWorkflow };