import { ViewportTool } from '../base/viewport-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface CameraArgs {
  location?: [number, number, number];
  rotation?: [number, number, number];
  focusActor?: string;
  distance?: number;
}

/**
 * Tool for setting viewport camera position and rotation
 */
export class ViewportCameraTool extends ViewportTool<CameraArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'viewport_camera',
      description: 'Set viewport camera position/rotation. Top-down: viewport_camera({ rotation: [0, -90, 0] }). Look at point: viewport_camera({ location: [1000, 1000, 500] }). For views & coordinate system: help({ tool: "viewport_camera" })',
      inputSchema: {
        type: 'object',
        properties: {
          location: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'Camera location [X, Y, Z]. X-=North, Y-=East, Z+=Up',
          },
          rotation: {
            type: 'array',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            description: 'Camera rotation [Roll, Pitch, Yaw]. Pitch=-90 for top-down. Keep Roll=0 to avoid tilted horizon!',
          },
          focusActor: {
            type: 'string',
            description: 'Name of actor to focus on (overrides location/rotation)',
          },
          distance: {
            type: 'number',
            description: 'Distance from focus actor (used with focusActor)',
            default: 500,
          },
        },
      },
    };
  }

  protected async execute(args: CameraArgs) {
    const result = await this.executePythonCommand(
      this.viewportCommands.camera,
      args
    );
    
    let text = '✓ Viewport camera updated\n';
    
    if (args.focusActor) {
      text += `  Focused on: ${args.focusActor}\n`;
      if (args.distance) {
        text += `  Distance: ${args.distance}\n`;
      }
    }
    
    if (result.location || result.rotation) {
      text += this.formatCameraInfo(
        result.location as number[],
        result.rotation as number[]
      );
    }
    
    return ResponseFormatter.success(text.trimEnd());
  }
}

export const viewportCameraTool = new ViewportCameraTool().toMCPTool();