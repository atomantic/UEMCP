import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

interface ActorDuplicateArgs {
  sourceName: string;
  name?: string;
  offset?: {
    x?: number;
    y?: number;
    z?: number;
  };
}

export const actorDuplicateTool = {
  definition: {
    name: 'actor_duplicate',
    description: 'Duplicate an existing actor with optional offset',
    inputSchema: {
      type: 'object',
      properties: {
        sourceName: {
          type: 'string',
          description: 'Name of the actor to duplicate',
        },
        name: {
          type: 'string',
          description: 'Name for the new actor (optional, defaults to sourceName_Copy)',
        },
        offset: {
          type: 'object',
          description: 'Position offset from source actor',
          properties: {
            x: {
              type: 'number',
              description: 'X offset',
              default: 0,
            },
            y: {
              type: 'number',
              description: 'Y offset',
              default: 0,
            },
            z: {
              type: 'number',
              description: 'Z offset',
              default: 0,
            },
          },
        },
      },
      required: ['sourceName'],
    },
  },
  handler: async (args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> => {
    const { sourceName, name, offset = {} } = args as ActorDuplicateArgs;
    
    logger.debug('Duplicating actor', { sourceName, name, offset });
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'actor.duplicate',
        params: { sourceName, name, offset }
      });
      
      if (result.success) {
        const actorName = result.actorName as string;
        const location = result.location as { x: number; y: number; z: number };
        
        let text = `✓ Duplicated actor: ${actorName}\n`;
        text += `  Source: ${sourceName}\n`;
        text += `  Location: [${location.x}, ${location.y}, ${location.z}]\n`;
        if (offset.x || offset.y || offset.z) {
          text += `  Offset: [${offset.x || 0}, ${offset.y || 0}, ${offset.z || 0}]`;
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
        throw new Error(result.error || 'Failed to duplicate actor');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to duplicate actor: ${errorMessage}`);
    }
  },
};