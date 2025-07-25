import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

interface ActorDeleteArgs {
  actorName: string;
}

export const actorDeleteTool = {
  definition: {
    name: 'actor_delete',
    description: 'Delete an actor from the level by name',
    inputSchema: {
      type: 'object',
      properties: {
        actorName: {
          type: 'string',
          description: 'Name of the actor to delete',
        },
      },
      required: ['actorName'],
    },
  },
  handler: async (args: unknown = {}): Promise<{ content: Array<{ type: string; text: string }> }> => {
    const { actorName } = args as ActorDeleteArgs;
    
    logger.debug('Deleting actor', { actorName });
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'actor.delete',
        params: { actorName }
      });
      
      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: `✓ ${result.message}`,
            },
          ],
        };
      } else {
        throw new Error(result.error || 'Failed to delete actor');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete actor: ${errorMessage}`);
    }
  },
};