import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

export const projectInfoTool = {
  definition: {
    name: 'project_info',
    description: 'Get information about the current Unreal Engine project',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  handler: async (): Promise<{ content: Array<{ type: string; text: string }> }> => {
    logger.debug('Getting project info');
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'project.info',
        params: {}
      });
      
      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Project Information:\n` +
                    `Name: ${result.projectName || 'Unknown'}\n` +
                    `Directory: ${result.projectDirectory || 'Unknown'}\n` +
                    `Engine Version: ${result.engineVersion || 'Unknown'}\n` +
                    `Mock Mode: ${result.mockMode ? 'Yes' : 'No'}`
            },
          ],
        };
      } else {
        throw new Error(result.error || 'Failed to get project info');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get project info: ${errorMessage}`);
    }
  },
};