import { ViewportTool } from '../base/viewport-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface ViewportModeArgs {
  mode: 'perspective' | 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
}

/**
 * Tool for setting viewport to standard views
 */
export class ViewportModeTool extends ViewportTool<ViewportModeArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'viewport_mode',
      description: 'Position camera for standard views. viewport_mode({ mode: "top" }) = looking down. Options: top/front/side/left/right/back/perspective. Auto-centers on selected actors. Note: Positions camera only (UE limitation).',
      inputSchema: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['perspective', 'top', 'bottom', 'left', 'right', 'front', 'back'],
            description: 'Viewport mode',
          },
        },
        required: ['mode'],
      },
    };
  }

  protected async execute(args: ViewportModeArgs) {
    const result = await this.executePythonCommand(
      this.viewportCommands.mode,
      args
    );
    
    let text = `✓ Viewport set to ${args.mode} view`;
    
    if (result.location && result.rotation) {
      text += '\n' + this.formatCameraInfo(
        result.location as number[],
        result.rotation as number[]
      );
    }
    
    if (result.message) {
      text = result.message as string;
    }
    
    return ResponseFormatter.success(text);
  }
}

export const viewportModeTool = new ViewportModeTool().toMCPTool();
