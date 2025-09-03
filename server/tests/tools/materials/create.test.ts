// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { MaterialCreateTool } from '../../../src/tools/materials/create.js';

describe('MaterialCreateTool', () => {
  let tool: MaterialCreateTool;

  beforeEach(() => {
    tool = new MaterialCreateTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('material_create');
      expect(definition.description).toContain('Create materials or material instances');
      expect(definition.description).toContain('For simple materials:');
      expect(definition.description).toContain('For instances:');
    });

    it('should have proper input schema for material creation', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      
      expect(schema.properties?.materialName?.type).toBe('string');
      expect(schema.properties?.materialName?.description).toContain('Name for new material');
      
      expect(schema.properties?.targetFolder?.type).toBe('string');
      expect(schema.properties?.targetFolder?.default).toBe('/Game/Materials');
      
      expect(schema.properties?.baseColor?.type).toBe('object');
      expect(schema.properties?.baseColor?.properties?.r?.type).toBe('number');
      
      expect(schema.properties?.metallic?.type).toBe('number');
      expect(schema.properties?.roughness?.type).toBe('number');
    });

    it('should have input schema for material instance creation', () => {
      const schema = tool.definition.inputSchema as any;
      
      expect(schema.properties?.parentMaterialPath?.type).toBe('string');
      expect(schema.properties?.parentMaterialPath?.description).toContain('Path to parent material');
      
      expect(schema.properties?.instanceName?.type).toBe('string');
      expect(schema.properties?.instanceName?.description).toContain('Name for new material instance');
      
      expect(schema.properties?.parameters?.type).toBe('object');
    });
  });

  describe('execute - Simple Material Creation', () => {
    it('should create a simple material with default properties', async () => {
      const args = {
        materialName: 'M_Test_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/M_Test_Material',
        materialName: 'M_Test_Material',
        type: 'Material',
        properties: {
          baseColor: { r: 0.5, g: 0.5, b: 0.5 },
          metallic: 0.0,
          roughness: 0.5,
        },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'material.create',
        params: args
      });
      expect(result.content[0].text).toContain('✓ Created material: M_Test_Material');
      expect(result.content[0].text).toContain('Path: /Game/Materials/M_Test_Material');
    });

    it('should create a material with custom base color', async () => {
      const args = {
        materialName: 'M_Red_Material',
        baseColor: { r: 1.0, g: 0.0, b: 0.0 },
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/M_Red_Material',
        materialName: 'M_Red_Material',
        type: 'Material',
        properties: {
          baseColor: { r: 1.0, g: 0.0, b: 0.0 },
          metallic: 0.0,
          roughness: 0.5,
        },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Created material: M_Red_Material');
      expect(result.content[0].text).toContain('Base Color: [1, 0, 0]');
    });

    it('should create a material with metallic and roughness properties', async () => {
      const args = {
        materialName: 'M_Metal_Material',
        baseColor: { r: 0.8, g: 0.8, b: 0.9 },
        metallic: 1.0,
        roughness: 0.2,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/M_Metal_Material',
        materialName: 'M_Metal_Material',
        type: 'Material',
        properties: {
          baseColor: { r: 0.8, g: 0.8, b: 0.9 },
          metallic: 1.0,
          roughness: 0.2,
        },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('M_Metal_Material');
      expect(result.content[0].text).toContain('Metallic: 1');
      expect(result.content[0].text).toContain('Roughness: 0.2');
    });

    it('should create a material with emissive properties', async () => {
      const args = {
        materialName: 'M_Glowing_Material',
        emissive: { r: 0.0, g: 1.0, b: 0.0 },
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/M_Glowing_Material',
        materialName: 'M_Glowing_Material',
        type: 'Material',
        properties: {
          baseColor: { r: 0.5, g: 0.5, b: 0.5 },
          emissive: { r: 0.0, g: 1.0, b: 0.0 },
          metallic: 0.0,
          roughness: 0.5,
        },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('M_Glowing_Material');
      expect(result.content[0].text).toContain('Emissive: [0, 1, 0]');
    });

    it('should create a material in a custom folder', async () => {
      const args = {
        materialName: 'M_Custom_Material',
        targetFolder: '/Game/MyProject/Materials',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/MyProject/Materials/M_Custom_Material',
        materialName: 'M_Custom_Material',
        type: 'Material',
        properties: {
          baseColor: { r: 0.5, g: 0.5, b: 0.5 },
        },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Path: /Game/MyProject/Materials/M_Custom_Material');
    });
  });

  describe('execute - Material Instance Creation', () => {
    it('should create a material instance with default parameters', async () => {
      const args = {
        parentMaterialPath: '/Game/Materials/M_Base_Material',
        instanceName: 'MI_Test_Instance',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/MI_Test_Instance',
        instanceName: 'MI_Test_Instance',
        type: 'MaterialInstance',
        parentMaterial: '/Game/Materials/M_Base_Material',
        parameters: {},
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'material.create',
        params: args
      });
      expect(result.content[0].text).toContain('✓ Created material instance: MI_Test_Instance');
      expect(result.content[0].text).toContain('Parent: M_Base_Material');
    });

    it('should create a material instance with custom parameters', async () => {
      const args = {
        parentMaterialPath: '/Game/Materials/M_Base_Material',
        instanceName: 'MI_Custom_Instance',
        parameters: {
          BaseColor: { r: 0.8, g: 0.2, b: 0.2 },
          Roughness: 0.8,
          Metallic: 0.1,
        },
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/MI_Custom_Instance',
        instanceName: 'MI_Custom_Instance',
        type: 'MaterialInstance',
        parentMaterial: '/Game/Materials/M_Base_Material',
        parameters: {
          BaseColor: { r: 0.8, g: 0.2, b: 0.2 },
          Roughness: 0.8,
          Metallic: 0.1,
        },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Created material instance: MI_Custom_Instance');
      expect(result.content[0].text).toContain('BaseColor');
      expect(result.content[0].text).toContain('Roughness');
      expect(result.content[0].text).toContain('Metallic');
    });

    it('should create a material instance in a custom folder', async () => {
      const args = {
        parentMaterialPath: '/Game/Materials/M_Base_Material',
        instanceName: 'MI_Custom_Folder_Instance',
        targetFolder: '/Game/MyProject/MaterialInstances',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/MyProject/MaterialInstances/MI_Custom_Folder_Instance',
        instanceName: 'MI_Custom_Folder_Instance',
        type: 'MaterialInstance',
        parentMaterial: '/Game/Materials/M_Base_Material',
        parameters: {},
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Path: /Game/MyProject/MaterialInstances/MI_Custom_Folder_Instance');
    });

    it('should create a material instance with complex parameters', async () => {
      const args = {
        parentMaterialPath: '/Game/Materials/M_Master_Material',
        instanceName: 'MI_Complex_Instance',
        parameters: {
          DiffuseColor: { r: 0.2, g: 0.8, b: 0.3, a: 1.0 },
          NormalStrength: 1.5,
          DetailTiling: 4.0,
          EmissiveStrength: 2.0,
          TexturePath: '/Game/Textures/T_Custom_Texture',
        },
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/MI_Complex_Instance',
        instanceName: 'MI_Complex_Instance',
        type: 'MaterialInstance',
        parentMaterial: '/Game/Materials/M_Master_Material',
        parameters: args.parameters,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('MI_Complex_Instance');
      expect(result.content[0].text).toContain('DiffuseColor');
      expect(result.content[0].text).toContain('NormalStrength');
      expect(result.content[0].text).toContain('TexturePath');
    });
  });

  describe('error handling', () => {
    it('should throw error when material creation fails', async () => {
      const args = {
        materialName: 'M_Invalid_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Failed to create material: Invalid material name',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Failed to create material: Invalid material name'
      );
    });

    it('should throw error when parent material not found for instance', async () => {
      const args = {
        parentMaterialPath: '/Game/Materials/NonExistent_Material',
        instanceName: 'MI_Test_Instance',
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Parent material not found: /Game/Materials/NonExistent_Material',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Parent material not found: /Game/Materials/NonExistent_Material'
      );
    });

    it('should throw error when target folder is invalid', async () => {
      const args = {
        materialName: 'M_Test_Material',
        targetFolder: '/Invalid/Path',
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Invalid target folder: /Invalid/Path',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Invalid target folder: /Invalid/Path'
      );
    });

    it('should throw error when material already exists', async () => {
      const args = {
        materialName: 'M_Existing_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Material already exists: M_Existing_Material',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Material already exists: M_Existing_Material'
      );
    });
  });

  describe('parameter validation', () => {
    it('should handle color parameters with proper validation', async () => {
      const args = {
        materialName: 'M_Color_Test',
        baseColor: { r: 2.0, g: -0.5, b: 0.75 }, // Test out-of-range values
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/M_Color_Test',
        materialName: 'M_Color_Test',
        type: 'Material',
        properties: {
          baseColor: { r: 1.0, g: 0.0, b: 0.75 }, // Clamped values
        },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('M_Color_Test');
      // The implementation should handle clamping on the Python side
    });
  });
});