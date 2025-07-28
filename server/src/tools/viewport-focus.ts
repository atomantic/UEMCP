import { PythonBridge } from '../services/python-bridge.js';

export const viewportFocusTool = {
  definition: {
    name: 'viewport_focus',
    description: 'Focus the viewport on a specific actor (equivalent to selecting and pressing F)',
    inputSchema: {
      type: 'object',
      properties: {
        actorName: {
          type: 'string',
          description: 'Name of the actor to focus on'
        },
        preserveRotation: {
          type: 'boolean',
          description: 'Preserve current camera rotation (useful for maintaining top/side views)',
          default: false
        }
      },
      required: ['actorName']
    }
  },
  handler: async (args: { actorName: string; preserveRotation?: boolean }): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> => {
    const bridge = new PythonBridge();
    
    try {
      const result = await bridge.executeCommand({
        type: 'viewport.focus',
        params: {
          actorName: args.actorName,
          preserveRotation: args.preserveRotation || false
        }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to focus viewport');
      }

      const location = result.location as { x: number; y: number; z: number };
      return {
        content: [{
          type: 'text',
          text: `✓ Focused viewport on: ${args.actorName}\n\nActor location: [${location?.x || 0}, ${location?.y || 0}, ${location?.z || 0}]\n\n${result.message ? String(result.message) : ''}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{
          type: 'text',
          text: `Error: Failed to focus viewport: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
};