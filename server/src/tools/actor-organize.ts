import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

interface ActorOrganizeArgs {
  actors?: string[];
  pattern?: string;
  folder: string;
}

export const actorOrganizeTool = {
  definition: {
    name: 'actor_organize',
    description: 'Organize existing actors into folders in the World Outliner',
    inputSchema: {
      type: 'object',
      properties: {
        actors: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of specific actor names to organize',
        },
        pattern: {
          type: 'string',
          description: 'Pattern to match actor names (e.g., "Wall_", "Corner_"). Used if actors array is not provided',
        },
        folder: {
          type: 'string',
          description: 'Target folder path in World Outliner (e.g., "Estate/House")',
        },
      },
      required: ['folder'],
    },
  },
  handler: async (args: unknown = {}): Promise<{ content: Array<{ type: string; text: string }> }> => {
    const { actors, pattern, folder } = args as ActorOrganizeArgs;
    
    if (!actors && !pattern) {
      throw new Error('Either actors array or pattern must be provided');
    }
    
    logger.debug('Organizing actors', { actors, pattern, folder });
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'actor.organize',
        params: { actors, pattern, folder }
      });
      
      if (result.success) {
        const organizedActors = (result.organizedActors as string[]) || [];
        const count = result.count as number || 0;
        
        let text = `✓ Organized ${count} actors into folder: ${folder}\n`;
        
        if (organizedActors.length > 0) {
          text += '\nActors moved:\n';
          organizedActors.forEach(actor => {
            text += `  • ${actor}\n`;
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
        throw new Error(result.error || 'Failed to organize actors');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to organize actors: ${errorMessage}`);
    }
  },
};