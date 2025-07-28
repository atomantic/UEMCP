import { PythonBridge } from '../services/python-bridge.js';

export const viewportRenderModeTool = {
  definition: {
    name: 'viewport_render_mode',
    description: 'Change viewport rendering. Wireframe best for debugging gaps/overlaps. viewport_render_mode({ mode: "wireframe" }). Options: lit/unlit/wireframe/detail_lighting/lighting_only/etc.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          description: 'Rendering mode',
          enum: ['lit', 'unlit', 'wireframe', 'detail_lighting', 'lighting_only', 'light_complexity', 'shader_complexity'],
          default: 'lit'
        }
      },
      required: []
    }
  },
  handler: async ({ mode = 'lit' }: { mode?: string }): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> => {
    const bridge = new PythonBridge();
    
    try {
      const result = await bridge.executeCommand({
        type: 'viewport.render_mode',
        params: { mode }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to change viewport render mode');
      }

      return {
        content: [{
          type: 'text',
          text: `✓ Viewport render mode changed to ${String(result.mode || mode)}\n\n${result.message ? String(result.message) : ''}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{
          type: 'text',
          text: `Error: Failed to change viewport render mode: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
};