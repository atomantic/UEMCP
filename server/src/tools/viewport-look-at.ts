import { PythonBridge } from '../services/python-bridge.js';

export const viewportLookAt = {
  definition: {
    name: 'viewport_look_at',
  description: 'Point viewport camera to look at specific coordinates or actor. Automatically calculates correct Yaw angle.',
  inputSchema: {
    type: 'object',
    properties: {
      target: {
        type: 'array',
        items: { type: 'number' },
        minItems: 3,
        maxItems: 3,
        description: 'Target location [X, Y, Z] to look at'
      },
      actorName: {
        type: 'string',
        description: 'Name of actor to look at (alternative to target coordinates)'
      },
      distance: {
        type: 'number',
        description: 'Distance from target (default: 1000)',
        default: 1000
      },
      pitch: {
        type: 'number',
        description: 'Camera pitch angle in degrees (default: -30)',
        default: -30
      },
      height: {
        type: 'number',
        description: 'Camera height offset from target (default: 500)',
        default: 500
      }
    },
    oneOf: [
      { required: ['target'] },
      { required: ['actorName'] }
    ]
  }
  },
  
  handler: async (args: unknown = {}): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> => {
    const bridge = new PythonBridge();
    
    try {
      const typedArgs = args as {
        target?: [number, number, number];
        actorName?: string;
        distance?: number;
        pitch?: number;
        height?: number;
      };
      
      const result = await bridge.executeCommand({
        type: 'viewport.look_at',
        params: {
          target: typedArgs.target,
          actorName: typedArgs.actorName,
          distance: typedArgs.distance || 1000,
          pitch: typedArgs.pitch || -30,
          height: typedArgs.height || 500
        }
      });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      const location = result.location as [number, number, number];
      const rotation = result.rotation as [number, number, number];
      const targetLoc = result.targetLocation as [number, number, number];
      
      let text = `✓ Camera positioned to look at target\n\n`;
      text += `Camera Location: [${location[0]}, ${location[1]}, ${location[2]}]\n`;
      text += `Camera Rotation: [Pitch: ${rotation[1]}°, Yaw: ${rotation[2]}°, Roll: ${rotation[0]}°]\n`;
      text += `Target Location: [${targetLoc[0]}, ${targetLoc[1]}, ${targetLoc[2]}]\n`;
      text += `Distance: ${typedArgs.distance || 1000} units`;
      
      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to position camera: ${errorMessage}`);
    }
  }
};