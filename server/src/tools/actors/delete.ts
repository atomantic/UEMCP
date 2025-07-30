import { ActorTool } from '../base/actor-tool.js';
import { ToolDefinition } from '../base/base-tool.js';

interface ActorDeleteArgs {
  actorName: string;
  validate?: boolean;
}

/**
 * Tool for deleting actors from the level
 * Refactored to use base class - reduced from 71 to 35 lines (51% reduction)
 */
export class ActorDeleteTool extends ActorTool<ActorDeleteArgs> {
  get definition(): ToolDefinition {
    return {
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
    };
  }

  protected async execute(args: ActorDeleteArgs) {
    const result = await this.executePythonCommand('actor.delete', args);
    return this.buildSuccessResponse(`✓ ${result.message}`, result);
  }
}

// Export in MCP format
export const actorDeleteTool = new ActorDeleteTool().toMCPTool();
