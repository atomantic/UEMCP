// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { ActorSpawnTool } from '../../../src/tools/actors/spawn.js';
// Also test the barrel export
import { actorSpawnTool } from '../../../src/tools/actors/index.js';

describe('ActorSpawnTool', () => {
  let tool: ActorSpawnTool;

  beforeEach(() => {
    tool = new ActorSpawnTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('actor_spawn');
      expect(definition.description).toContain('Spawn an actor in the level');
      expect(definition.description).toContain('Location [X,Y,Z]');
    });

    it('should have proper input schema', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      expect(schema.properties?.assetPath).toEqual({
        type: 'string',
        description: 'Asset path (e.g., /Game/Meshes/SM_Wall01)',
      });
      expect(schema.required).toContain('assetPath');
    });

    it('should have optional location parameter with correct format', () => {
      const locationProp = (tool.definition.inputSchema as any).properties?.location;
      expect(locationProp?.type).toBe('array');
      expect(locationProp?.items?.type).toBe('number');
      expect(locationProp?.minItems).toBe(3);
      expect(locationProp?.maxItems).toBe(3);
      expect(locationProp?.default).toEqual([0, 0, 0]);
    });

    it('should have optional rotation parameter with correct format', () => {
      const rotationProp = (tool.definition.inputSchema as any).properties?.rotation;
      expect(rotationProp?.type).toBe('array');
      expect(rotationProp?.items?.type).toBe('number');
      expect(rotationProp?.minItems).toBe(3);
      expect(rotationProp?.maxItems).toBe(3);
      expect(rotationProp?.default).toEqual([0, 0, 0]);
    });
  });

  describe('execute', () => {
    it('should call executePythonCommand with correct command and args', async () => {
      const args = {
        assetPath: '/Game/Meshes/SM_Wall',
        location: [100, 200, 0] as [number, number, number],
        rotation: [0, 0, 90] as [number, number, number],
        name: 'TestWall',
        validate: true,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'TestWall',
        location: [100, 200, 0],
        rotation: [0, 0, 90],
        validated: true,
      });

      await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor.spawn',
        params: args
      });
    });

    it('should handle successful spawn with validation', async () => {
      const args = { assetPath: '/Game/Meshes/SM_Wall', validate: true };
      
      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'SM_Wall_1',
        location: [0, 0, 0],
        rotation: [0, 0, 0],
        assetPath: '/Game/Meshes/SM_Wall',
        validated: true,
        validation_errors: [],
        validation_warnings: [],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Spawned actor:');
      expect(result.content[0].text).toContain('SM_Wall_1');
      expect(result.content[0].text).toContain('✓ Passed');
    });

    it('should handle spawn with validation warnings', async () => {
      const args = { assetPath: '/Game/Meshes/SM_Wall', validate: true };
      
      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'SM_Wall_1',
        location: [0, 0, 0],
        rotation: [0, 0, 0],
        assetPath: '/Game/Meshes/SM_Wall',
        validated: true,
        validation_errors: [],
        validation_warnings: ['Actor placed outside visible area'],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Validation Warnings:');
      expect(result.content[0].text).toContain('Actor placed outside visible area');
    });

    it('should handle spawn without validation', async () => {
      const args = { assetPath: '/Game/Meshes/SM_Wall', validate: false };
      
      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'SM_Wall_1',
        location: [0, 0, 0],
        rotation: [0, 0, 0],
        assetPath: '/Game/Meshes/SM_Wall',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Spawned actor:');
      expect(result.content[0].text).not.toContain('Validation');
    });

    it('should throw error when spawn fails', async () => {
      const args = { assetPath: '/Game/NonExistent/Asset' };
      
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Asset not found: /Game/NonExistent/Asset',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Asset not found: /Game/NonExistent/Asset'
      );
    });

    it('should use default values when optional parameters not provided', async () => {
      const args = { assetPath: '/Game/Meshes/SM_Wall' };
      
      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'SM_Wall_1',
        location: [0, 0, 0],
        rotation: [0, 0, 0],
        assetPath: '/Game/Meshes/SM_Wall',
      });

      await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor.spawn',
        params: args
      });
    });

    it('should handle folder parameter correctly', async () => {
      const args = { 
        assetPath: '/Game/Meshes/SM_Wall',
        folder: 'Buildings/Walls',
      };
      
      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'SM_Wall_1',
        location: [0, 0, 0],
        rotation: [0, 0, 0],
        assetPath: '/Game/Meshes/SM_Wall',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor.spawn',
        params: args
      });
      expect(result.content[0].text).toContain('✓ Spawned actor:');
    });
  });

  describe('barrel export', () => {
    it('should export actorSpawnTool from index', () => {
      expect(actorSpawnTool).toBeDefined();
      expect(actorSpawnTool.definition.name).toBe('actor_spawn');
    });
  });
});