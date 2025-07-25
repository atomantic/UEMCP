import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

export const levelSaveTool = {
  definition: {
    name: 'level_save',
    description: 'Save the current level',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  handler: async (_args?: unknown): Promise<{ content: Array<{ type: string; text: string }> }> => {
    logger.debug('Saving level');
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'level.save',
        params: {}
      });
      
      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: '✓ Level saved successfully',
            },
          ],
        };
      } else {
        throw new Error(result.error || 'Failed to save level');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to save level: ${errorMessage}`);
    }
  },
};