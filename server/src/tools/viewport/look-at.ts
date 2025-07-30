import { ViewportTool } from '../base/viewport-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface ViewportLookAtArgs {
  target?: [number, number, number];
  actorName?: string;
  distance?: number;
  pitch?: number;
  height?: number;
}

/**
 * Tool for pointing viewport camera at target
 */
export class ViewportLookAtTool extends ViewportTool<ViewportLookAtArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'viewport_look_at',
      description: 'Point viewport camera to look at specific coordinates or actor. Automatically calculates correct Yaw angle.',
      inputSchema: {
        type: 'object',
        properties: {
          target: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'Target location [X, Y, Z] to look at (provide either target or actorName)',
          },
          actorName: {
            type: 'string',
            description: 'Name of actor to look at (provide either target or actorName)',
          },
          distance: {
            type: 'number',
            description: 'Distance from target (default: 1000)',
            default: 1000,
          },
          pitch: {
            type: 'number',
            description: 'Camera pitch angle in degrees (default: -30)',
            default: -30,
          },
          height: {
            type: 'number',
            description: 'Camera height offset from target (default: 500)',
            default: 500,
          },
        },
      },
    };
  }

  protected async execute(args: ViewportLookAtArgs) {
    const result = await this.executePythonCommand(
      this.viewportCommands.lookAt,
      args
    );
    
    let text = '✓ Camera positioned to look at ';
    
    if (args.actorName) {
      text += `actor: ${args.actorName}`;
    } else if (args.target) {
      text += `location: [${args.target.join(', ')}]`;
    }
    
    if (result.location && result.rotation) {
      text += '\n\n' + this.formatCameraInfo(
        result.location as number[],
        result.rotation as number[]
      );
    }
    
    if (result.targetLocation) {
      const target = result.targetLocation as number[];
      text += `\n\nTarget Location: [${target.map(n => n.toFixed(1)).join(', ')}]`;
    }
    
    return ResponseFormatter.success(text);
  }
}

export const viewportLookAtTool = new ViewportLookAtTool().toMCPTool();