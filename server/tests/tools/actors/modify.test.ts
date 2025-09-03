// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { ActorModifyTool } from '../../../src/tools/actors/modify.js';

describe('ActorModifyTool', () => {
  let tool: ActorModifyTool;

  beforeEach(() => {
    tool = new ActorModifyTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('actor_modify');
      expect(definition.description).toContain('Modify actor properties');
      expect(definition.description).toContain('Move:');
      expect(definition.description).toContain('Rotate:');
    });

    it('should have proper input schema with required actorName', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      expect(schema.properties?.actorName).toEqual({
        type: 'string',
        description: 'Name of the actor to modify',
      });
      expect(schema.required).toContain('actorName');
    });

    it('should have optional location, rotation, scale parameters', () => {
      const schema = tool.definition.inputSchema as any;
      
      expect(schema.properties?.location?.type).toBe('array');
      expect(schema.properties?.location?.items?.type).toBe('number');
      
      expect(schema.properties?.rotation?.type).toBe('array');
      expect(schema.properties?.rotation?.items?.type).toBe('number');
      
      expect(schema.properties?.scale?.type).toBe('array');
      expect(schema.properties?.scale?.items?.type).toBe('number');
    });
  });

  describe('execute', () => {
    it('should modify actor location successfully', async () => {
      const args = {
        actorName: 'TestWall',
        location: [500, 300, 100] as [number, number, number],
        validate: true,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'TestWall',
        location: [500, 300, 100],
        validated: true,
        validation_errors: [],
        validation_warnings: [],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor.modify',
        params: args
      });
      expect(result.content[0].text).toContain('✓ Modified actor: TestWall');
      expect(result.content[0].text).toContain('TestWall');
      expect(result.content[0].text).toContain('- Location: [500, 300, 100]');
    });

    it('should modify actor rotation successfully', async () => {
      const args = {
        actorName: 'TestWall',
        rotation: [0, 0, 90] as [number, number, number],
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'TestWall',
        rotation: [0, 0, 90],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Modified actor: TestWall');
      expect(result.content[0].text).toContain('- Rotation: [0, 0, 90]°');
    });

    it('should modify actor scale successfully', async () => {
      const args = {
        actorName: 'TestWall',
        scale: [2, 1, 1.5] as [number, number, number],
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'TestWall',
        scale: [2, 1, 1.5],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Modified actor: TestWall');
      expect(result.content[0].text).toContain('- Scale: [2, 1, 1.5]');
    });

    it('should change actor mesh successfully', async () => {
      const args = {
        actorName: 'TestWall',
        mesh: '/Game/Meshes/SM_NewWall',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'TestWall',
        mesh: '/Game/Meshes/SM_NewWall',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Modified actor: TestWall');
      expect(result.content[0].text).toContain('- Mesh: /Game/Meshes/SM_NewWall');
    });

    it('should organize actor into folder successfully', async () => {
      const args = {
        actorName: 'TestWall',
        folder: 'Buildings/Walls',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'TestWall',
        folder: 'Buildings/Walls',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Modified actor: TestWall');
      expect(result.content[0].text).toContain('- Folder: Buildings/Walls');
    });

    it('should handle multiple modifications at once', async () => {
      const args = {
        actorName: 'TestWall',
        location: [100, 200, 0] as [number, number, number],
        rotation: [0, 0, 45] as [number, number, number],
        scale: [1.2, 1.2, 1.0] as [number, number, number],
        validate: true,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'TestWall',
        location: [100, 200, 0],
        rotation: [0, 0, 45],
        scale: [1.2, 1.2, 1.0],
        validated: true,
        validation_errors: [],
        validation_warnings: [],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('- Location: [100, 200, 0]');
      expect(result.content[0].text).toContain('- Rotation: [0, 0, 45]°');
      expect(result.content[0].text).toContain('- Scale: [1.2, 1.2, 1]');
      expect(result.content[0].text).toContain('Validation: ✓ Passed');
    });

    it('should handle validation warnings', async () => {
      const args = {
        actorName: 'TestWall',
        location: [10000, 10000, 0] as [number, number, number],
        validate: true,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'TestWall',
        location: [10000, 10000, 0],
        validated: true,
        validation_errors: [],
        validation_warnings: ['Actor moved outside typical play area'],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Validation Warnings:');
      expect(result.content[0].text).toContain('Actor moved outside typical play area');
    });

    it('should throw error when actor not found', async () => {
      const args = { actorName: 'NonExistentActor', location: [0, 0, 0] as [number, number, number] };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Actor not found: NonExistentActor',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Actor not found: NonExistentActor'
      );
    });

    it('should throw error when no modifications specified', async () => {
      const args = { actorName: 'TestWall' };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'No modifications specified',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'No modifications specified'
      );
    });
  });
});