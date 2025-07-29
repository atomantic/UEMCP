import { PythonBridge } from '../services/python-bridge.js';

interface ViewportFitArgs {
  actors?: string[];
  filter?: string;
  padding?: number;
}

export const viewportFitTool = {
  definition: {
    name: 'viewport_fit',
    description: 'Fit actors in viewport. viewport_fit({ actors: ["Wall_1", "Wall_2"] }) or viewport_fit({ filter: "Wall" }). Auto-adjusts camera to show all specified actors.',
    inputSchema: {
      type: 'object',
      properties: {
        actors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific actor names to fit in view'
        },
        filter: {
          type: 'string',
          description: 'Filter pattern for actor names (used if actors not provided)'
        },
        padding: {
          type: 'number',
          description: 'Padding percentage around actors (default: 20)',
          default: 20
        }
      },
      required: []
    }
  },
  handler: async (args: unknown = {}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> => {
    const { actors, filter, padding = 20 } = args as ViewportFitArgs;
    
    if (!actors && !filter) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Must provide either actors array or filter pattern'
        }],
        isError: true
      };
    }
    
    const bridge = new PythonBridge();
    
    try {
      const result = await bridge.executeCommand({
        type: 'viewport.fit',
        params: { actors, filter, padding }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to fit actors in viewport');
      }

      const bounds = result.bounds as {
        min: { x: number; y: number; z: number };
        max: { x: number; y: number; z: number };
        center: { x: number; y: number; z: number };
        size: { x: number; y: number; z: number };
      };

      const camera = result.camera as {
        location: { x: number; y: number; z: number };
        rotation: { pitch: number; yaw: number; roll: number };
      };

      const actorCount = result.actorCount as number;
      let text = `✓ Fitted ${actorCount || 0} actors in viewport\n\n`;
      
      if (bounds) {
        text += 'Actor Bounds:\n';
        text += `Center: [${bounds.center.x.toFixed(1)}, ${bounds.center.y.toFixed(1)}, ${bounds.center.z.toFixed(1)}]\n`;
        text += `Size: [${bounds.size.x.toFixed(1)}, ${bounds.size.y.toFixed(1)}, ${bounds.size.z.toFixed(1)}]\n\n`;
      }

      if (camera) {
        text += 'Camera Position:\n';
        text += `Location: [${camera.location.x.toFixed(1)}, ${camera.location.y.toFixed(1)}, ${camera.location.z.toFixed(1)}]\n`;
        text += `Rotation: [Pitch: ${camera.rotation.pitch.toFixed(1)}°, Yaw: ${camera.rotation.yaw.toFixed(1)}°, Roll: ${camera.rotation.roll.toFixed(1)}°]`;
      }

      const message = result.message as string;
      if (message) {
        text += `\n\n${message}`;
      }

      return {
        content: [{
          type: 'text',
          text
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{
          type: 'text',
          text: `Error: Failed to fit actors in viewport: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
};