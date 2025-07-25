import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

interface ViewportCameraArgs {
  location?: [number, number, number];
  rotation?: [number, number, number];
  focusActor?: string;
  distance?: number;
}

export const viewportCameraTool = {
  definition: {
    name: 'viewport_camera',
    description: 'Control the viewport camera position and orientation',
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: 'Camera location [x, y, z]',
        },
        rotation: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: 'Camera rotation [pitch, yaw, roll] in degrees',
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
      required: [],
    },
  },
  handler: async (args: unknown = {}): Promise<{ content: Array<{ type: string; text: string }> }> => {
    const { location, rotation, focusActor, distance = 500 } = args as ViewportCameraArgs;
    
    logger.debug('Adjusting viewport camera', { location, rotation, focusActor, distance });
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'viewport.camera',
        params: { location, rotation, focusActor, distance }
      });
      
      if (result.success) {
        let text = '✓ Viewport camera updated\n\n';
        
        if (focusActor) {
          text += `Focused on: ${focusActor}\n`;
          text += `Distance: ${distance} units\n`;
        }
        
        if (result.location) {
          const loc = result.location as { x: number; y: number; z: number };
          text += `Camera Location: [${loc.x.toFixed(1)}, ${loc.y.toFixed(1)}, ${loc.z.toFixed(1)}]\n`;
        }
        
        if (result.rotation) {
          const rot = result.rotation as { pitch: number; yaw: number; roll: number };
          text += `Camera Rotation: [Pitch: ${rot.pitch.toFixed(1)}°, Yaw: ${rot.yaw.toFixed(1)}°, Roll: ${rot.roll.toFixed(1)}°]\n`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      } else {
        throw new Error(result.error || 'Failed to update viewport camera');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to update viewport camera: ${errorMessage}`);
    }
  },
};