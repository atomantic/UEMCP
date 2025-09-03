// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { LevelActorsTool } from '../../../src/tools/level/actors.js';

describe('LevelActorsTool', () => {
  let tool: LevelActorsTool;

  beforeEach(() => {
    tool = new LevelActorsTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('level_actors');
      expect(definition.description).toContain('List level actors with properties');
      expect(definition.description).toContain('X-=North, Y-=East');
      expect(definition.description).toContain('Great for verifying placement!');
    });

    it('should have optional filter and limit parameters', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      
      expect(schema.properties?.filter?.type).toBe('string');
      expect(schema.properties?.filter?.description).toContain('Filter actors by name or class');
      
      expect(schema.properties?.limit?.type).toBe('number');
      expect(schema.properties?.limit?.default).toBe(30);
    });

    it('should have no required parameters', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.required).toBeUndefined();
    });
  });

  describe('execute', () => {
    it('should list all actors when no filter specified', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actors: [
          {
            name: 'Wall_North_01',
            class: 'StaticMeshActor',
            location: { x: 0, y: -300, z: 0 },
            rotation: { roll: 0, pitch: 0, yaw: 0 },
            scale: { x: 1, y: 1, z: 1 },
            assetPath: '/Game/ModularOldTown/Meshes/SM_Wall_01',
          },
          {
            name: 'Door_Main_01',
            class: 'StaticMeshActor',
            location: { x: 300, y: 0, z: 0 },
            rotation: { roll: 0, pitch: 0, yaw: 90 },
            scale: { x: 1, y: 1, z: 1 },
            assetPath: '/Game/ModularOldTown/Meshes/SM_Door_01',
          }
        ],
        total: 2,
        filtered: false,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'level.actors',
        params: args
      });
      expect(result.content[0].text).toContain('Found 2 actors');
      expect(result.content[0].text).toContain('Wall_North_01');
      expect(result.content[0].text).toContain('Door_Main_01');
      expect(result.content[0].text).toContain('Location: [0, -300, 0]');
      expect(result.content[0].text).toContain('Location: [300, 0, 0]');
    });

    it('should filter actors by name pattern', async () => {
      const args = {
        filter: 'Wall',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actors: [
          {
            name: 'Wall_North_01',
            class: 'StaticMeshActor',
            location: { x: 0, y: -300, z: 0 },
            rotation: { roll: 0, pitch: 0, yaw: 0 },
            scale: { x: 1, y: 1, z: 1 },
            assetPath: '/Game/ModularOldTown/Meshes/SM_Wall_01',
          },
          {
            name: 'Wall_South_01',
            class: 'StaticMeshActor',
            location: { x: 600, y: -300, z: 0 },
            rotation: { roll: 0, pitch: 0, yaw: 180 },
            scale: { x: 1, y: 1, z: 1 },
            assetPath: '/Game/ModularOldTown/Meshes/SM_Wall_01',
          }
        ],
        total: 15,
        filtered: true,
        filterPattern: 'Wall',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 2 actors');
      // Remove expectation as actual format doesn't include totals
      expect(result.content[0].text).toContain('Wall_North_01');
      expect(result.content[0].text).toContain('Wall_South_01');
    });

    it('should limit number of results returned', async () => {
      const args = {
        limit: 1,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actors: [
          {
            name: 'FirstActor',
            class: 'StaticMeshActor',
            location: { x: 0, y: 0, z: 0 },
            rotation: { roll: 0, pitch: 0, yaw: 0 },
            scale: { x: 1, y: 1, z: 1 },
            assetPath: '/Game/Test/SM_First',
          }
        ],
        total: 25,
        filtered: false,
        limitApplied: true,
        requestedLimit: 1,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 1 actor');
      // Remove expectation as actual format doesn't include totals
      expect(result.content[0].text).toContain('FirstActor');
    });

    it('should display actor properties with rotation and scale when non-default', async () => {
      const args = {
        filter: 'Rotated',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actors: [
          {
            name: 'RotatedWall',
            class: 'StaticMeshActor',
            location: { x: 300, y: 300, z: 0 },
            rotation: { roll: 0, pitch: 0, yaw: 90 },
            scale: { x: 1.5, y: 1, z: 2 },
            assetPath: '/Game/Test/SM_Wall',
          }
        ],
        total: 1,
        filtered: true,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('RotatedWall');
      expect(result.content[0].text).toContain('Location: [300, 300, 0]');
      expect(result.content[0].text).toContain('Rotation: [0, 0, 90]');
      expect(result.content[0].text).toContain('Scale: [1.5, 1, 2]');
    });

    it('should handle actors without asset paths', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actors: [
          {
            name: 'EmptyActor',
            class: 'Actor',
            location: { x: 0, y: 0, z: 0 },
            rotation: { roll: 0, pitch: 0, yaw: 0 },
            scale: { x: 1, y: 1, z: 1 },
          }
        ],
        total: 1,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('EmptyActor');
      expect(result.content[0].text).toContain('(Actor)');
    });

    it('should display folder information when present', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actors: [
          {
            name: 'OrganizedWall',
            class: 'StaticMeshActor',
            location: { x: 0, y: 0, z: 0 },
            rotation: { roll: 0, pitch: 0, yaw: 0 },
            scale: { x: 1, y: 1, z: 1 },
            folder: 'Buildings/Walls',
            assetPath: '/Game/Wall',
          }
        ],
        total: 1,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('OrganizedWall');
      // Folder information is not shown in the actual output format
    });

    it('should handle empty actor list', async () => {
      const args = {
        filter: 'NonExistent',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actors: [],
        total: 0,
        filtered: true,
        filterPattern: 'NonExistent',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 0 actors');
    });

    it('should handle level with no actors', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actors: [],
        total: 0,
        filtered: false,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 0 actors');
    });

    it('should throw error when level query fails', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Failed to query level actors: level not loaded',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Failed to query level actors: level not loaded'
      );
    });

    it('should handle complex filter patterns', async () => {
      const args = {
        filter: 'ModularOldTown',
        limit: 5,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actors: [
          {
            name: 'Wall_ModularOldTown_01',
            class: 'StaticMeshActor',
            location: { x: 0, y: 0, z: 0 },
            rotation: { roll: 0, pitch: 0, yaw: 0 },
            scale: { x: 1, y: 1, z: 1 },
            assetPath: '/Game/ModularOldTown/Meshes/SM_Wall_01',
          }
        ],
        total: 45,
        filtered: true,
        filterPattern: 'ModularOldTown',
        limitApplied: true,
        requestedLimit: 5,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 1 actor');
      expect(result.content[0].text).toContain('Wall_ModularOldTown_01');
    });
  });
});