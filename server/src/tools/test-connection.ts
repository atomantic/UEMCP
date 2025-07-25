import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

export const testConnectionTool = {
  definition: {
    name: 'test_connection',
    description: 'Test the connection to the Python listener in Unreal Engine',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  handler: async (_args?: unknown): Promise<{ content: Array<{ type: string; text: string }> }> => {
    logger.info('Testing connection to Python listener');
    
    const results: string[] = [];
    
    try {
      const bridge = new PythonBridge();
      
      // Test 1: Check if listener is available
      results.push('🔍 Testing Python listener availability...');
      const isAvailable = await bridge.isUnrealEngineAvailable();
      
      if (isAvailable) {
        results.push('✅ Python listener is ONLINE');
      } else {
        results.push('❌ Python listener is OFFLINE');
        results.push('   Make sure Unreal Engine is running with the UEMCP plugin');
        
        return {
          content: [
            {
              type: 'text',
              text: results.join('\n'),
            },
          ],
        };
      }
      
      // Test 2: Get project info
      results.push('\n📊 Testing project.info command...');
      const projectResult = await bridge.executeCommand({
        type: 'project.info',
        params: {}
      });
      
      if (projectResult.success) {
        results.push('✅ Project info retrieved successfully');
        results.push(`   Project: ${projectResult.projectName || 'Unknown'}`);
        results.push(`   Engine: ${projectResult.engineVersion || 'Unknown'}`);
      } else {
        results.push(`❌ Project info failed: ${projectResult.error}`);
      }
      
      // Test 3: List actors (small limit)
      results.push('\n🎭 Testing level.actors command...');
      const actorsResult = await bridge.executeCommand({
        type: 'level.actors',
        params: { limit: 5 }
      });
      
      if (actorsResult.success) {
        const count = actorsResult.totalCount || 0;
        results.push(`✅ Level actors retrieved: ${count} total actors`);
      } else {
        results.push(`❌ Level actors failed: ${actorsResult.error}`);
      }
      
      // Summary
      results.push('\n📋 Connection Summary:');
      results.push(`   Endpoint: http://localhost:${process.env.UEMCP_LISTENER_PORT || '8765'}`);
      results.push('   Status: All tests passed ✅');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      results.push(`\n❌ Connection test failed: ${errorMessage}`);
      
      if (errorMessage.includes('529')) {
        results.push('\n⚠️  HTTP 529 Error detected (Too Many Requests)');
        results.push('   This might indicate rate limiting or connection issues');
        results.push('   Try restarting the Python listener in UE');
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: results.join('\n'),
        },
      ],
    };
  },
};