#!/usr/bin/env node

/**
 * Test Dynamic Tool Loading
 * 
 * This script tests the dynamic tool loading from Python manifest
 */

import { PythonBridge } from './dist/services/python-bridge.js';
import { DynamicToolRegistry } from './dist/tools/dynamic-registry.js';

async function testDynamicLoading() {
  console.log('='.repeat(60));
  console.log('Testing Dynamic Tool Loading from Python Manifest');
  console.log('='.repeat(60));
  
  try {
    // Initialize Python bridge
    console.log('\n1. Connecting to Python listener on port 8765...');
    const bridge = new PythonBridge();
    
    // Test connection
    const testResult = await bridge.executeCommand({
      type: 'test_connection',
      params: {}
    });
    
    if (!testResult.success) {
      console.error('❌ Failed to connect to Python listener');
      console.error('Make sure Unreal Engine is running with the UEMCP plugin');
      process.exit(1);
    }
    
    console.log('✅ Connected to Python listener');
    console.log(`   Version: ${testResult.version}`);
    console.log(`   Python: ${testResult.pythonVersion}`);
    
    // Initialize dynamic registry
    console.log('\n2. Fetching tool manifest from Python...');
    const registry = new DynamicToolRegistry(bridge);
    const success = await registry.initialize();
    
    if (!success) {
      console.error('❌ Failed to initialize dynamic registry');
      process.exit(1);
    }
    
    console.log('✅ Successfully loaded tool manifest');
    
    // Get manifest details
    const manifest = registry.getManifest();
    if (manifest) {
      console.log(`   Version: ${manifest.version}`);
      console.log(`   Total Tools: ${manifest.totalTools}`);
      console.log(`   Categories: ${Object.keys(manifest.categories).length}`);
      
      console.log('\n3. Tools by Category:');
      for (const [category, tools] of Object.entries(manifest.categories)) {
        console.log(`   ${category}: ${tools.length} tools`);
        // Show first 3 tools in each category
        const preview = tools.slice(0, 3).join(', ');
        const more = tools.length > 3 ? `, ... (${tools.length - 3} more)` : '';
        console.log(`      ${preview}${more}`);
      }
    }
    
    // Test a specific tool
    console.log('\n4. Testing a dynamically loaded tool...');
    const testTool = registry.getTool('test_connection');
    if (testTool) {
      console.log('✅ Found test_connection tool');
      console.log(`   Name: ${testTool.definition.name}`);
      console.log(`   Description: ${testTool.definition.description}`);
      
      // Execute the tool
      console.log('\n5. Executing test_connection tool...');
      const result = await testTool.execute({});
      console.log('✅ Tool executed successfully');
      console.log(`   Response: ${JSON.stringify(result.content[0])}`);
    } else {
      console.error('❌ test_connection tool not found');
    }
    
    // Test actor_spawn tool schema
    console.log('\n6. Checking actor_spawn tool schema...');
    const spawnTool = registry.getTool('actor_spawn');
    if (spawnTool) {
      console.log('✅ Found actor_spawn tool');
      const schema = spawnTool.definition.inputSchema;
      console.log(`   Required params: ${schema.required.join(', ')}`);
      console.log(`   Properties: ${Object.keys(schema.properties).join(', ')}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Dynamic tool loading test completed successfully!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testDynamicLoading().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});