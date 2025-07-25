import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

interface LevelActorsArgs {
  filter?: string;
  limit?: number;
}

export const levelActorsTool = {
  definition: {
    name: 'level_actors',
    description: 'List actors in the current level',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Filter actors by name or class (partial match)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of actors to return',
          default: 30,
        },
      },
      required: [],
    },
  },
  handler: async (args: unknown = {}): Promise<{ content: Array<{ type: string; text: string }> }> => {
    const { filter, limit = 30 } = args as LevelActorsArgs;
    
    logger.debug('Listing level actors', { filter, limit });
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'level.actors',
        params: { filter, limit }
      });
      
      if (result.success) {
        const actors = (result.actors as any[]) || [];
        const totalCount = (result.totalCount as number) || actors.length;
        const currentLevel = (result.currentLevel as string) || 'Unknown';
        
        let text = `Level: ${currentLevel}\n`;
        text += `Found ${totalCount} actors`;
        if (filter) {
          text += ` matching "${filter}"`;
        }
        text += '\n';
        
        if (totalCount > limit) {
          text += `(Showing first ${limit})\n`;
        }
        text += '\n';
        
        if (actors.length === 0) {
          text += 'No actors found.';
        } else {
          actors.forEach((actor: any) => {
            text += `• ${actor.name} (${actor.class})\n`;
            if (actor.location) {
              text += `  Location: [${actor.location.x}, ${actor.location.y}, ${actor.location.z}]\n`;
            }
          });
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
        throw new Error(result.error || 'Failed to list actors');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list actors: ${errorMessage}`);
    }
  },
};