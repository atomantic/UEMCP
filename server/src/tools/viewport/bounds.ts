import { ViewportTool } from '../base/viewport-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter, ToolResponse } from '../../utils/response-formatter.js';

/**
 * Tool for getting viewport boundaries
 */
export class ViewportBoundsTool extends ViewportTool {
  get definition(): ToolDefinition {
    return {
      name: 'viewport_bounds',
      description: 'Get current viewport boundaries and visible area. Returns min/max coordinates visible in viewport.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };
  }

  protected async execute(): Promise<ToolResponse> {
    const result = await this.executePythonCommand(
      this.viewportCommands.bounds,
      {}
    );
    
    let text = '✓ Viewport bounds calculated\n\n';
    
    if (result.camera) {
      const cam = result.camera as { location?: number[]; rotation?: number[] };
      text += 'Camera:\n';
      text += this.formatCameraInfo(cam.location, cam.rotation);
      text += '\n\n';
    }
    
    if (result.bounds) {
      const bounds = result.bounds as { min: number[]; max: number[] };
      text += 'Visible Area:\n';
      text += `  Min: [${bounds.min.map((n) => n.toFixed(1)).join(', ')}]\n`;
      text += `  Max: [${bounds.max.map((n) => n.toFixed(1)).join(', ')}]`;
      
      if (result.viewDistance) {
        text += `\n\nView Distance: ${result.viewDistance as number}`;
      }
      if (result.fov) {
        text += `\nField of View: ${result.fov as number}°`;
      }
    }
    
    return ResponseFormatter.success(text);
  }
}

export const viewportBoundsTool = new ViewportBoundsTool().toMCPTool();
