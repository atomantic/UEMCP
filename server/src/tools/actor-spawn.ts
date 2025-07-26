import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

interface ActorSpawnArgs {
  assetPath: string;
  location?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  name?: string;
  folder?: string;
}

export const actorSpawnTool = {
  definition: {
    name: 'actor_spawn',
    description: 'Spawn an actor in the level using an asset (mesh, blueprint, etc). IMPORTANT: For modular building pieces, verify placement with wireframe screenshots from multiple angles to check for gaps and overlaps.',
    inputSchema: {
      type: 'object',
      properties: {
        assetPath: {
          type: 'string',
          description: 'Asset path (e.g., /Game/Meshes/SM_Wall01)',
        },
        location: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: 'World location [x, y, z] (default: [0, 0, 0])',
          default: [0, 0, 0],
        },
        rotation: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: 'Rotation [roll, pitch, yaw] in degrees. For walls: [0,0,0] for X-axis, [0,0,-90] for Y-axis. Corner pieces often need [0,0,90] or similar.',
          default: [0, 0, 0],
        },
        scale: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: 'Scale [x, y, z] (default: [1, 1, 1])',
          default: [1, 1, 1],
        },
        name: {
          type: 'string',
          description: 'Optional name for the spawned actor',
        },
        folder: {
          type: 'string',
          description: 'Optional folder path in World Outliner (e.g., "Estate/House")',
        },
      },
      required: ['assetPath'],
    },
  },
  handler: async (args: unknown = {}): Promise<{ content: Array<{ type: string; text: string }> }> => {
    const { 
      assetPath, 
      location = [0, 0, 0], 
      rotation = [0, 0, 0], 
      scale = [1, 1, 1],
      name,
      folder
    } = args as ActorSpawnArgs;
    
    logger.debug('Spawning actor', { assetPath, location, rotation, scale, name, folder });
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'actor.spawn',
        params: { assetPath, location, rotation, scale, name, folder }
      });
      
      if (result.success) {
        const actorName = (result.actorName as string) || 'Unknown';
        const actualLocation = (result.location as number[]) || location;
        
        let text = `✓ Spawned actor: ${actorName}\n`;
        text += `  Asset: ${assetPath}\n`;
        text += `  Location: [${actualLocation.join(', ')}]\n`;
        if (rotation.some(r => r !== 0)) {
          text += `  Rotation: [${rotation.join(', ')}]°\n`;
        }
        if (scale.some(s => s !== 1)) {
          text += `  Scale: [${scale.join(', ')}]\n`;
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
        throw new Error(result.error || 'Failed to spawn actor');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to spawn actor: ${errorMessage}`);
    }
  },
};