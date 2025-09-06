import { BlueprintCreateTool } from '../../../src/tools/blueprints/create.js';
// Also test the barrel export - using underscore to avoid unused import warning
import { blueprintCreateTool as _blueprintCreateTool } from '../../../src/tools/blueprints/index.js';

// Create a test class that exposes the protected methods
class TestBlueprintCreateTool extends BlueprintCreateTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testExecutePythonCommand = jest.fn();
  public testFormatBlueprintCreationResult = jest.fn();
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }

  protected formatBlueprintCreationResult(data: any) {
    return this.testFormatBlueprintCreationResult(data);
  }
}

describe('BlueprintCreateTool', () => {
  let blueprintCreateTool: TestBlueprintCreateTool;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    blueprintCreateTool = new TestBlueprintCreateTool();
    
    // Set up default mock implementations
    blueprintCreateTool.testFormatBlueprintCreationResult.mockImplementation((data: any) => ({
      content: [{ type: 'text', text: `Blueprint created: ${data.blueprintPath}` }],
    }));
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = blueprintCreateTool.definition;
      
      expect(definition.name).toBe('blueprint_create');
      expect(definition.description).toContain('Create new Blueprint classes');
      expect(definition.description).toContain('Examples:');
      expect((definition.inputSchema as any).type).toBe('object');
      expect((definition.inputSchema as any).required).toEqual(['className']);
    });

    it('should have correct className property', () => {
      const definition = blueprintCreateTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.className).toBeDefined();
      expect(properties.className.type).toBe('string');
      expect(properties.className.description).toContain('Name for the new Blueprint class');
    });

    it('should have correct parentClass property with default', () => {
      const definition = blueprintCreateTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.parentClass).toBeDefined();
      expect(properties.parentClass.type).toBe('string');
      expect(properties.parentClass.default).toBe('Actor');
      expect(properties.parentClass.description).toContain('Parent class name');
    });

    it('should have correct targetFolder property with default', () => {
      const definition = blueprintCreateTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.targetFolder).toBeDefined();
      expect(properties.targetFolder.type).toBe('string');
      expect(properties.targetFolder.default).toBe('/Game/Blueprints');
      expect(properties.targetFolder.description).toContain('Destination folder');
    });

    it('should have correct components array schema', () => {
      const definition = blueprintCreateTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.components).toBeDefined();
      expect(properties.components.type).toBe('array');
      expect(properties.components.items.type).toBe('object');
      expect(properties.components.items.required).toEqual(['name', 'type']);
      
      const componentProps = properties.components.items.properties;
      expect(componentProps.name.type).toBe('string');
      expect(componentProps.type.type).toBe('string');
      expect(componentProps.properties.type).toBe('object');
      expect(componentProps.properties.additionalProperties).toBe(true);
    });

    it('should have correct variables array schema', () => {
      const definition = blueprintCreateTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.variables).toBeDefined();
      expect(properties.variables.type).toBe('array');
      expect(properties.variables.items.type).toBe('object');
      expect(properties.variables.items.required).toEqual(['name', 'type']);
      
      const variableProps = properties.variables.items.properties;
      expect(variableProps.name.type).toBe('string');
      expect(variableProps.type.type).toBe('string');
      expect(variableProps.isEditable.type).toBe('boolean');
      expect(variableProps.isEditable.default).toBe(true);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Mock successful Python command execution
      blueprintCreateTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        blueprintPath: '/Game/Blueprints/BP_TestActor',
        components: ['StaticMeshComponent', 'BoxCollisionComponent'],
        variables: ['Health', 'MaxSpeed'],
      });
    });

    it('should create Blueprint with minimal arguments', async () => {
      const args = {
        className: 'BP_TestActor',
      };

      const result = await blueprintCreateTool.testExecute(args);

      expect(blueprintCreateTool.testExecutePythonCommand).toHaveBeenCalledWith('blueprint.create', {
        class_name: 'BP_TestActor',
        parent_class: 'Actor',
        target_folder: '/Game/Blueprints',
        components: undefined,
        variables: undefined,
      });

      expect(blueprintCreateTool.testFormatBlueprintCreationResult).toHaveBeenCalledWith({
        blueprintPath: '/Game/Blueprints/BP_TestActor',
        className: 'BP_TestActor',
        parentClass: undefined,
        components: ['StaticMeshComponent', 'BoxCollisionComponent'],
        variables: ['Health', 'MaxSpeed'],
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Blueprint created: /Game/Blueprints/BP_TestActor' }],
      });
    });

    it('should create Blueprint with all arguments', async () => {
      const args = {
        className: 'BP_CustomDoor',
        parentClass: 'Pawn',
        targetFolder: '/Game/MyBlueprints',
        components: [
          {
            name: 'MeshComponent',
            type: 'StaticMeshComponent',
            properties: { staticMesh: '/Game/Meshes/Door' },
          },
          {
            name: 'CollisionBox',
            type: 'BoxComponent',
          },
        ],
        variables: [
          {
            name: 'IsOpen',
            type: 'bool',
            defaultValue: false,
            isEditable: true,
          },
          {
            name: 'OpenSpeed',
            type: 'float',
            defaultValue: 1.0,
            isEditable: false,
          },
        ],
      };

      await blueprintCreateTool.testExecute(args);

      expect(blueprintCreateTool.testExecutePythonCommand).toHaveBeenCalledWith('blueprint.create', {
        class_name: 'BP_CustomDoor',
        parent_class: 'Pawn',
        target_folder: '/Game/MyBlueprints',
        components: args.components,
        variables: args.variables,
      });

      expect(blueprintCreateTool.testFormatBlueprintCreationResult).toHaveBeenCalledWith({
        blueprintPath: '/Game/Blueprints/BP_TestActor',
        className: 'BP_CustomDoor',
        parentClass: 'Pawn',
        components: ['StaticMeshComponent', 'BoxCollisionComponent'],
        variables: ['Health', 'MaxSpeed'],
      });
    });

    it('should handle Blueprint creation with Blueprint parent class', async () => {
      const args = {
        className: 'BP_AdvancedDoor',
        parentClass: '/Game/Blueprints/BP_BaseDoor',
        targetFolder: '/Game/Doors',
      };

      await blueprintCreateTool.testExecute(args);

      expect(blueprintCreateTool.testExecutePythonCommand).toHaveBeenCalledWith('blueprint.create', {
        class_name: 'BP_AdvancedDoor',
        parent_class: '/Game/Blueprints/BP_BaseDoor',
        target_folder: '/Game/Doors',
        components: undefined,
        variables: undefined,
      });

      expect(blueprintCreateTool.testFormatBlueprintCreationResult).toHaveBeenCalledWith({
        blueprintPath: '/Game/Blueprints/BP_TestActor',
        className: 'BP_AdvancedDoor',
        parentClass: '/Game/Blueprints/BP_BaseDoor',
        components: ['StaticMeshComponent', 'BoxCollisionComponent'],
        variables: ['Health', 'MaxSpeed'],
      });
    });

    it('should handle empty components and variables arrays', async () => {
      const args = {
        className: 'BP_EmptyActor',
        components: [],
        variables: [],
      };

      await blueprintCreateTool.testExecute(args);

      expect(blueprintCreateTool.testExecutePythonCommand).toHaveBeenCalledWith('blueprint.create', {
        class_name: 'BP_EmptyActor',
        parent_class: 'Actor',
        target_folder: '/Game/Blueprints',
        components: [],
        variables: [],
      });
    });

    it('should handle Python command failure with error message', async () => {
      blueprintCreateTool.testExecutePythonCommand.mockResolvedValue({
        success: false,
        error: 'Blueprint class name already exists',
      });

      const args = { className: 'BP_ExistingActor' };

      await expect(blueprintCreateTool.testExecute(args))
        .rejects.toThrow('Blueprint class name already exists');
      
      expect(blueprintCreateTool.testFormatBlueprintCreationResult).not.toHaveBeenCalled();
    });

    it('should handle Python command failure without error message', async () => {
      blueprintCreateTool.testExecutePythonCommand.mockResolvedValue({
        success: false,
      });

      const args = { className: 'BP_FailedActor' };

      await expect(blueprintCreateTool.testExecute(args))
        .rejects.toThrow('Failed to create Blueprint');
      
      expect(blueprintCreateTool.testFormatBlueprintCreationResult).not.toHaveBeenCalled();
    });

    it('should handle result without components and variables', async () => {
      blueprintCreateTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        blueprintPath: '/Game/Blueprints/BP_SimpleActor',
        // No components or variables in response
      });

      const args = { className: 'BP_SimpleActor' };

      await blueprintCreateTool.testExecute(args);

      expect(blueprintCreateTool.testFormatBlueprintCreationResult).toHaveBeenCalledWith({
        blueprintPath: '/Game/Blueprints/BP_SimpleActor',
        className: 'BP_SimpleActor',
        parentClass: undefined,
        components: undefined,
        variables: undefined,
      });
    });

    it('should handle complex component properties', async () => {
      const args = {
        className: 'BP_ComplexActor',
        components: [
          {
            name: 'RootComponent',
            type: 'SceneComponent',
            properties: {
              relativeLocation: { x: 0, y: 0, z: 0 },
              relativeRotation: { roll: 0, pitch: 0, yaw: 0 },
              relativeScale3D: { x: 1, y: 1, z: 1 },
            },
          },
          {
            name: 'MeshComp',
            type: 'StaticMeshComponent',
            properties: {
              staticMesh: '/Game/Meshes/Complex',
              materials: ['/Game/Materials/Mat1', '/Game/Materials/Mat2'],
              castShadow: true,
              receivesDecals: false,
            },
          },
        ],
      };

      await blueprintCreateTool.testExecute(args);

      expect(blueprintCreateTool.testExecutePythonCommand).toHaveBeenCalledWith('blueprint.create', {
        class_name: 'BP_ComplexActor',
        parent_class: 'Actor',
        target_folder: '/Game/Blueprints',
        components: args.components,
        variables: undefined,
      });
    });

    it('should handle various variable types and default values', async () => {
      const args = {
        className: 'BP_VariableActor',
        variables: [
          {
            name: 'StringVar',
            type: 'string',
            defaultValue: 'Hello World',
            isEditable: true,
          },
          {
            name: 'IntVar',
            type: 'int',
            defaultValue: 42,
            isEditable: false,
          },
          {
            name: 'FloatVar',
            type: 'float',
            defaultValue: 3.14,
          },
          {
            name: 'BoolVar',
            type: 'bool',
            defaultValue: true,
          },
          {
            name: 'VectorVar',
            type: 'FVector',
            defaultValue: { x: 1, y: 2, z: 3 },
          },
        ],
      };

      await blueprintCreateTool.testExecute(args);

      expect(blueprintCreateTool.testExecutePythonCommand).toHaveBeenCalledWith('blueprint.create', {
        class_name: 'BP_VariableActor',
        parent_class: 'Actor',
        target_folder: '/Game/Blueprints',
        components: undefined,
        variables: args.variables,
      });
    });

    it('should handle special Blueprint parent classes', async () => {
      const testCases = [
        { parentClass: 'Actor' },
        { parentClass: 'Pawn' },
        { parentClass: 'Character' },
        { parentClass: 'PlayerController' },
        { parentClass: 'GameMode' },
        { parentClass: '/Game/Blueprints/BP_CustomBase' },
      ];

      for (const testCase of testCases) {
        blueprintCreateTool.testExecutePythonCommand.mockClear();
        
        await blueprintCreateTool.testExecute({
          className: 'BP_TestClass',
          ...testCase,
        });

        expect(blueprintCreateTool.testExecutePythonCommand).toHaveBeenCalledWith('blueprint.create', {
          class_name: 'BP_TestClass',
          parent_class: testCase.parentClass,
          target_folder: '/Game/Blueprints',
          components: undefined,
          variables: undefined,
        });
      }
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined properties gracefully', async () => {
      blueprintCreateTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        blueprintPath: '/Game/Blueprints/BP_NullTest',
      });

      const args = {
        className: 'BP_NullTest',
        parentClass: null as any,
        targetFolder: undefined,
        components: null as any,
        variables: undefined,
      };

      await blueprintCreateTool.testExecute(args);

      expect(blueprintCreateTool.testExecutePythonCommand).toHaveBeenCalledWith('blueprint.create', {
        class_name: 'BP_NullTest',
        parent_class: 'Actor', // Should use default
        target_folder: '/Game/Blueprints', // Should use default
        components: null,
        variables: undefined,
      });
    });

    it('should handle component without properties', async () => {
      blueprintCreateTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        blueprintPath: '/Game/Blueprints/BP_NoPropsTest',
      });

      const args = {
        className: 'BP_NoPropsTest',
        components: [
          {
            name: 'SimpleComponent',
            type: 'SceneComponent',
            // No properties
          },
        ],
      };

      await blueprintCreateTool.testExecute(args);

      expect(blueprintCreateTool.testExecutePythonCommand).toHaveBeenCalledWith('blueprint.create', {
        class_name: 'BP_NoPropsTest',
        parent_class: 'Actor',
        target_folder: '/Game/Blueprints',
        components: args.components,
        variables: undefined,
      });
    });

    it('should handle variable without isEditable property', async () => {
      blueprintCreateTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        blueprintPath: '/Game/Blueprints/BP_DefaultEditableTest',
      });

      const args = {
        className: 'BP_DefaultEditableTest',
        variables: [
          {
            name: 'TestVar',
            type: 'float',
            defaultValue: 1.0,
            // isEditable not specified
          },
        ],
      };

      await blueprintCreateTool.testExecute(args);

      expect(blueprintCreateTool.testExecutePythonCommand).toHaveBeenCalledWith('blueprint.create', {
        class_name: 'BP_DefaultEditableTest',
        parent_class: 'Actor',
        target_folder: '/Game/Blueprints',
        components: undefined,
        variables: args.variables,
      });
    });

    it('should handle non-string result types', async () => {
      blueprintCreateTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        blueprintPath: '/Game/Blueprints/BP_TypeTest',
        components: null, // Not an array
        variables: 'not an array', // Not an array
      });

      const args = { className: 'BP_TypeTest' };

      await blueprintCreateTool.testExecute(args);

      expect(blueprintCreateTool.testFormatBlueprintCreationResult).toHaveBeenCalledWith({
        blueprintPath: '/Game/Blueprints/BP_TypeTest',
        className: 'BP_TypeTest',
        parentClass: undefined,
        components: null,
        variables: 'not an array',
      });
    });
  });

  describe('barrel export', () => {
    it('should export blueprintCreateTool from index', () => {
      expect(_blueprintCreateTool).toBeDefined();
      expect(_blueprintCreateTool.definition.name).toBe('blueprint_create');
    });
  });
});