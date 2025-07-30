import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

interface ActorSpawnArgs {
  assetPath: string;
  location?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  name?: string;
  folder?: string;
  validate?: boolean;
}

export const actorSpawnTool = {
  definition: {
    name: 'actor_spawn',
    description: 'Spawn an actor in the level. Location [X,Y,Z] where X-=North/X+=South, Y-=East/Y+=West, Z+=Up. Rotation [Roll,Pitch,Yaw] in degrees. Examples: actor_spawn({ assetPath: "/Game/Meshes/Cube" }) or actor_spawn({ assetPath: "/Game/Wall", location: [1000, 500, 0], rotation: [0, 0, 90] }). For coordinate system, rotations & workflows: help({ tool: "actor_spawn" })',
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
          description: 'World location [X, Y, Z] where X-=North, Y-=East, Z+=Up (default: [0, 0, 0])',
          default: [0, 0, 0],
        },
        rotation: {
          type: 'array',
          items: { type: 'number' },
          minItems: 3,
          maxItems: 3,
          description: 'Rotation [Roll, Pitch, Yaw] in degrees. Roll=tilt, Pitch=up/down, Yaw=turn. Common: [0,0,90]=90° turn. See help() for details.',
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
        validate: {
          type: 'boolean',
          description: 'Validate spawn after creation (default: true)',
          default: true,
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
      folder,
      validate
    } = args as ActorSpawnArgs;
    
    logger.debug('Spawning actor', { assetPath, location, rotation, scale, name, folder });
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'actor.spawn',
        params: { assetPath, location, rotation, scale, name, folder, validate }
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
        if (folder) {
          text += `  Folder: ${folder}\n`;
        }
        
        // Add validation results if present
        if (result.validated !== undefined) {
          text += `\nValidation: ${result.validated ? '✓ Passed' : '✗ Failed'}\n`;
          if (result.validation_errors && Array.isArray(result.validation_errors) && result.validation_errors.length > 0) {
            text += 'Validation Errors:\n';
            result.validation_errors.forEach((error: string) => {
              text += `  - ${error}\n`;
            });
          }
          if (result.validation_warnings && Array.isArray(result.validation_warnings) && result.validation_warnings.length > 0) {
            text += 'Validation Warnings:\n';
            result.validation_warnings.forEach((warning: string) => {
              text += `  - ${warning}\n`;
            });
          }
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