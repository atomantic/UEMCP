import { ActorTool } from '../base/actor-tool.js';
import { ToolResponse } from '../../utils/response-formatter.js';
import { ToolDefinition, PythonResult } from '../base/base-tool.js';

interface SpawnItem {
  assetPath: string;
  location?: number[];
  rotation?: number[];
  scale?: number[];
  name?: string;
  folder?: string;
}

interface BatchSpawnArgs {
  actors: SpawnItem[];
  commonFolder?: string;
  validate?: boolean;
}

interface SpawnedActor {
  name: string;
  assetPath: string;
  location: number[];
  rotation: number[];
  scale: number[];
}

interface FailedSpawn {
  assetPath: string;
  error: string;
}

interface BatchSpawnResult extends PythonResult {
  spawnedActors?: SpawnedActor[];
  failedSpawns?: FailedSpawn[];
  totalRequested?: number;
  executionTime?: number;
}

/**
 * Tool for spawning multiple actors in a single operation
 */
export class BatchSpawnTool extends ActorTool<BatchSpawnArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'batch_spawn',
      description: 'Spawn multiple actors efficiently in a single operation. Reduces overhead and improves performance for placing many actors.',
      inputSchema: {
        type: 'object',
        properties: {
          actors: {
            type: 'array',
            description: 'Array of actors to spawn',
            items: {
              type: 'object',
              properties: {
                assetPath: {
                  type: 'string',
                  description: 'Asset path (e.g., /Game/Meshes/SM_Wall)',
                },
                location: {
                  type: 'array',
                  description: 'World location [X, Y, Z] (default: [0, 0, 0])',
                  items: { type: 'number' },
                  minItems: 3,
                  maxItems: 3,
                },
                rotation: {
                  type: 'array',
                  description: 'Rotation [Roll, Pitch, Yaw] in degrees (default: [0, 0, 0])',
                  items: { type: 'number' },
                  minItems: 3,
                  maxItems: 3,
                },
                scale: {
                  type: 'array',
                  description: 'Scale [X, Y, Z] (default: [1, 1, 1])',
                  items: { type: 'number' },
                  minItems: 3,
                  maxItems: 3,
                },
                name: {
                  type: 'string',
                  description: 'Optional name for the spawned actor',
                },
                folder: {
                  type: 'string',
                  description: 'Optional folder path in World Outliner',
                },
              },
              required: ['assetPath'],
            },
          },
          commonFolder: {
            type: 'string',
            description: 'Optional common folder for all spawned actors (overrides individual folders)',
          },
          validate: {
            type: 'boolean',
            description: 'Validate all spawns after creation (default: true)',
          },
        },
        required: ['actors'],
      },
    };
  }

  protected async execute(args: BatchSpawnArgs): Promise<ToolResponse> {
    // Validate we have actors to spawn
    if (!args.actors || args.actors.length === 0) {
      throw new Error('No actors provided to spawn');
    }

    // Execute batch spawn command
    const result = await this.executePythonCommand('actor.batch_spawn', {
      actors: args.actors,
      commonFolder: args.commonFolder,
      validate: args.validate ?? true, // Default to true
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to spawn actors');
    }

    // Format the response
    return this.formatBatchSpawnResult(result as BatchSpawnResult);
  }

  private formatBatchSpawnResult(result: BatchSpawnResult): ToolResponse {
    const spawnedCount = result.spawnedActors?.length || 0;
    const failedCount = result.failedSpawns?.length || 0;
    const totalCount = spawnedCount + failedCount;

    let text = `Batch Spawn Results: ${spawnedCount}/${totalCount} actors spawned successfully\n\n`;

    // List spawned actors
    if (result.spawnedActors && result.spawnedActors.length > 0) {
      text += 'Successfully spawned:\n';
      result.spawnedActors.forEach((actor) => {
        text += `  ✓ ${actor.name}`;
        if (actor.location) {
          text += ` at [${actor.location.join(', ')}]`;
        }
        text += '\n';
      });
    }

    // List failed spawns
    if (result.failedSpawns && result.failedSpawns.length > 0) {
      text += '\nFailed to spawn:\n';
      result.failedSpawns.forEach((failure) => {
        text += `  ✗ ${failure.assetPath}: ${failure.error}\n`;
      });
    }

    // Add timing information if available
    if (result.executionTime !== undefined) {
      text += `\nExecution time: ${result.executionTime.toFixed(2)}s`;
    }

    return {
      content: [
        {
          type: 'text',
          text: text.trimEnd(),
        },
      ],
    };
  }
}

export const batchSpawnTool = new BatchSpawnTool().toMCPTool();