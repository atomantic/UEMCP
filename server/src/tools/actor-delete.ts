import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

interface ActorDeleteArgs {
  actorName: string;
  validate?: boolean;
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
        validate: {
          type: 'boolean',
          description: 'Validate deletion succeeded (default: true)',
          default: true,
        },
      },
      required: ['actorName'],
    },
  },
  handler: async (args: unknown = {}): Promise<{ content: Array<{ type: string; text: string }> }> => {
    const { actorName, validate } = args as ActorDeleteArgs;
    
    logger.debug('Deleting actor', { actorName });
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'actor.delete',
        params: { actorName, validate }
      });
      
      if (result.success) {
        let text = `✓ ${result.message as string}`;
        
        // Add validation results if present
        if (result.validated !== undefined) {
          text += `\n\nValidation: ${result.validated ? '✓ Passed' : '✗ Failed'}`;
          if (result.validation_errors && result.validation_errors.length > 0) {
            text += '\nValidation Errors:';
            result.validation_errors.forEach((error: string) => {
              text += `\n  - ${error}`;
            });
          }
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
        throw new Error(result.error || 'Failed to delete actor');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete actor: ${errorMessage}`);
    }
  },
};