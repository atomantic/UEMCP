import { ActorTool } from '../base/actor-tool.js';
import { ToolResponse } from '../../utils/response-formatter.js';
import { ToolDefinition } from '../base/base-tool.js';

interface ActorSnapToSocketArgs {
  sourceActor: string;
  targetActor: string;
  targetSocket: string;
  sourceSocket?: string;
  offset?: [number, number, number];
  validate?: boolean;
}

/**
 * Tool for snapping actors to socket points for precise modular placement
 */
export class ActorSnapToSocketTool extends ActorTool<ActorSnapToSocketArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'actor_snap_to_socket',
      description: 'Snap an actor to another actor\'s socket for precise modular placement. Automatically calculates position and rotation. Examples: actor_snap_to_socket({ sourceActor: "Door_01", targetActor: "Wall_01", targetSocket: "DoorSocket" })',
      inputSchema: {
        type: 'object',
        properties: {
          sourceActor: {
            type: 'string',
            description: 'Name of the actor to snap (the one that will be moved)',
          },
          targetActor: {
            type: 'string',
            description: 'Name of the target actor with the socket',
          },
          targetSocket: {
            type: 'string',
            description: 'Name of the socket on the target actor to snap to',
          },
          sourceSocket: {
            type: 'string',
            description: 'Optional socket on source actor to align with target socket (defaults to actor pivot)',
          },
          offset: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'Optional offset from socket position [X, Y, Z]',
            default: [0, 0, 0],
          },
          validate: {
            type: 'boolean',
            description: 'Validate the snap operation (default: true)',
            default: true,
          },
        },
        required: ['sourceActor', 'targetActor', 'targetSocket'],
      },
    };
  }

  protected async execute(args: ActorSnapToSocketArgs): Promise<ToolResponse> {
    const result = await this.executePythonCommand('actor.snap_to_socket', args);
    
    const sourceActor = args.sourceActor;
    const targetActor = args.targetActor;
    const targetSocket = args.targetSocket;
    const newLocation = (result.newLocation as number[]) || [0, 0, 0];
    const newRotation = (result.newRotation as number[]) || [0, 0, 0];
    
    let text = `✓ Snapped ${sourceActor} to ${targetActor}'s socket\n`;
    text += `  Target Socket: ${targetSocket}\n`;
    
    if (args.sourceSocket) {
      text += `  Source Socket: ${args.sourceSocket}\n`;
    }
    
    text += `  New Location: ${this.formatLocation(newLocation)}\n`;
    text += `  New Rotation: ${this.formatRotation(newRotation)}`;
    
    if (args.offset && args.offset.some(v => v !== 0)) {
      text += `\n  Offset Applied: ${this.formatLocation(args.offset)}`;
    }
    
    if (result.validation && args.validate) {
      const validation = result.validation as Record<string, unknown>;
      if (!validation.success) {
        const message = validation.message as string || 'Position may not be exact';
        text += `\n  ⚠️ Validation Warning: ${message}`;
      }
    }
    
    return this.buildSuccessResponse(text, result);
  }
}

// Export in MCP format
export const actorSnapToSocketTool = new ActorSnapToSocketTool().toMCPTool();