import { LevelTool } from '../base/level-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter, ToolResponse } from '../../utils/response-formatter.js';

interface LevelActorsArgs {
  filter?: string;
  limit?: number;
}

/**
 * Tool for listing actors in the level
 */
export class LevelActorsTool extends LevelTool<LevelActorsArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'level_actors',
      description: 'List level actors with properties (location, rotation, scale, asset). Examples: level_actors({}) for all, level_actors({ filter: "Wall" }) for walls only. Returns positions where X-=North, Y-=East. Great for verifying placement!',
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
      },
    };
  }

  protected async execute(args: LevelActorsArgs): Promise<ToolResponse> {
    const result = await this.executePythonCommand(this.levelCommands.actors, args);
    
    const actors = (result.actors || []) as Array<{
      name: string;
      class: string;
      location: { x: number; y: number; z: number };
      rotation?: { roll: number; pitch: number; yaw: number };
      scale?: { x: number; y: number; z: number };
      assetPath?: string;
    }>;
    const totalCount = result.totalCount as number || actors.length;
    const currentLevel = result.currentLevel as string || 'Unknown';
    
    let text = `Current Level: ${currentLevel}\n\n`;
    text += this.formatActorList(actors, totalCount);
    
    return ResponseFormatter.success(text);
  }
}

export const levelActorsTool = new LevelActorsTool().toMCPTool();
