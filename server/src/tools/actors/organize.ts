import { ActorTool } from '../base/actor-tool.js';
import { ToolResponse } from '../../utils/response-formatter.js';
import { ToolDefinition } from '../base/base-tool.js';

interface ActorOrganizeArgs {
  folder: string;
  actors?: string[];
  pattern?: string;
}

/**
 * Tool for organizing actors into folders
 */
export class ActorOrganizeTool extends ActorTool<ActorOrganizeArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'actor_organize',
      description: 'Organize existing actors into folders in the World Outliner',
      inputSchema: {
        type: 'object',
        properties: {
          folder: {
            type: 'string',
            description: 'Target folder path in World Outliner (e.g., "Estate/House")',
          },
          actors: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of specific actor names to organize',
          },
          pattern: {
            type: 'string',
            description: 'Pattern to match actor names (e.g., "Wall_", "Corner_"). Used if actors array is not provided',
          },
        },
        required: ['folder'],
      },
    };
  }

  protected async execute(args: ActorOrganizeArgs): Promise<ToolResponse> {
    const result = await this.executePythonCommand('actor.organize', args);
    
    const organizedCount = (result.organizedCount as number) || 0;
    
    let text = `✓ Organized ${organizedCount} actor${organizedCount !== 1 ? 's' : ''} into folder: ${args.folder}\n`;
    
    if (args.actors && args.actors.length > 0) {
      text += `  Method: Specific actors (${args.actors.length} provided)\n`;
    } else if (args.pattern) {
      text += `  Method: Pattern matching "${args.pattern}"`;
    }
    
    if (result.actors && Array.isArray(result.actors) && result.actors.length > 0) {
      text += '\n  Organized actors:\n';
      (result.actors as string[]).slice(0, 10).forEach(actor => {
        text += `    - ${actor}\n`;
      });
      if (result.actors.length > 10) {
        text += `    ... and ${result.actors.length - 10} more`;
      }
    }
    
    return this.buildSuccessResponse(text.trimEnd(), result);
  }
}

export const actorOrganizeTool = new ActorOrganizeTool().toMCPTool();
