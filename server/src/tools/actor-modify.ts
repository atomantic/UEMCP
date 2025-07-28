import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

interface ActorModifyArgs {
  actorName: string;
  location?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  folder?: string;
}

export const actorModifyTool = {
  definition: {
    name: 'actor_modify',
    description: 'Modify actor transform/organization. Move: actor_modify({ name: "Wall", location: [100, 200, 0] }). Rotate: actor_modify({ name: "Corner", rotation: [0, 0, 90] }). Organize: actor_modify({ name: "Door", folder: "Building/Doors" })',
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
          description: 'New world location [X, Y, Z] where X-=North, Y-=East, Z+=Up',
        },
        rotation: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: 'New rotation [Roll, Pitch, Yaw] in degrees. Yaw=turn, Pitch=up/down, Roll=tilt',
        },
        scale: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: 'New scale [x, y, z]',
        },
        folder: {
          type: 'string',
          description: 'New folder path in World Outliner (e.g., "Estate/House")',
        },
      },
      required: ['actorName'],
    },
  },
  handler: async (args: unknown = {}): Promise<{ content: Array<{ type: string; text: string }> }> => {
    const { actorName, location, rotation, scale, folder } = args as ActorModifyArgs;
    
    logger.debug('Modifying actor', { actorName, location, rotation, scale });
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'actor.modify',
        params: { actorName, location, rotation, scale, folder }
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
        if (folder) {
          text += `  Folder: ${folder}\n`;
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