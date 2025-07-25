import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

interface ActorModifyArgs {
  actorName: string;
  location?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export const actorModifyTool = {
  definition: {
    name: 'actor_modify',
    description: 'Modify an existing actor\'s transform (location, rotation, scale)',
    inputSchema: {
      type: 'object',
      properties: {
        actorName: {
          type: 'string',
          description: 'Name of the actor to modify',
        },
        location: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: 'New world location [x, y, z]',
        },
        rotation: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: 'New rotation [pitch, yaw, roll] in degrees',
        },
        scale: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: 'New scale [x, y, z]',
        },
      },
      required: ['actorName'],
    },
  },
  handler: async (args: unknown = {}): Promise<{ content: Array<{ type: string; text: string }> }> => {
    const { actorName, location, rotation, scale } = args as ActorModifyArgs;
    
    logger.debug('Modifying actor', { actorName, location, rotation, scale });
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'actor.modify',
        params: { actorName, location, rotation, scale }
      });
      
      if (result.success) {
        let text = `✓ Modified actor: ${actorName}\n`;
        
        if (location) {
          text += `  Location: [${location.join(', ')}]\n`;
        }
        if (rotation) {
          text += `  Rotation: [${rotation.join(', ')}]°\n`;
        }
        if (scale) {
          text += `  Scale: [${scale.join(', ')}]\n`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      } else {
        throw new Error(result.error || 'Failed to modify actor');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to modify actor: ${errorMessage}`);
    }
  },
};