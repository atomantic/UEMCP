import { BlueprintDocumentTool } from '../../../src/tools/blueprints/document.js';
import { blueprintDocumentTool as _blueprintDocumentTool } from '../../../src/tools/blueprints/index.js';

// Create a test class that exposes the protected methods
class TestBlueprintDocumentTool extends BlueprintDocumentTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testExecutePythonCommand = jest.fn();
  public testFormatBlueprintDocumentResult = jest.fn();
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }

  protected formatBlueprintDocumentResult(data: any) {
    return this.testFormatBlueprintDocumentResult(data);
  }
}

describe('BlueprintDocumentTool', () => {
  let blueprintDocumentTool: TestBlueprintDocumentTool;

  beforeEach(() => {
    jest.clearAllMocks();
    blueprintDocumentTool = new TestBlueprintDocumentTool();
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = blueprintDocumentTool.definition;
      
      expect(definition.name).toBe('blueprint_document');
      expect(definition.description).toContain('Generate comprehensive markdown documentation');
      expect(definition.inputSchema).toHaveProperty('type', 'object');
    });

    it('should have correct input schema', () => {
      const schema = blueprintDocumentTool.definition.inputSchema as any;
      
      expect(schema.properties).toHaveProperty('blueprintPath');
      expect(schema.properties).toHaveProperty('blueprintPaths');
      expect(schema.properties).toHaveProperty('outputPath');
      expect(schema.properties).toHaveProperty('includeComponents');
      expect(schema.properties).toHaveProperty('includeVariables');
      expect(schema.properties).toHaveProperty('includeFunctions');
      expect(schema.properties).toHaveProperty('includeEvents');
      expect(schema.properties).toHaveProperty('includeDependencies');
    });

    it('should have correct default values', () => {
      const schema = blueprintDocumentTool.definition.inputSchema as any;
      
      expect(schema.properties.includeComponents.default).toBe(true);
      expect(schema.properties.includeVariables.default).toBe(true);
      expect(schema.properties.includeFunctions.default).toBe(true);
      expect(schema.properties.includeEvents.default).toBe(true);
      expect(schema.properties.includeDependencies.default).toBe(false);
    });
  });

  describe('execute', () => {
    it('should generate documentation for single Blueprint', async () => {
      const mockResult = {
        success: true,
        documentation: `# BP_InteractiveDoor

## Overview
Interactive door Blueprint with proximity detection.

## Components
- DefaultSceneRoot (SceneComponent)
- DoorMesh (StaticMeshComponent)
- ProximityTrigger (BoxComponent)

## Variables
- IsOpen (bool): Whether the door is currently open
- OpenRotation (rotator): Target rotation when door is open

## Functions
- OpenDoor(): Opens the door with animation
- CloseDoor(): Closes the door with animation

## Events
- BeginPlay: Initialize door state
- OnProximityEnter: Handle player entering trigger area`
      };

      blueprintDocumentTool.testExecutePythonCommand.mockResolvedValue(mockResult);
      blueprintDocumentTool.testFormatBlueprintDocumentResult.mockReturnValue({
        content: [{ type: 'text', text: 'Documentation generated successfully' }]
      });

      await blueprintDocumentTool.testExecute({
        blueprintPath: '/Game/TestBlueprints/BP_InteractiveDoor'
      });

      expect(blueprintDocumentTool.testExecutePythonCommand).toHaveBeenCalledWith(
        'blueprint.document',
        {
          blueprint_path: '/Game/TestBlueprints/BP_InteractiveDoor',
          blueprint_paths: undefined,
          output_path: undefined,
          include_components: true,
          include_variables: true,
          include_functions: true,
          include_events: true,
          include_dependencies: false
        }
      );
    });

    it('should generate documentation for multiple Blueprints', async () => {
      const mockResult = {
        success: true,
        documentation: `# Blueprint System Documentation

## BP_InteractiveDoor
Interactive door with proximity detection.

## BP_ItemPickup  
Collectible item with effects.

## BP_InventorySystem
Item storage and management system.`
      };

      blueprintDocumentTool.testExecutePythonCommand.mockResolvedValue(mockResult);
      blueprintDocumentTool.testFormatBlueprintDocumentResult.mockReturnValue({
        content: [{ type: 'text', text: 'Batch documentation generated' }]
      });

      await blueprintDocumentTool.testExecute({
        blueprintPaths: [
          '/Game/TestBlueprints/BP_InteractiveDoor',
          '/Game/TestBlueprints/Items/BP_ItemPickup',
          '/Game/TestBlueprints/Systems/BP_InventorySystem'
        ]
      });

      expect(blueprintDocumentTool.testExecutePythonCommand).toHaveBeenCalledWith(
        'blueprint.document',
        expect.objectContaining({
          blueprint_paths: [
            '/Game/TestBlueprints/BP_InteractiveDoor',
            '/Game/TestBlueprints/Items/BP_ItemPickup',
            '/Game/TestBlueprints/Systems/BP_InventorySystem'
          ]
        })
      );
    });

    it('should handle custom documentation options', async () => {
      const mockResult = {
        success: true,
        documentation: `# BP_MinimalDoc

## Variables
- Health (float)
- MaxHealth (float)`
      };

      blueprintDocumentTool.testExecutePythonCommand.mockResolvedValue(mockResult);
      blueprintDocumentTool.testFormatBlueprintDocumentResult.mockReturnValue({
        content: [{ type: 'text', text: 'Custom documentation generated' }]
      });

      await blueprintDocumentTool.testExecute({
        blueprintPath: '/Game/TestBlueprints/BP_Character',
        outputPath: '/Game/Documentation/BP_Character.md',
        includeComponents: false,
        includeFunctions: false,
        includeEvents: false,
        includeDependencies: true
      });

      expect(blueprintDocumentTool.testExecutePythonCommand).toHaveBeenCalledWith(
        'blueprint.document',
        {
          blueprint_path: '/Game/TestBlueprints/BP_Character',
          blueprint_paths: undefined,
          output_path: '/Game/Documentation/BP_Character.md',
          include_components: false,
          include_variables: true,
          include_functions: false,
          include_events: false,
          include_dependencies: true
        }
      );
    });

    it('should handle missing Blueprint path and paths', async () => {
      await expect(blueprintDocumentTool.testExecute({}))
        .rejects.toThrow();
    });

    it('should handle documentation generation failure', async () => {
      const mockResult = {
        success: false,
        error: 'Failed to generate documentation: Blueprint not found'
      };

      blueprintDocumentTool.testExecutePythonCommand.mockResolvedValue(mockResult);

      await expect(blueprintDocumentTool.testExecute({
        blueprintPath: '/Game/NonExistent/BP_Missing'
      })).rejects.toThrow('Failed to generate documentation');
    });

    it('should handle large documentation output', async () => {
      const longDocumentation = '# Large Blueprint\n\n' + 'This is a complex Blueprint with many components and functions.\n'.repeat(100);
      
      const mockResult = {
        success: true,
        documentation: longDocumentation
      };

      blueprintDocumentTool.testExecutePythonCommand.mockResolvedValue(mockResult);
      blueprintDocumentTool.testFormatBlueprintDocumentResult.mockReturnValue({
        content: [{ type: 'text', text: `Documentation generated (${longDocumentation.length} characters)` }]
      });

      await blueprintDocumentTool.testExecute({
        blueprintPath: '/Game/Complex/BP_LargeSystem'
      });

      expect(blueprintDocumentTool.testFormatBlueprintDocumentResult).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('integration with barrel export', () => {
    it('should be properly exported from index', () => {
      expect(_blueprintDocumentTool).toBeDefined();
      expect(_blueprintDocumentTool.definition.name).toBe('blueprint_document');
    });
  });
});