// Mock the Python bridge
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { BatchSpawnTool } from '../../../src/tools/actors/batch-spawn.js';

describe('BatchSpawnTool', () => {
  let tool: BatchSpawnTool;

  beforeEach(() => {
    tool = new BatchSpawnTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('batch_spawn');
      expect(definition.description).toContain('Spawn multiple actors efficiently in a single operation');
      expect(definition.description).toContain('Reduces overhead and improves performance');
      expect(definition.description).toContain('validation may add 0.5-2 seconds');
    });

    it('should have proper input schema', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      expect(schema.required).toEqual(['actors']);
      
      expect(schema.properties.actors.type).toBe('array');
      expect(schema.properties.actors.description).toContain('Array of actors to spawn');
      
      const actorSchema = schema.properties.actors.items;
      expect(actorSchema.type).toBe('object');
      expect(actorSchema.required).toEqual(['assetPath']);
      
      expect(actorSchema.properties.assetPath.type).toBe('string');
      expect(actorSchema.properties.location.type).toBe('array');
      expect(actorSchema.properties.rotation.type).toBe('array');
      expect(actorSchema.properties.scale.type).toBe('array');
      expect(actorSchema.properties.name?.type).toBe('string');
      expect(actorSchema.properties.folder?.type).toBe('string');
      
      expect(schema.properties.commonFolder?.type).toBe('string');
      expect(schema.properties.validate?.type).toBe('boolean');
    });

    it('should have proper array constraints for location, rotation, and scale', () => {
      const schema = tool.definition.inputSchema as any;
      const actorSchema = schema.properties.actors.items;
      
      ['location', 'rotation', 'scale'].forEach(prop => {
        expect(actorSchema.properties[prop].minItems).toBe(3);
        expect(actorSchema.properties[prop].maxItems).toBe(3);
        expect(actorSchema.properties[prop].items.type).toBe('number');
      });
    });
  });

  describe('execute', () => {
    it('should throw error when no actors provided', async () => {
      await expect(tool.toMCPTool().handler({ actors: [] }))
        .rejects.toThrow('No actors provided to spawn');
    });

    it('should spawn single actor successfully', async () => {
      const args = {
        actors: [
          { assetPath: '/Game/Meshes/SM_Wall' }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        spawnedActors: [
          {
            name: 'SM_Wall_1',
            assetPath: '/Game/Meshes/SM_Wall',
            location: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        ],
        failedSpawns: [],
        totalRequested: 1,
        executionTime: 0.15
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor_batch_spawn',
        params: {
          actors: args.actors,
          commonFolder: undefined,
          validate: true
        }
      });

      expect(result.content[0].text).toContain('Batch Spawn Results: 1/1 actors spawned successfully');
      expect(result.content[0].text).toContain('Successfully spawned:');
      expect(result.content[0].text).toContain('✓ SM_Wall_1 at [0, 0, 0]');
      expect(result.content[0].text).toContain('Execution time: 0.15s');
    });

    it('should spawn multiple actors successfully', async () => {
      const args = {
        actors: [
          { 
            assetPath: '/Game/Meshes/SM_Wall',
            location: [100, 0, 0],
            name: 'NorthWall'
          },
          { 
            assetPath: '/Game/Meshes/SM_Wall',
            location: [0, 100, 0],
            rotation: [0, 0, 90],
            name: 'EastWall'
          },
          { 
            assetPath: '/Game/Meshes/SM_Door',
            location: [50, 50, 0],
            scale: [1.2, 1.2, 1.2]
          }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        spawnedActors: [
          {
            name: 'NorthWall',
            assetPath: '/Game/Meshes/SM_Wall',
            location: [100, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          },
          {
            name: 'EastWall',
            assetPath: '/Game/Meshes/SM_Wall',
            location: [0, 100, 0],
            rotation: [0, 0, 90],
            scale: [1, 1, 1]
          },
          {
            name: 'SM_Door_1',
            assetPath: '/Game/Meshes/SM_Door',
            location: [50, 50, 0],
            rotation: [0, 0, 0],
            scale: [1.2, 1.2, 1.2]
          }
        ],
        failedSpawns: [],
        totalRequested: 3,
        executionTime: 0.45
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Batch Spawn Results: 3/3 actors spawned successfully');
      expect(result.content[0].text).toContain('✓ NorthWall at [100, 0, 0]');
      expect(result.content[0].text).toContain('✓ EastWall at [0, 100, 0]');
      expect(result.content[0].text).toContain('✓ SM_Door_1 at [50, 50, 0]');
      expect(result.content[0].text).toContain('Execution time: 0.45s');
    });

    it('should handle partial failures', async () => {
      const args = {
        actors: [
          { assetPath: '/Game/Meshes/SM_Wall' },
          { assetPath: '/Game/Invalid/Asset' },
          { assetPath: '/Game/Meshes/SM_Door' }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        spawnedActors: [
          {
            name: 'SM_Wall_1',
            assetPath: '/Game/Meshes/SM_Wall',
            location: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          },
          {
            name: 'SM_Door_1',
            assetPath: '/Game/Meshes/SM_Door',
            location: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        ],
        failedSpawns: [
          {
            assetPath: '/Game/Invalid/Asset',
            error: 'Asset not found'
          }
        ],
        totalRequested: 3,
        executionTime: 0.32
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Batch Spawn Results: 2/3 actors spawned successfully');
      expect(result.content[0].text).toContain('Successfully spawned:');
      expect(result.content[0].text).toContain('✓ SM_Wall_1');
      expect(result.content[0].text).toContain('✓ SM_Door_1');
      expect(result.content[0].text).toContain('Failed to spawn:');
      expect(result.content[0].text).toContain('✗ /Game/Invalid/Asset: Asset not found');
    });

    it('should handle complete failure', async () => {
      const args = {
        actors: [
          { assetPath: '/Game/Invalid/Asset1' },
          { assetPath: '/Game/Invalid/Asset2' }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        spawnedActors: [],
        failedSpawns: [
          {
            assetPath: '/Game/Invalid/Asset1',
            error: 'Asset not found'
          },
          {
            assetPath: '/Game/Invalid/Asset2',
            error: 'Invalid asset path'
          }
        ],
        totalRequested: 2,
        executionTime: 0.12
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Batch Spawn Results: 0/2 actors spawned successfully');
      expect(result.content[0].text).not.toContain('Successfully spawned:');
      expect(result.content[0].text).toContain('Failed to spawn:');
      expect(result.content[0].text).toContain('✗ /Game/Invalid/Asset1: Asset not found');
      expect(result.content[0].text).toContain('✗ /Game/Invalid/Asset2: Invalid asset path');
    });

    it('should use commonFolder parameter', async () => {
      const args = {
        actors: [
          { assetPath: '/Game/Meshes/SM_Wall' }
        ],
        commonFolder: 'Building/Walls'
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        spawnedActors: [
          {
            name: 'SM_Wall_1',
            assetPath: '/Game/Meshes/SM_Wall',
            location: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        ],
        failedSpawns: []
      });

      await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor_batch_spawn',
        params: {
          actors: args.actors,
          commonFolder: 'Building/Walls',
          validate: true
        }
      });
    });

    it('should use validate parameter (false)', async () => {
      const args = {
        actors: [
          { assetPath: '/Game/Meshes/SM_Wall' }
        ],
        validate: false
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        spawnedActors: [
          {
            name: 'SM_Wall_1',
            assetPath: '/Game/Meshes/SM_Wall',
            location: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        ],
        failedSpawns: []
      });

      await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor_batch_spawn',
        params: {
          actors: args.actors,
          commonFolder: undefined,
          validate: false
        }
      });
    });

    it('should default validate to true when not provided', async () => {
      const args = {
        actors: [
          { assetPath: '/Game/Meshes/SM_Wall' }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        spawnedActors: [
          {
            name: 'SM_Wall_1',
            assetPath: '/Game/Meshes/SM_Wall',
            location: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        ],
        failedSpawns: []
      });

      await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor_batch_spawn',
        params: {
          actors: args.actors,
          commonFolder: undefined,
          validate: true
        }
      });
    });

    it('should handle actors without location information', async () => {
      const args = {
        actors: [
          { assetPath: '/Game/Meshes/SM_Wall' }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        spawnedActors: [
          {
            name: 'SM_Wall_1',
            assetPath: '/Game/Meshes/SM_Wall',
            location: undefined,
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        ],
        failedSpawns: []
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ SM_Wall_1');
      expect(result.content[0].text).not.toContain(' at [');
    });

    it('should handle empty spawned actors and failed spawns', async () => {
      const args = {
        actors: [
          { assetPath: '/Game/Meshes/SM_Wall' }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        spawnedActors: [],
        failedSpawns: [],
        totalRequested: 1
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Batch Spawn Results: 0/0 actors spawned successfully');
      expect(result.content[0].text).not.toContain('Successfully spawned:');
      expect(result.content[0].text).not.toContain('Failed to spawn:');
      expect(result.content[0].text).not.toContain('Execution time:');
    });

    it('should handle missing result properties gracefully', async () => {
      const args = {
        actors: [
          { assetPath: '/Game/Meshes/SM_Wall' }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true
        // Missing spawnedActors, failedSpawns, etc.
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Batch Spawn Results: 0/0 actors spawned successfully');
    });

    it('should handle large execution times', async () => {
      const args = {
        actors: [
          { assetPath: '/Game/Meshes/SM_Wall' }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        spawnedActors: [
          {
            name: 'SM_Wall_1',
            assetPath: '/Game/Meshes/SM_Wall',
            location: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        ],
        failedSpawns: [],
        executionTime: 15.678
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Execution time: 15.68s');
    });

    it('should handle zero execution time', async () => {
      const args = {
        actors: [
          { assetPath: '/Game/Meshes/SM_Wall' }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        spawnedActors: [
          {
            name: 'SM_Wall_1',
            assetPath: '/Game/Meshes/SM_Wall',
            location: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        ],
        failedSpawns: [],
        executionTime: 0
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Execution time: 0.00s');
    });

    it('should throw error when Python command fails', async () => {
      const args = {
        actors: [
          { assetPath: '/Game/Meshes/SM_Wall' }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Failed to spawn actors: Connection timeout'
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Failed to spawn actors: Connection timeout'
      );
    });

    it('should throw error when Python command fails without error message', async () => {
      const args = {
        actors: [
          { assetPath: '/Game/Meshes/SM_Wall' }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: false
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Failed to execute batch_spawn: Command actor_batch_spawn failed'
      );
    });

    it('should handle complex spawn configurations', async () => {
      const args = {
        actors: [
          {
            assetPath: '/Game/Building/SM_Wall',
            location: [300, 0, 0],
            rotation: [0, 0, 90],
            scale: [1.5, 1, 2],
            name: 'CustomWall',
            folder: 'Building/Walls'
          },
          {
            assetPath: '/Game/Building/SM_Corner',
            location: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            name: 'Corner1',
            folder: 'Building/Corners'
          }
        ],
        commonFolder: 'MyBuilding',
        validate: false
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        spawnedActors: [
          {
            name: 'CustomWall',
            assetPath: '/Game/Building/SM_Wall',
            location: [300, 0, 0],
            rotation: [0, 0, 90],
            scale: [1.5, 1, 2]
          },
          {
            name: 'Corner1',
            assetPath: '/Game/Building/SM_Corner',
            location: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1]
          }
        ],
        failedSpawns: [],
        totalRequested: 2,
        executionTime: 0.28
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor_batch_spawn',
        params: {
          actors: args.actors,
          commonFolder: 'MyBuilding',
          validate: false
        }
      });

      expect(result.content[0].text).toContain('Batch Spawn Results: 2/2 actors spawned successfully');
      expect(result.content[0].text).toContain('✓ CustomWall at [300, 0, 0]');
      expect(result.content[0].text).toContain('✓ Corner1 at [0, 0, 0]');
    });
  });
});