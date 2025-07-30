import { ViewportTool } from '../base/viewport-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface ViewportFitArgs {
  actors?: string[];
  filter?: string;
  padding?: number;
}

/**
 * Tool for fitting actors in viewport
 */
export class ViewportFitTool extends ViewportTool<ViewportFitArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'viewport_fit',
      description: 'Fit actors in viewport. viewport_fit({ actors: ["Wall_1", "Wall_2"] }) or viewport_fit({ filter: "Wall" }). Auto-adjusts camera to show all specified actors.',
      inputSchema: {
        type: 'object',
        properties: {
          actors: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific actor names to fit in view',
          },
          filter: {
            type: 'string',
            description: 'Filter pattern for actor names (used if actors not provided)',
          },
          padding: {
            type: 'number',
            description: 'Padding percentage around actors (default: 20)',
            default: 20,
          },
        },
      },
    };
  }

  protected async execute(args: ViewportFitArgs) {
    const result = await this.executePythonCommand(
      this.viewportCommands.fit,
      args
    );
    
    const fittedCount = result.fittedActors as number || 0;
    
    let text = `✓ Fitted ${fittedCount} actor${fittedCount !== 1 ? 's' : ''} in viewport`;
    
    if (args.actors) {
      text += `\n  Method: Specific actors (${args.actors.length} provided)`;
    } else if (args.filter) {
      text += `\n  Method: Filter pattern "${args.filter}"`;
    }
    
    if (result.boundsCenter && result.boundsSize) {
      const center = result.boundsCenter as number[];
      const size = result.boundsSize as number[];
      text += `\n  Center: [${center.map(n => n.toFixed(1)).join(', ')}]`;
      text += `\n  Size: [${size.map(n => n.toFixed(1)).join(', ')}]`;
    }
    
    if (args.padding !== undefined && args.padding !== 20) {
      text += `\n  Padding: ${args.padding}%`;
    }
    
    return ResponseFormatter.success(text);
  }
}

export const viewportFitTool = new ViewportFitTool().toMCPTool();
