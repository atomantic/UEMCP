import { ViewportTool } from '../base/viewport-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface ViewportFocusArgs {
  actorName: string;
  preserveRotation?: boolean;
}

/**
 * Tool for focusing viewport on specific actors
 */
export class ViewportFocusTool extends ViewportTool<ViewportFocusArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'viewport_focus',
      description: 'Focus viewport on specific actor. viewport_focus({ actorName: "Wall_01" }). Use preserveRotation: true to keep current view angle. Great for inspecting placement.',
      inputSchema: {
        type: 'object',
        properties: {
          actorName: {
            type: 'string',
            description: 'Name of the actor to focus on',
          },
          preserveRotation: {
            type: 'boolean',
            description: 'Keep current camera angles (useful for maintaining top-down or side views)',
            default: false,
          },
        },
        required: ['actorName'],
      },
    };
  }

  protected async execute(args: ViewportFocusArgs) {
    const result = await this.executePythonCommand(
      this.viewportCommands.focus,
      args
    );
    
    let text = `✓ Focused viewport on: ${args.actorName}`;
    
    if (args.preserveRotation) {
      text += '\n  Rotation: Preserved';
    }
    
    if (result.location) {
      text += `\n  Actor location: [${(result.location as number[]).map(n => n.toFixed(1)).join(', ')}]`;
    }
    
    return ResponseFormatter.success(text);
  }
}

export const viewportFocusTool = new ViewportFocusTool().toMCPTool();
