// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { MaterialListTool } from '../../../src/tools/materials/list.js';
// Also test the barrel export
import { materialListTool } from '../../../src/tools/materials/index.js';

describe('MaterialListTool', () => {
  let tool: MaterialListTool;

  beforeEach(() => {
    tool = new MaterialListTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('material_list');
      expect(definition.description).toContain('List materials with optional filtering');
      expect(definition.description).toContain('Examples:');
    });

    it('should have proper input schema with default values', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      
      expect(schema.properties?.path?.type).toBe('string');
      expect(schema.properties?.path?.default).toBe('/Game');
      
      expect(schema.properties?.pattern?.type).toBe('string');
      expect(schema.properties?.pattern?.description).toContain('Filter materials by name pattern');
      
      expect(schema.properties?.limit?.type).toBe('number');
      expect(schema.properties?.limit?.default).toBe(50);
    });

    it('should have no required parameters', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.required).toBeUndefined();
    });
  });

  describe('execute', () => {
    it('should list all materials when no filters specified', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materials: [
          {
            name: 'M_Wall_Material',
            path: '/Game/Materials/M_Wall_Material',
            type: 'Material',
            parentMaterial: null,
          },
          {
            name: 'MI_Stone_Instance',
            path: '/Game/Materials/Instances/MI_Stone_Instance',
            type: 'MaterialInstance',
            parentMaterial: '/Game/Materials/M_Base_Material',
          }
        ],
        total: 2,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'material.list_materials',
        params: args
      });
      expect(result.content[0].text).toContain('Found 2 materials');
      expect(result.content[0].text).toContain('M_Wall_Material');
      expect(result.content[0].text).toContain('MI_Stone_Instance');
      expect(result.content[0].text).toContain('/Game/Materials/');
    });

    it('should filter materials by path', async () => {
      const args = {
        path: '/Game/Materials/Stone',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materials: [
          {
            name: 'M_Stone_Base',
            path: '/Game/Materials/Stone/M_Stone_Base',
            type: 'Material',
            parentMaterial: null,
          }
        ],
        total: 1,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 1 material');
      expect(result.content[0].text).toContain('M_Stone_Base');
    });

    it('should filter materials by name pattern', async () => {
      const args = {
        pattern: 'sand',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materials: [
          {
            name: 'M_Sand_Material',
            path: '/Game/Materials/M_Sand_Material',
            type: 'Material',
            parentMaterial: null,
          },
          {
            name: 'MI_Sand_Wet',
            path: '/Game/Materials/MI_Sand_Wet',
            type: 'MaterialInstance',
            parentMaterial: '/Game/Materials/M_Sand_Material',
          }
        ],
        total: 2,
        filtered: true,
        filterPattern: 'sand',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 2 materials');
      expect(result.content[0].text).toContain('M_Sand_Material');
      expect(result.content[0].text).toContain('MI_Sand_Wet');
    });

    it('should limit number of results returned', async () => {
      const args = {
        limit: 1,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materials: [
          {
            name: 'M_First_Material',
            path: '/Game/Materials/M_First_Material',
            type: 'Material',
            parentMaterial: null,
          }
        ],
        total: 1,
        limitApplied: true,
        requestedLimit: 1,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 1 material');
      expect(result.content[0].text).toContain('M_First_Material');
    });

    it('should distinguish between Materials and MaterialInstances', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materials: [
          {
            name: 'M_Base_Material',
            path: '/Game/Materials/M_Base_Material',
            type: 'Material',
            parentMaterial: null,
          },
          {
            name: 'MI_Derived_Instance',
            path: '/Game/Materials/MI_Derived_Instance',
            type: 'MaterialInstance',
            parentMaterial: '/Game/Materials/M_Base_Material',
          }
        ],
        total: 2,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('M_Base_Material');
      expect(result.content[0].text).toContain('MI_Derived_Instance');
      expect(result.content[0].text).toContain('Material');
      expect(result.content[0].text).toContain('MaterialInstance');
    });

    it('should handle empty results', async () => {
      const args = {
        pattern: 'nonexistent',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materials: [],
        total: 0,
        filtered: true,
        filterPattern: 'nonexistent',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 0 materials');
      expect(result.content[0].text).toContain('No materials found');
    });

    it('should throw error when material listing fails', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Failed to access material registry',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Failed to access material registry'
      );
    });

    it('should use default values when optional parameters not provided', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materials: [],
        total: 0,
      });

      await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'material.list_materials',
        params: args
      });
    });

    it('should handle complex material hierarchy', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materials: [
          {
            name: 'M_Master_Material',
            path: '/Game/Materials/M_Master_Material',
            type: 'Material',
            parentMaterial: null,
          },
          {
            name: 'MI_Child_Instance',
            path: '/Game/Materials/MI_Child_Instance',
            type: 'MaterialInstance',
            parentMaterial: '/Game/Materials/M_Master_Material',
          },
          {
            name: 'MI_Grandchild_Instance',
            path: '/Game/Materials/MI_Grandchild_Instance',
            type: 'MaterialInstance',
            parentMaterial: '/Game/Materials/MI_Child_Instance',
          }
        ],
        total: 3,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('M_Master_Material');
      expect(result.content[0].text).toContain('MI_Child_Instance');
      expect(result.content[0].text).toContain('MI_Grandchild_Instance');
    });
  });

  describe('barrel export', () => {
    it('should export materialListTool from index', () => {
      expect(materialListTool).toBeDefined();
      expect(materialListTool.definition.name).toBe('material_list');
    });
  });
});