// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { MaterialInfoTool } from '../../../src/tools/materials/info.js';

describe('MaterialInfoTool', () => {
  let tool: MaterialInfoTool;

  beforeEach(() => {
    tool = new MaterialInfoTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('material_info');
      expect(definition.description).toContain('Get detailed material information');
      expect(definition.description).toContain('parameters, properties, and parent material');
      expect(definition.description).toContain('Essential for understanding material configuration');
    });

    it('should have proper input schema with required materialPath', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      
      expect(schema.properties?.materialPath?.type).toBe('string');
      expect(schema.properties?.materialPath?.description).toContain('Path to the material');
      
      expect(schema.required).toContain('materialPath');
    });
  });

  describe('execute', () => {
    it('should get detailed information for a base material', async () => {
      const args = {
        materialPath: '/Game/Materials/M_Sand_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/M_Sand_Material',
        materialType: 'Material',
        name: 'M_Sand_Material',
        scalarParameters: [
          { name: 'Roughness', value: 0.8 },
          { name: 'Metallic', value: 0.0 }
        ],
        vectorParameters: [
          { name: 'BaseColor', value: { r: 0.8, g: 0.7, b: 0.5, a: 1.0 } }
        ],
        textureParameters: [
          { name: 'DiffuseTexture', texture: '/Game/Textures/T_Sand_Diffuse' },
          { name: 'NormalTexture', texture: '/Game/Textures/T_Sand_Normal' }
        ]
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'material.get_material_info',
        params: {
          material_path: '/Game/Materials/M_Sand_Material'
        }
      });
      expect(result.content[0].text).toContain('Material Information: /Game/Materials/M_Sand_Material');
      expect(result.content[0].text).toContain('Type: Material');
      expect(result.content[0].text).toContain('BaseColor: RGB(0.800, 0.700, 0.500)');
      expect(result.content[0].text).toContain('Roughness: 0.8');
      expect(result.content[0].text).toContain('DiffuseTexture: /Game/Textures/T_Sand_Diffuse');
    });

    it('should get information for a material instance with parent', async () => {
      const args = {
        materialPath: '/Game/Materials/MI_Sand_Wet',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/MI_Sand_Wet',
        materialType: 'MaterialInstance',
        name: 'MI_Sand_Wet',
        parentMaterial: '/Game/Materials/M_Sand_Material',
        scalarParameters: [
          { name: 'Roughness', value: 0.4 },
          { name: 'Wetness', value: 0.8 }
        ],
        vectorParameters: [
          { name: 'BaseColor', value: { r: 0.6, g: 0.5, b: 0.3, a: 1.0 } }
        ]
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Material Information: /Game/Materials/MI_Sand_Wet');
      expect(result.content[0].text).toContain('Type: MaterialInstance');
      expect(result.content[0].text).toContain('Parent Material: /Game/Materials/M_Sand_Material');
      expect(result.content[0].text).toContain('Wetness: 0.8');
    });

    it('should display material parameters with proper formatting', async () => {
      const args = {
        materialPath: '/Game/Materials/M_Test_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/M_Test_Material',
        materialType: 'Material',
        name: 'M_Test_Material',
        scalarParameters: [
          { name: 'Opacity', value: 0.75 },
          { name: 'IOR', value: 1.33 }
        ],
        vectorParameters: [
          { name: 'BaseColor', value: { r: 1.0, g: 0.0, b: 0.0, a: 1.0 } },
          { name: 'EmissiveColor', value: { r: 0.5, g: 0.0, b: 1.0, a: 1.0 } }
        ]
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('BaseColor: RGB(1.000, 0.000, 0.000)');
      expect(result.content[0].text).toContain('EmissiveColor: RGB(0.500, 0.000, 1.000)');
      expect(result.content[0].text).toContain('Opacity: 0.75');
      expect(result.content[0].text).toContain('IOR: 1.33');
    });

    it('should display texture references', async () => {
      const args = {
        materialPath: '/Game/Materials/M_Complex_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/M_Complex_Material',
        materialType: 'Material',
        name: 'M_Complex_Material',
        textureParameters: [
          { name: 'AlbedoTexture', texture: '/Game/Textures/T_Albedo' },
          { name: 'NormalTexture', texture: '/Game/Textures/T_Normal' },
          { name: 'RoughnessTexture', texture: '/Game/Textures/T_Roughness' },
          { name: 'MetallicTexture', texture: '/Game/Textures/T_Metallic' },
          { name: 'AOTexture', texture: '/Game/Textures/T_AO' }
        ]
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Texture Parameters (5):');
      expect(result.content[0].text).toContain('AlbedoTexture: /Game/Textures/T_Albedo');
      expect(result.content[0].text).toContain('NormalTexture: /Game/Textures/T_Normal');
      expect(result.content[0].text).toContain('RoughnessTexture: /Game/Textures/T_Roughness');
    });

    it('should handle materials with no textures or parameters', async () => {
      const args = {
        materialPath: '/Game/Materials/M_Simple_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/M_Simple_Material',
        materialType: 'Material',
        name: 'M_Simple_Material'
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Name: M_Simple_Material');
      expect(result.content[0].text).toContain('Type: Material');
    });

    it('should throw error when material not found', async () => {
      const args = {
        materialPath: '/Game/Materials/NonExistent_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Material not found: /Game/Materials/NonExistent_Material',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Material not found: /Game/Materials/NonExistent_Material'
      );
    });

    it('should throw error when path is invalid', async () => {
      const args = {
        materialPath: 'InvalidPath',
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Invalid material path format: InvalidPath',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Invalid material path format: InvalidPath'
      );
    });

    it('should handle complex material instance hierarchies', async () => {
      const args = {
        materialPath: '/Game/Materials/MI_Derived_Instance',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/MI_Derived_Instance',
        materialType: 'MaterialInstance',
        name: 'MI_Derived_Instance',
        parentMaterial: '/Game/Materials/MI_Base_Instance',
        scalarParameters: [
          { name: 'Intensity', value: 2.0 }
        ],
        vectorParameters: [
          { name: 'TintColor', value: { r: 0.2, g: 0.8, b: 0.2, a: 1.0 } }
        ]
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Name: MI_Derived_Instance');
      expect(result.content[0].text).toContain('Parent Material: /Game/Materials/MI_Base_Instance');
      expect(result.content[0].text).toContain('TintColor: RGB(0.200, 0.800, 0.200)');
      expect(result.content[0].text).toContain('Intensity: 2');
    });

    it('should handle materials with blend modes and domains', async () => {
      const args = {
        materialPath: '/Game/Materials/M_Transparent_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialPath: '/Game/Materials/M_Transparent_Material',
        materialType: 'Material',
        name: 'M_Transparent_Material',
        blendMode: 'Translucent',
        domain: 'Surface',
        shadingModel: 'DefaultLit',
        scalarParameters: [
          { name: 'Opacity', value: 0.5 }
        ]
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Blend Mode: Translucent');
      expect(result.content[0].text).toContain('Domain: Surface');
      expect(result.content[0].text).toContain('Shading Model: DefaultLit');
    });
  });
});