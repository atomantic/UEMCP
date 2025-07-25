import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

export const restartListenerTool = {
  definition: {
    name: 'restart_listener',
    description: 'Restart the Python listener in Unreal Engine to reload code changes (hot reload)',
    inputSchema: {
      type: 'object',
      properties: {
        force: {
          type: 'boolean',
          description: 'Force restart even if listener appears offline',
          default: false
        }
      },
      required: [],
    },
  },
  handler: async (args?: { force?: boolean }): Promise<{ content: Array<{ type: string; text: string }> }> => {
    logger.info('Restarting Python listener in Unreal Engine');
    
    try {
      const bridge = new PythonBridge();
      const force = args?.force || false;
      
      // First check if listener is available (unless forcing)
      if (!force) {
        const isAvailable = await bridge.isUnrealEngineAvailable();
        if (!isAvailable) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Python listener is not available. Make sure Unreal Engine is running with the UEMCP plugin.\n\nTo force restart when UE starts up, use: restart_listener --force',
              },
            ],
          };
        }
      }
      
      // Send restart command
      const result = await bridge.executeCommand({
        type: 'system.restart',
        params: { force }
      });
      
      if (result.success) {
        const messages = [
          '🔄 Python listener restart initiated!',
          '',
          'The listener will:',
          '1. Stop the current HTTP server',
          '2. Reload all Python modules',
          '3. Start a fresh HTTP server on port 8765',
          '',
          '✅ Hot reload complete - your code changes are now active!'
        ];
        
        if (result.message) {
          messages.push('', `Details: ${result.message}`);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: messages.join('\n'),
            },
          ],
        };
      } else {
        throw new Error(result.error || 'Failed to restart listener');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide helpful error messages
      if (errorMessage.includes('ECONNREFUSED')) {
        return {
          content: [
            {
              type: 'text',
              text: '❌ Could not connect to Python listener.\n\nMake sure:\n1. Unreal Engine is running\n2. UEMCP plugin is enabled\n3. Python listener started successfully\n\nCheck the UE Output Log for any startup errors.',
            },
          ],
        };
      }
      
      throw new Error(`Failed to restart listener: ${errorMessage}`);
    }
  },
};