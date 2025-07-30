import { ActorTool } from '../base/actor-tool.js';
import { ToolDefinition } from '../base/base-tool.js';

interface ActorDuplicateArgs {
  sourceName: string;
  name?: string;
  offset?: {
    x?: number;
    y?: number;
    z?: number;
  };
  validate?: boolean;
}

/**
 * Tool for duplicating actors
 */
export class ActorDuplicateTool extends ActorTool<ActorDuplicateArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'actor_duplicate',
      description: 'Duplicate an existing actor with optional offset. Perfect for building floors/sections. Example: actor_duplicate({ sourceName: "Wall_F1", name: "Wall_F2", offset: { z: 300 } }). See help() for workflows.',
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
            description: 'Position offset from source actor [X,Y,Z]. X-=North, Y-=East, Z+=Up',
            properties: {
              x: { type: 'number', default: 0, description: 'X offset' },
              y: { type: 'number', default: 0, description: 'Y offset' },
              z: { type: 'number', default: 0, description: 'Z offset' },
            },
          },
          validate: {
            type: 'boolean',
            description: 'Validate duplication succeeded (default: true)',
            default: true,
          },
        },
        required: ['sourceName'],
      },
    };
  }

  protected async execute(args: ActorDuplicateArgs) {
    const result = await this.executePythonCommand('actor.duplicate', args);
    
    const newName = (result.actorName as string) || args.name || `${args.sourceName}_Copy`;
    const location = result.location as number[];
    
    let text = `✓ Duplicated actor: ${args.sourceName} → ${newName}\n`;
    
    if (location) {
      text += `  Location: ${this.formatLocation(location)}\n`;
    }
    
    if (args.offset && (args.offset.x || args.offset.y || args.offset.z)) {
      text += `  Offset: [${args.offset.x || 0}, ${args.offset.y || 0}, ${args.offset.z || 0}]`;
    }
    
    return this.buildSuccessResponse(text, result);
  }
}

export const actorDuplicateTool = new ActorDuplicateTool().toMCPTool();
