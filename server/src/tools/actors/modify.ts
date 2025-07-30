import { ActorTool } from '../base/actor-tool.js';
import { ToolDefinition } from '../base/base-tool.js';

interface ActorModifyArgs {
  actorName: string;
  location?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  mesh?: string;
  folder?: string;
  validate?: boolean;
}

/**
 * Tool for modifying actor properties
 */
export class ActorModifyTool extends ActorTool<ActorModifyArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'actor_modify',
      description: 'Modify actor properties. Move: actor_modify({ actorName: "Wall", location: [100, 200, 0] }). Rotate: actor_modify({ actorName: "Corner", rotation: [0, 0, 90] }). Change mesh: actor_modify({ actorName: "Wall", mesh: "/Game/Meshes/NewWall" }). Organize: actor_modify({ actorName: "Door", folder: "Building/Doors" })',
      inputSchema: {
        type: 'object',
        properties: {
          actorName: {
            type: 'string',
            description: 'Name of the actor to modify',
          },
          location: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'New world location [X, Y, Z] where X-=North, Y-=East, Z+=Up',
          },
          rotation: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'New rotation [Roll, Pitch, Yaw] in degrees. Yaw=turn, Pitch=up/down, Roll=tilt',
          },
          scale: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'New scale [x, y, z]',
          },
          mesh: {
            type: 'string',
            description: 'New static mesh asset path (e.g., "/Game/Meshes/SM_Wall"). Only works for StaticMeshActors.',
          },
          folder: {
            type: 'string',
            description: 'New folder path in World Outliner (e.g., "Estate/House")',
          },
          validate: {
            type: 'boolean',
            description: 'Validate changes were applied (default: true)',
            default: true,
          },
        },
        required: ['actorName'],
      },
    };
  }

  protected async execute(args: ActorModifyArgs) {
    const result = await this.executePythonCommand('actor.modify', args);
    
    let text = `✓ Modified actor: ${args.actorName}\n`;
    
    // Build details of what was changed
    const changes: string[] = [];
    if (args.location) changes.push(`Location: ${this.formatLocation(args.location)}`);
    if (args.rotation) changes.push(`Rotation: ${this.formatRotation(args.rotation)}`);
    if (args.scale) changes.push(`Scale: ${this.formatLocation(args.scale)}`);
    if (args.mesh) changes.push(`Mesh: ${args.mesh}`);
    if (args.folder) changes.push(`Folder: ${args.folder}`);
    
    if (changes.length > 0) {
      text += 'Changes:\n';
      changes.forEach(change => {
        text += `  - ${change}\n`;
      });
    }
    
    return this.buildSuccessResponse(text.trimEnd(), result);
  }
}

export const actorModifyTool = new ActorModifyTool().toMCPTool();