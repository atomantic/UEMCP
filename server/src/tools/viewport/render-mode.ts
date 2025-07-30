import { ViewportTool } from '../base/viewport-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter, ToolResponse } from '../../utils/response-formatter.js';

interface RenderModeArgs {
  mode?: 'lit' | 'unlit' | 'wireframe' | 'detail_lighting' | 'lighting_only' | 'light_complexity' | 'shader_complexity';
}

/**
 * Tool for changing viewport rendering mode
 */
export class ViewportRenderModeTool extends ViewportTool<RenderModeArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'viewport_render_mode',
      description: 'Change viewport rendering. Wireframe best for debugging gaps/overlaps. viewport_render_mode({ mode: "wireframe" }). Options: lit/unlit/wireframe/detail_lighting/lighting_only/etc.',
      inputSchema: {
        type: 'object',
        properties: {
          mode: {
            type: 'string',
            enum: ['lit', 'unlit', 'wireframe', 'detail_lighting', 'lighting_only', 'light_complexity', 'shader_complexity'],
            description: 'Rendering mode',
            default: 'lit',
          },
        },
      },
    };
  }

  protected async execute(args: RenderModeArgs): Promise<ToolResponse> {
    const mode = args.mode || 'lit';
    await this.executePythonCommand(
      this.viewportCommands.renderMode,
      { mode }
    );
    
    const modeDescriptions: Record<string, string> = {
      lit: 'Standard lit rendering',
      unlit: 'No lighting (flat shading)',
      wireframe: 'Wireframe (great for debugging)',
      detail_lighting: 'Detailed lighting only',
      lighting_only: 'Lighting without textures',
      light_complexity: 'Light complexity visualization',
      shader_complexity: 'Shader complexity visualization',
    };
    
    let text = `✓ Viewport render mode set to: ${mode}`;
    const description = modeDescriptions[mode];
    if (description) {
      text += `\n  ${description}`;
    }
    
    return ResponseFormatter.success(text);
  }
}

export const viewportRenderModeTool = new ViewportRenderModeTool().toMCPTool();
