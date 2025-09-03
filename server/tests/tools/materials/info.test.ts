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
        materialInfo: {
          name: 'M_Sand_Material',
          path: '/Game/Materials/M_Sand_Material',
          type: 'Material',
          parentMaterial: null,
          parameters: {
            BaseColor: { type: 'Vector3', value: [0.8, 0.7, 0.5] },
            Roughness: { type: 'Scalar', value: 0.8 },
            Metallic: { type: 'Scalar', value: 0.0 },
          },
          textures: [
            '/Game/Textures/T_Sand_Diffuse',
            '/Game/Textures/T_Sand_Normal',
          ],
          usageFlags: ['UsedWithStaticMeshes', 'UsedWithLandscape'],
        },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'material.info',
        params: args
      });
      expect(result.content[0].text).toContain('Material Information: M_Sand_Material');
      expect(result.content[0].text).toContain('Type: Material');
      expect(result.content[0].text).toContain('BaseColor');
      expect(result.content[0].text).toContain('Roughness');
      expect(result.content[0].text).toContain('T_Sand_Diffuse');
    });

    it('should get information for a material instance with parent', async () => {
      const args = {
        materialPath: '/Game/Materials/MI_Sand_Wet',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialInfo: {
          name: 'MI_Sand_Wet',
          path: '/Game/Materials/MI_Sand_Wet',
          type: 'MaterialInstance',
          parentMaterial: '/Game/Materials/M_Sand_Material',
          parameters: {
            BaseColor: { type: 'Vector3', value: [0.6, 0.5, 0.3] },
            Roughness: { type: 'Scalar', value: 0.4 },
            Wetness: { type: 'Scalar', value: 0.8 },
          },
          overriddenParameters: ['BaseColor', 'Roughness', 'Wetness'],
          textures: [
            '/Game/Textures/T_Sand_Diffuse',
            '/Game/Textures/T_Water_Normal',
          ],
          usageFlags: ['UsedWithStaticMeshes'],
        },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Material Information: MI_Sand_Wet');
      expect(result.content[0].text).toContain('Type: MaterialInstance');
      expect(result.content[0].text).toContain('Parent: M_Sand_Material');
      expect(result.content[0].text).toContain('Wetness');
      expect(result.content[0].text).toContain('Overridden Parameters');
    });

    it('should display material parameters with proper formatting', async () => {
      const args = {
        materialPath: '/Game/Materials/M_Test_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialInfo: {
          name: 'M_Test_Material',
          path: '/Game/Materials/M_Test_Material',
          type: 'Material',
          parentMaterial: null,
          parameters: {
            BaseColor: { type: 'Vector3', value: [1.0, 0.0, 0.0] },
            EmissiveColor: { type: 'Vector3', value: [0.5, 0.0, 1.0] },
            Opacity: { type: 'Scalar', value: 0.75 },
            IOR: { type: 'Scalar', value: 1.33 },
          },
          textures: [],
          usageFlags: [],
        },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('BaseColor: [1, 0, 0]');
      expect(result.content[0].text).toContain('EmissiveColor: [0.5, 0, 1]');
      expect(result.content[0].text).toContain('Opacity: 0.75');
      expect(result.content[0].text).toContain('IOR: 1.33');
    });

    it('should display texture references', async () => {
      const args = {
        materialPath: '/Game/Materials/M_Complex_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialInfo: {
          name: 'M_Complex_Material',
          path: '/Game/Materials/M_Complex_Material',
          type: 'Material',
          parentMaterial: null,
          parameters: {},
          textures: [
            '/Game/Textures/T_Albedo',
            '/Game/Textures/T_Normal',
            '/Game/Textures/T_Roughness',
            '/Game/Textures/T_Metallic',
            '/Game/Textures/T_AO',
          ],
          usageFlags: ['UsedWithStaticMeshes', 'UsedWithSkeletalMeshes'],
        },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Referenced Textures:');
      expect(result.content[0].text).toContain('T_Albedo');
      expect(result.content[0].text).toContain('T_Normal');
      expect(result.content[0].text).toContain('T_Roughness');
      expect(result.content[0].text).toContain('Usage Flags:');
      expect(result.content[0].text).toContain('UsedWithStaticMeshes');
    });

    it('should handle materials with no textures or parameters', async () => {
      const args = {
        materialPath: '/Game/Materials/M_Simple_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialInfo: {
          name: 'M_Simple_Material',
          path: '/Game/Materials/M_Simple_Material',
          type: 'Material',
          parentMaterial: null,
          parameters: {},
          textures: [],
          usageFlags: [],
        },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('M_Simple_Material');
      expect(result.content[0].text).toContain('No parameters');
      expect(result.content[0].text).toContain('No textures');
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
        materialInfo: {
          name: 'MI_Derived_Instance',
          path: '/Game/Materials/MI_Derived_Instance',
          type: 'MaterialInstance',
          parentMaterial: '/Game/Materials/MI_Base_Instance',
          grandParentMaterial: '/Game/Materials/M_Master_Material',
          parameters: {
            TintColor: { type: 'Vector3', value: [0.2, 0.8, 0.2] },
            Intensity: { type: 'Scalar', value: 2.0 },
          },
          overriddenParameters: ['TintColor', 'Intensity'],
          textures: ['/Game/Textures/T_Custom_Texture'],
          usageFlags: ['UsedWithStaticMeshes'],
        },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('MI_Derived_Instance');
      expect(result.content[0].text).toContain('Parent: MI_Base_Instance');
      expect(result.content[0].text).toContain('TintColor');
      expect(result.content[0].text).toContain('Intensity');
    });

    it('should handle materials with blend modes and domains', async () => {
      const args = {
        materialPath: '/Game/Materials/M_Transparent_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        materialInfo: {
          name: 'M_Transparent_Material',
          path: '/Game/Materials/M_Transparent_Material',
          type: 'Material',
          parentMaterial: null,
          parameters: {
            Opacity: { type: 'Scalar', value: 0.5 },
          },
          textures: [],
          usageFlags: ['UsedWithStaticMeshes'],
          blendMode: 'Translucent',
          materialDomain: 'Surface',
          shadingModel: 'DefaultLit',
        },
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Blend Mode: Translucent');
      expect(result.content[0].text).toContain('Material Domain: Surface');
      expect(result.content[0].text).toContain('Shading Model: DefaultLit');
    });
  });
});