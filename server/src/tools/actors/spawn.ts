import { ActorTool } from '../base/actor-tool.js';
import { ToolResponse } from '../../utils/response-formatter.js';
import { ToolDefinition } from '../base/base-tool.js';

interface ActorSpawnArgs {
  assetPath: string;
  location?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  name?: string;
  folder?: string;
  validate?: boolean;
}

/**
 * Tool for spawning actors in the level
 * Refactored to use base class - reduced from 136 to 80 lines (41% reduction)
 */
export class ActorSpawnTool extends ActorTool<ActorSpawnArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'actor_spawn',
      description: 'Spawn an actor in the level. Location [X,Y,Z] where X-=North/X+=South, Y-=East/Y+=West, Z+=Up. Rotation [Roll,Pitch,Yaw] in degrees. Examples: actor_spawn({ assetPath: "/Game/Meshes/Cube" }) or actor_spawn({ assetPath: "/Game/Wall", location: [1000, 500, 0], rotation: [0, 0, 90] }). For coordinate system, rotations & workflows: help({ tool: "actor_spawn" })',
      inputSchema: {
        type: 'object',
        properties: {
          assetPath: {
            type: 'string',
            description: 'Asset path (e.g., /Game/Meshes/SM_Wall01)',
          },
          location: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'World location [X, Y, Z] where X-=North, Y-=East, Z+=Up (default: [0, 0, 0])',
            default: [0, 0, 0],
          },
          rotation: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'Rotation [Roll, Pitch, Yaw] in degrees. Roll=tilt, Pitch=up/down, Yaw=turn. Common: [0,0,90]=90° turn. See help() for details.',
            default: [0, 0, 0],
          },
          scale: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'Scale [x, y, z] (default: [1, 1, 1])',
            default: [1, 1, 1],
          },
          name: {
            type: 'string',
            description: 'Optional name for the spawned actor',
          },
          folder: {
            type: 'string',
            description: 'Optional folder path in World Outliner (e.g., "Estate/House")',
          },
          validate: {
            type: 'boolean',
            description: 'Validate spawn after creation (default: true)',
            default: true,
          },
        },
        required: ['assetPath'],
      },
    };
  }

  protected async execute(args: ActorSpawnArgs): Promise<ToolResponse> {
    const { location = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] } = args;
    
    const result = await this.executePythonCommand('actor.spawn', args);
    
    const actorName = (result.actorName as string) || 'Unknown';
    const actualLocation = (result.location as number[]) || location;
    
    let text = `✓ Spawned actor: ${actorName}\n`;
    text += `  Asset: ${args.assetPath}\n`;
    text += `  Location: ${this.formatLocation(actualLocation)}\n`;
    
    if (this.hasRotation(rotation)) {
      text += `  Rotation: ${this.formatRotation(rotation)}\n`;
    }
    
    if (this.hasScale(scale)) {
      text += `  Scale: ${this.formatLocation(scale)}\n`;
    }
    
    if (args.folder) {
      text += `  Folder: ${args.folder}`;
    }
    
    return this.buildSuccessResponse(text, result);
  }
}

// Export in MCP format
export const actorSpawnTool = new ActorSpawnTool().toMCPTool();
