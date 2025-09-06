// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { ActorDeleteTool } from '../../../src/tools/actors/delete.js';

describe('ActorDeleteTool', () => {
  let tool: ActorDeleteTool;

  beforeEach(() => {
    tool = new ActorDeleteTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('actor_delete');
      expect(definition.description).toContain('Delete an actor from the level');
    });

    it('should have proper input schema with required actorName', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      expect(schema.properties?.actorName).toEqual({
        type: 'string',
        description: 'Name of the actor to delete',
      });
      expect(schema.required).toContain('actorName');
    });

    it('should have optional validate parameter', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.properties?.validate?.type).toBe('boolean');
      expect(schema.properties?.validate?.default).toBe(true);
    });
  });

  describe('execute', () => {
    it('should delete actor successfully with validation', async () => {
      const args = {
        actorName: 'TestWall',
        validate: true,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        message: 'Deleted actor: TestWall',
        actorName: 'TestWall',
        validated: true,
        validation_errors: [],
        validation_warnings: [],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor.delete',
        params: args
      });
      expect(result.content[0].text).toContain('✓');
      expect(result.content[0].text).toContain('TestWall');
      expect(result.content[0].text).toContain('Validation: ✓ Passed');
    });

    it('should delete actor successfully without validation', async () => {
      const args = {
        actorName: 'TestWall',
        validate: false,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        message: 'Deleted actor: TestWall',
        actorName: 'TestWall',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓');
      expect(result.content[0].text).toContain('TestWall');
      expect(result.content[0].text).not.toContain('Validation');
    });

    it('should handle validation warnings', async () => {
      const args = {
        actorName: 'ImportantActor',
        validate: true,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        message: 'Deleted actor: ImportantActor',
        actorName: 'ImportantActor',
        validated: true,
        validation_errors: [],
        validation_warnings: ['This actor may be referenced by other objects'],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓');
      expect(result.content[0].text).toContain('Validation Warnings:');
      expect(result.content[0].text).toContain('This actor may be referenced by other objects');
    });

    it('should handle validation errors', async () => {
      const args = {
        actorName: 'CriticalActor',
        validate: true,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        message: 'Deleted actor: CriticalActor',
        actorName: 'CriticalActor',
        validated: false,
        validation_errors: ['Actor is part of a Blueprint instance'],
        validation_warnings: [],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓');
      expect(result.content[0].text).toContain('Validation: ✗ Failed');
      expect(result.content[0].text).toContain('Actor is part of a Blueprint instance');
    });

    it('should throw error when actor not found', async () => {
      const args = { actorName: 'NonExistentActor' };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Actor not found: NonExistentActor',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Actor not found: NonExistentActor'
      );
    });

    it('should throw error when deletion fails', async () => {
      const args = { actorName: 'ProtectedActor' };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Cannot delete protected actor: ProtectedActor',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Cannot delete protected actor: ProtectedActor'
      );
    });

    it('should use default validate parameter when not specified', async () => {
      const args = { actorName: 'TestWall' };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        message: 'Deleted actor: TestWall',
        actorName: 'TestWall',
        validated: true,
        validation_errors: [],
        validation_warnings: [],
      });

      await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor.delete',
        params: args
      });
    });
  });
});