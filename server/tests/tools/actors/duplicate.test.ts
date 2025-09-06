// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { ActorDuplicateTool } from '../../../src/tools/actors/duplicate.js';

describe('ActorDuplicateTool', () => {
  let tool: ActorDuplicateTool;

  beforeEach(() => {
    tool = new ActorDuplicateTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('actor_duplicate');
      expect(definition.description).toContain('Duplicate an existing actor');
      expect(definition.description).toContain('Perfect for building floors/sections');
    });

    it('should have proper input schema with required sourceName', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      expect(schema.properties?.sourceName).toEqual({
        type: 'string',
        description: 'Name of the actor to duplicate',
      });
      expect(schema.required).toContain('sourceName');
    });

    it('should have optional offset parameter', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.properties?.offset?.type).toBe('object');
      expect(schema.properties?.offset?.properties?.x?.default).toBe(0);
      expect(schema.properties?.offset?.properties?.y?.default).toBe(0);
      expect(schema.properties?.offset?.properties?.z?.default).toBe(0);
    });

    it('should have optional name and validate parameters', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.properties?.name?.type).toBe('string');
      expect(schema.properties?.validate?.type).toBe('boolean');
      expect(schema.properties?.validate?.default).toBe(true);
    });
  });

  describe('execute', () => {
    it('should duplicate actor successfully with default name', async () => {
      const args = {
        sourceName: 'Wall_F1',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        sourceName: 'Wall_F1',
        duplicatedName: 'Wall_F1_Copy',
        location: [300, 0, 0],
        validated: true,
        validation_errors: [],
        validation_warnings: [],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor.duplicate',
        params: args
      });
      expect(result.content[0].text).toContain('✓ Duplicated actor:');
      expect(result.content[0].text).toContain('Wall_F1_Copy');
      expect(result.content[0].text).toContain('Validation: ✓ Passed');
    });

    it('should duplicate actor with custom name and offset', async () => {
      const args = {
        sourceName: 'Wall_F1',
        name: 'Wall_F2',
        offset: { x: 0, y: 0, z: 300 },
        validate: true,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        sourceName: 'Wall_F1',
        duplicatedName: 'Wall_F2',
        location: [0, 0, 300],
        offset: { x: 0, y: 0, z: 300 },
        validated: true,
        validation_errors: [],
        validation_warnings: [],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Duplicated actor:');
      expect(result.content[0].text).toContain('Wall_F2');
      expect(result.content[0].text).toContain('Offset: [0, 0, 300]');
    });

    it('should duplicate actor without validation', async () => {
      const args = {
        sourceName: 'Wall_F1',
        name: 'Wall_F2',
        validate: false,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        sourceName: 'Wall_F1',
        duplicatedName: 'Wall_F2',
        location: [0, 0, 0],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Duplicated actor:');
      expect(result.content[0].text).not.toContain('Validation');
    });

    it('should handle validation warnings', async () => {
      const args = {
        sourceName: 'ComplexActor',
        validate: true,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        sourceName: 'ComplexActor',
        duplicatedName: 'ComplexActor_Copy',
        location: [0, 0, 0],
        validated: true,
        validation_errors: [],
        validation_warnings: ['Duplicated actor may overlap with existing geometry'],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Validation Warnings:');
      expect(result.content[0].text).toContain('Duplicated actor may overlap with existing geometry');
    });

    it('should handle validation errors', async () => {
      const args = {
        sourceName: 'BlueprintActor',
        validate: true,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        sourceName: 'BlueprintActor',
        duplicatedName: 'BlueprintActor_Copy',
        location: [0, 0, 0],
        validated: false,
        validation_errors: ['Blueprint instance cannot be duplicated safely'],
        validation_warnings: [],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Validation: ✗ Failed');
      expect(result.content[0].text).toContain('Blueprint instance cannot be duplicated safely');
    });

    it('should throw error when source actor not found', async () => {
      const args = { sourceName: 'NonExistentActor' };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Source actor not found: NonExistentActor',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Source actor not found: NonExistentActor'
      );
    });

    it('should throw error when duplication fails', async () => {
      const args = { sourceName: 'ProtectedActor' };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Cannot duplicate protected actor: ProtectedActor',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Cannot duplicate protected actor: ProtectedActor'
      );
    });

    it('should handle complex offset calculations', async () => {
      const args = {
        sourceName: 'Wall_Ground',
        name: 'Wall_Floor2',
        offset: { x: 100, y: -50, z: 400 },
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        sourceName: 'Wall_Ground',
        duplicatedName: 'Wall_Floor2',
        location: [100, -50, 400],
        offset: { x: 100, y: -50, z: 400 },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Offset: [100, -50, 400]');
      expect(result.content[0].text).toContain('Wall_Floor2');
    });
  });
});