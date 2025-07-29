import { PythonBridge } from '../services/python-bridge.js';

export const viewportBoundsTool = {
  definition: {
    name: 'viewport_bounds',
    description: 'Get current viewport boundaries and visible area. Returns min/max coordinates visible in viewport.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  handler: async (_args: unknown = {}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> => {
    const bridge = new PythonBridge();
    
    try {
      const result = await bridge.executeCommand({
        type: 'viewport.bounds',
        params: {}
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to get viewport bounds');
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
        fov: number;
      };

      let text = '✓ Viewport Bounds\n\n';
      
      if (bounds) {
        text += `Min: [${bounds.min.x.toFixed(1)}, ${bounds.min.y.toFixed(1)}, ${bounds.min.z.toFixed(1)}]\n`;
        text += `Max: [${bounds.max.x.toFixed(1)}, ${bounds.max.y.toFixed(1)}, ${bounds.max.z.toFixed(1)}]\n`;
        text += `Center: [${bounds.center.x.toFixed(1)}, ${bounds.center.y.toFixed(1)}, ${bounds.center.z.toFixed(1)}]\n`;
        text += `Size: [${bounds.size.x.toFixed(1)}, ${bounds.size.y.toFixed(1)}, ${bounds.size.z.toFixed(1)}]\n\n`;
      }

      if (camera) {
        text += 'Camera Info:\n';
        text += `Location: [${camera.location.x.toFixed(1)}, ${camera.location.y.toFixed(1)}, ${camera.location.z.toFixed(1)}]\n`;
        text += `Rotation: [Pitch: ${camera.rotation.pitch.toFixed(1)}°, Yaw: ${camera.rotation.yaw.toFixed(1)}°, Roll: ${camera.rotation.roll.toFixed(1)}°]\n`;
        text += `FOV: ${camera.fov.toFixed(1)}°`;
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
          text: `Error: Failed to get viewport bounds: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
};