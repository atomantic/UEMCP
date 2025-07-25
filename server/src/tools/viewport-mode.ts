import { PythonBridge } from '../services/python-bridge.js';

export const viewportModeTool = {
  definition: {
    name: 'viewport_mode',
    description: 'Switch viewport between perspective and orthographic views (Top, Bottom, Left, Right, Front, Back)',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          description: 'Viewport mode',
          enum: ['perspective', 'top', 'bottom', 'left', 'right', 'front', 'back']
        }
      },
      required: ['mode']
    }
  },
  handler: async (args: { mode: string }): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> => {
    const bridge = new PythonBridge();
    
    try {
      const result = await bridge.executeCommand({
        type: 'viewport.mode',
        params: {
          mode: args.mode
        }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to change viewport mode');
      }

      return {
        content: [{
          type: 'text',
          text: `✓ Viewport mode changed to ${args.mode}\n\n${result.message ? String(result.message) : ''}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{
          type: 'text',
          text: `Error: Failed to change viewport mode: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
};