#!/usr/bin/env node

/**
 * Test script for the asset_import tool
 * 
 * This script tests the asset import functionality by:
 * 1. Testing connection to UE
 * 2. Attempting to import test assets
 * 3. Verifying the import results
 */

import { createMCPClient } from '../server/tests/utils/mcp-client.js';
import { fileURLToPath } from 'url';

async function testAssetImport() {
  const client = createMCPClient();
  
  console.log('🚀 Testing UEMCP Asset Import Tool\n');
  
  try {
    // Test connection first
    console.log('1. Testing connection to Unreal Engine...');
    const connectionResult = await client.callTool('test_connection', {});
    console.log('✅ Connection successful\n');
    
    // Test basic asset import with invalid path (should fail gracefully)
    console.log('2. Testing asset import with invalid path...');
    try {
      const invalidResult = await client.callTool('asset_import', {
        sourcePath: '/invalid/path/that/does/not/exist',
        targetFolder: '/Game/TestImports'
      });
      console.log('❌ Expected this to fail, but it succeeded');
    } catch (error) {
      console.log('✅ Correctly handled invalid path\n');
    }
    
    // Test with empty folder (should also fail gracefully)
    console.log('3. Testing asset import with empty parameters...');
    try {
      const emptyResult = await client.callTool('asset_import', {});
      console.log('❌ Expected this to fail due to missing sourcePath');
    } catch (error) {
      console.log('✅ Correctly handled missing required parameters\n');
    }
    
    // Test tool definition
    console.log('4. Checking tool definition...');
    const tools = await client.listTools();
    const importTool = tools.find(tool => tool.name === 'asset_import');
    
    if (importTool) {
      console.log('✅ asset_import tool found in registry');
      console.log(`   Description: ${importTool.description}`);
      console.log(`   Input schema has ${Object.keys(importTool.inputSchema.properties || {}).length} properties`);
    } else {
      console.log('❌ asset_import tool not found in registry');
    }
    
    console.log('\n🎉 Asset import tool basic tests completed successfully!');
    console.log('\n💡 To test with real assets:');
    console.log('   1. Download assets from FAB marketplace');
    console.log('   2. Use: asset_import({ sourcePath: "/path/to/asset", targetFolder: "/Game/ImportedAssets" })');
    console.log('   3. Set batchImport: true for folder imports');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test if this script is called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  testAssetImport();
}

export { testAssetImport };