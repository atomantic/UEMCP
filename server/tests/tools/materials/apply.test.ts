// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { MaterialApplyTool } from '../../../src/tools/materials/apply.js';

describe('MaterialApplyTool', () => {
  let tool: MaterialApplyTool;

  beforeEach(() => {
    tool = new MaterialApplyTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('material_apply');
      expect(definition.description).toContain('Apply material to actor\'s static mesh component');
      expect(definition.description).toContain('Example:');
      expect(definition.description).toContain('DressageArena-20mx60m');
    });

    it('should have proper input schema with required parameters', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      
      expect(schema.properties?.actorName?.type).toBe('string');
      expect(schema.properties?.actorName?.description).toContain('Name of the actor');
      
      expect(schema.properties?.materialPath?.type).toBe('string');
      expect(schema.properties?.materialPath?.description).toContain('Path to the material');
      
      expect(schema.properties?.slotIndex?.type).toBe('number');
      expect(schema.properties?.slotIndex?.default).toBe(0);
      
      expect(schema.required).toContain('actorName');
      expect(schema.required).toContain('materialPath');
    });
  });

  describe('execute', () => {
    it('should apply material to actor with default slot index', async () => {
      const args = {
        actorName: 'TestWall_01',
        materialPath: '/Game/Materials/M_Sand_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'TestWall_01',
        materialPath: '/Game/Materials/M_Sand_Material',
        materialName: 'M_Sand_Material',
        slotIndex: 0,
        previousMaterial: '/Game/Materials/M_Default_Material',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'material.apply_material_to_actor',
        params: {
          actor_name: 'TestWall_01',
          material_path: '/Game/Materials/M_Sand_Material',
          slot_index: undefined
        }
      });
      expect(result.content[0].text).toContain('Material applied successfully!');
      expect(result.content[0].text).toContain('Actor: TestWall_01');
      expect(result.content[0].text).toContain('Material: /Game/Materials/M_Sand_Material');
      expect(result.content[0].text).toContain('Slot Index: 0');
    });

    it('should apply material to specific slot index', async () => {
      const args = {
        actorName: 'ComplexMesh_01',
        materialPath: '/Game/Materials/M_Metal_Material',
        slotIndex: 2,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'ComplexMesh_01',
        materialPath: '/Game/Materials/M_Metal_Material',
        materialName: 'M_Metal_Material',
        slotIndex: 2,
        previousMaterial: '/Game/Materials/M_Plastic_Material',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Material applied successfully!');
      expect(result.content[0].text).toContain('Actor: ComplexMesh_01');
      expect(result.content[0].text).toContain('Material: /Game/Materials/M_Metal_Material');
      expect(result.content[0].text).toContain('Slot Index: 2');
    });

    it('should apply material instance to actor', async () => {
      const args = {
        actorName: 'Arena_Floor',
        materialPath: '/Game/Materials/MI_Sand_Wet',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'Arena_Floor',
        materialPath: '/Game/Materials/MI_Sand_Wet',
        materialName: 'MI_Sand_Wet',
        slotIndex: 0,
        materialType: 'MaterialInstance',
        parentMaterial: '/Game/Materials/M_Sand_Base',
        previousMaterial: '/Game/Materials/M_Grass_Material',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Material applied successfully!');
      expect(result.content[0].text).toContain('Actor: Arena_Floor');
      expect(result.content[0].text).toContain('Material: /Game/Materials/MI_Sand_Wet');
    });

    it('should show previous material information', async () => {
      const args = {
        actorName: 'Wall_North_01',
        materialPath: '/Game/Materials/M_Brick_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'Wall_North_01',
        materialPath: '/Game/Materials/M_Brick_Material',
        materialName: 'M_Brick_Material',
        slotIndex: 0,
        previousMaterial: '/Game/Materials/M_Stone_Material',
        previousMaterialName: 'M_Stone_Material',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Material applied successfully!');
      expect(result.content[0].text).toContain('Actor: Wall_North_01');
      expect(result.content[0].text).toContain('Material: /Game/Materials/M_Brick_Material');
    });

    it('should handle multi-material mesh actors', async () => {
      const args = {
        actorName: 'DetailedBuilding_01',
        materialPath: '/Game/Materials/M_Wood_Material',
        slotIndex: 1,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'DetailedBuilding_01',
        materialPath: '/Game/Materials/M_Wood_Material',
        materialName: 'M_Wood_Material',
        slotIndex: 1,
        totalSlots: 4,
        slotNames: ['Foundation', 'Walls', 'Roof', 'Details'],
        previousMaterial: '/Game/Materials/M_Concrete_Material',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Material applied successfully!');
      expect(result.content[0].text).toContain('Actor: DetailedBuilding_01');
      expect(result.content[0].text).toContain('Material: /Game/Materials/M_Wood_Material');
      expect(result.content[0].text).toContain('Slot Index: 1');
    });

    it('should handle actors with no previous material', async () => {
      const args = {
        actorName: 'NewMesh_01',
        materialPath: '/Game/Materials/M_Default_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'NewMesh_01',
        materialPath: '/Game/Materials/M_Default_Material',
        materialName: 'M_Default_Material',
        slotIndex: 0,
        previousMaterial: null,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Material applied successfully!');
      expect(result.content[0].text).toContain('Actor: NewMesh_01');
      expect(result.content[0].text).toContain('Material: /Game/Materials/M_Default_Material');
    });

    it('should throw error when actor not found', async () => {
      const args = {
        actorName: 'NonExistentActor',
        materialPath: '/Game/Materials/M_Test_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Actor not found: NonExistentActor',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Actor not found: NonExistentActor'
      );
    });

    it('should throw error when material not found', async () => {
      const args = {
        actorName: 'TestActor',
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

    it('should throw error when slot index is invalid', async () => {
      const args = {
        actorName: 'TestActor',
        materialPath: '/Game/Materials/M_Test_Material',
        slotIndex: 5,
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Invalid slot index: 5. Actor has only 2 material slots.',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Invalid slot index: 5. Actor has only 2 material slots.'
      );
    });

    it('should throw error when actor has no static mesh component', async () => {
      const args = {
        actorName: 'EmptyActor',
        materialPath: '/Game/Materials/M_Test_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Actor EmptyActor has no StaticMeshComponent',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Actor EmptyActor has no StaticMeshComponent'
      );
    });

    it('should handle Blueprint actors with custom components', async () => {
      const args = {
        actorName: 'BP_CustomBuilding_C_01',
        materialPath: '/Game/Materials/M_Custom_Material',
        slotIndex: 0,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'BP_CustomBuilding_C_01',
        materialPath: '/Game/Materials/M_Custom_Material',
        materialName: 'M_Custom_Material',
        slotIndex: 0,
        actorClass: 'BP_CustomBuilding_C',
        componentName: 'StaticMeshComponent',
        previousMaterial: '/Game/Materials/M_Default_Material',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Material applied successfully!');
      expect(result.content[0].text).toContain('Actor: BP_CustomBuilding_C_01');
      expect(result.content[0].text).toContain('Material: /Game/Materials/M_Custom_Material');
      expect(result.content[0].text).toContain('Component: StaticMeshComponent');
    });

    it('should handle material application with warnings', async () => {
      const args = {
        actorName: 'HighPolyMesh_01',
        materialPath: '/Game/Materials/M_Expensive_Material',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        actorName: 'HighPolyMesh_01',
        materialPath: '/Game/Materials/M_Expensive_Material',
        materialName: 'M_Expensive_Material',
        slotIndex: 0,
        warnings: [
          'Material is computationally expensive',
          'Consider using a material instance for better performance'
        ],
        previousMaterial: '/Game/Materials/M_Simple_Material',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Material applied successfully!');
      expect(result.content[0].text).toContain('Actor: HighPolyMesh_01');
      expect(result.content[0].text).toContain('Material: /Game/Materials/M_Expensive_Material');
    });
  });
});