// Mock the Python bridge
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { BlueprintTool } from '../../../src/tools/base/blueprint-tool.js';
import { ResponseFormatter } from '../../../src/utils/response-formatter.js';

// Create a concrete implementation for testing
class TestBlueprintTool extends BlueprintTool<{ testParam: string }> {
  get definition() {
    return {
      name: 'test_blueprint_tool',
      description: 'Test blueprint tool',
      inputSchema: {
        type: 'object' as const,
        properties: {
          testParam: { type: 'string' }
        }
      }
    };
  }

  protected async execute(): Promise<ReturnType<typeof ResponseFormatter.success>> {
    return ResponseFormatter.success('test result');
  }

  // Expose protected methods for testing
  public testFormatBlueprintCreationResult(info: Parameters<BlueprintTool['formatBlueprintCreationResult']>[0]) {
    return this.formatBlueprintCreationResult(info);
  }

  public testFormatBlueprintInfo(info: Parameters<BlueprintTool['formatBlueprintInfo']>[0]) {
    return this.formatBlueprintInfo(info);
  }

  public testFormatError(message: string) {
    return this.formatError(message);
  }
}

describe('BlueprintTool', () => {
  let tool: TestBlueprintTool;

  beforeEach(() => {
    tool = new TestBlueprintTool();
    jest.clearAllMocks();
  });

  describe('formatBlueprintCreationResult', () => {
    it('should format minimal blueprint creation result', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_TestActor',
        className: 'BP_TestActor_C'
      };
      const result = tool.testFormatBlueprintCreationResult(info);

      expect(result.content[0].text).toContain('Blueprint created successfully!');
      expect(result.content[0].text).toContain('Path: /Game/Blueprints/BP_TestActor');
      expect(result.content[0].text).toContain('Class Name: BP_TestActor_C');
      expect(result.content[0].text).not.toContain('Parent Class:');
      expect(result.content[0].text).not.toContain('Components');
      expect(result.content[0].text).not.toContain('Variables');
    });

    it('should format blueprint creation result with parent class', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_CustomActor',
        className: 'BP_CustomActor_C',
        parentClass: 'Actor'
      };
      const result = tool.testFormatBlueprintCreationResult(info);

      expect(result.content[0].text).toContain('Blueprint created successfully!');
      expect(result.content[0].text).toContain('Path: /Game/Blueprints/BP_CustomActor');
      expect(result.content[0].text).toContain('Class Name: BP_CustomActor_C');
      expect(result.content[0].text).toContain('Parent Class: Actor');
    });

    it('should format blueprint creation result with components', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_Door',
        className: 'BP_Door_C',
        components: [
          'StaticMeshComponent',
          'BoxCollisionComponent',
          'AudioComponent'
        ]
      };
      const result = tool.testFormatBlueprintCreationResult(info);

      expect(result.content[0].text).toContain('Components (3):');
      expect(result.content[0].text).toContain('- StaticMeshComponent');
      expect(result.content[0].text).toContain('- BoxCollisionComponent');
      expect(result.content[0].text).toContain('- AudioComponent');
    });

    it('should format blueprint creation result with variables', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_Interactive',
        className: 'BP_Interactive_C',
        variables: [
          'IsLocked (Boolean)',
          'MaxHealth (Float)',
          'PlayerName (String)'
        ]
      };
      const result = tool.testFormatBlueprintCreationResult(info);

      expect(result.content[0].text).toContain('Variables (3):');
      expect(result.content[0].text).toContain('- IsLocked (Boolean)');
      expect(result.content[0].text).toContain('- MaxHealth (Float)');
      expect(result.content[0].text).toContain('- PlayerName (String)');
    });

    it('should format complete blueprint creation result', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_ComplexActor',
        className: 'BP_ComplexActor_C',
        parentClass: 'Pawn',
        components: [
          'SkeletalMeshComponent',
          'CapsuleComponent',
          'SpringArmComponent',
          'CameraComponent'
        ],
        variables: [
          'Health (Float)',
          'Speed (Float)',
          'IsAlive (Boolean)'
        ]
      };
      const result = tool.testFormatBlueprintCreationResult(info);

      expect(result.content[0].text).toContain('Blueprint created successfully!');
      expect(result.content[0].text).toContain('Path: /Game/Blueprints/BP_ComplexActor');
      expect(result.content[0].text).toContain('Class Name: BP_ComplexActor_C');
      expect(result.content[0].text).toContain('Parent Class: Pawn');
      expect(result.content[0].text).toContain('Components (4):');
      expect(result.content[0].text).toContain('Variables (3):');
    });

    it('should handle empty components array', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_Empty',
        className: 'BP_Empty_C',
        components: []
      };
      const result = tool.testFormatBlueprintCreationResult(info);

      expect(result.content[0].text).not.toContain('Components');
    });

    it('should handle empty variables array', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_Empty',
        className: 'BP_Empty_C',
        variables: []
      };
      const result = tool.testFormatBlueprintCreationResult(info);

      expect(result.content[0].text).not.toContain('Variables');
    });
  });

  describe('formatBlueprintInfo', () => {
    it('should format minimal blueprint info', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_Simple'
      };
      const result = tool.testFormatBlueprintInfo(info);

      expect(result.content[0].text).toContain('Blueprint Information');
      expect(result.content[0].text).toContain('Path: /Game/Blueprints/BP_Simple');
      expect(result.content[0].text).not.toContain('Class Name:');
      expect(result.content[0].text).not.toContain('Parent Class:');
    });

    it('should format blueprint info with class names', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_Actor',
        className: 'BP_Actor_C',
        parentClass: 'Actor'
      };
      const result = tool.testFormatBlueprintInfo(info);

      expect(result.content[0].text).toContain('Blueprint Information');
      expect(result.content[0].text).toContain('Path: /Game/Blueprints/BP_Actor');
      expect(result.content[0].text).toContain('Class Name: BP_Actor_C');
      expect(result.content[0].text).toContain('Parent Class: Actor');
    });

    it('should format blueprint info with components', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_Door',
        components: [
          {
            name: 'StaticMesh',
            type: 'StaticMeshComponent'
          },
          {
            name: 'Collision',
            type: 'BoxComponent'
          },
          {
            name: 'Audio',
            type: 'AudioComponent'
          }
        ]
      };
      const result = tool.testFormatBlueprintInfo(info);

      expect(result.content[0].text).toContain('Components (3):');
      expect(result.content[0].text).toContain('- StaticMesh (StaticMeshComponent)');
      expect(result.content[0].text).toContain('- Collision (BoxComponent)');
      expect(result.content[0].text).toContain('- Audio (AudioComponent)');
    });

    it('should format blueprint info with variables', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_Character',
        variables: [
          {
            name: 'Health',
            type: 'float',
            defaultValue: 100.0
          },
          {
            name: 'IsAlive',
            type: 'bool',
            defaultValue: true
          },
          {
            name: 'PlayerName',
            type: 'string'
          },
          {
            name: 'Level',
            type: 'int',
            defaultValue: 1
          }
        ]
      };
      const result = tool.testFormatBlueprintInfo(info);

      expect(result.content[0].text).toContain('Variables (4):');
      expect(result.content[0].text).toContain('- Health: float = 100');
      expect(result.content[0].text).toContain('- IsAlive: bool = true');
      expect(result.content[0].text).toContain('- PlayerName: string');
      expect(result.content[0].text).not.toContain('PlayerName: string =');
      expect(result.content[0].text).toContain('- Level: int = 1');
    });

    it('should format blueprint info with functions', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_Calculator',
        functions: [
          {
            name: 'Add',
            returnType: 'float',
            parameters: [
              { name: 'a', type: 'float' },
              { name: 'b', type: 'float' }
            ]
          },
          {
            name: 'Reset',
            parameters: []
          },
          {
            name: 'GetValue',
            returnType: 'float'
          },
          {
            name: 'ProcessData',
            parameters: [
              { name: 'input', type: 'string' },
              { name: 'count', type: 'int' }
            ]
          }
        ]
      };
      const result = tool.testFormatBlueprintInfo(info);

      expect(result.content[0].text).toContain('Functions (4):');
      expect(result.content[0].text).toContain('- Add(a: float, b: float): float');
      expect(result.content[0].text).toContain('- Reset()');
      expect(result.content[0].text).not.toContain('Reset():');
      expect(result.content[0].text).toContain('- GetValue(): float');
      expect(result.content[0].text).toContain('- ProcessData(input: string, count: int)');
      expect(result.content[0].text).not.toContain('ProcessData(input: string, count: int):');
    });

    it('should format complete blueprint info', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_CompleteExample',
        className: 'BP_CompleteExample_C',
        parentClass: 'Actor',
        components: [
          {
            name: 'RootComponent',
            type: 'SceneComponent',
            properties: { Location: [0, 0, 0] }
          },
          {
            name: 'Mesh',
            type: 'StaticMeshComponent',
            properties: { Material: '/Game/Materials/M_Default' }
          }
        ],
        variables: [
          {
            name: 'Speed',
            type: 'float',
            defaultValue: 600.0,
            isEditable: true
          },
          {
            name: 'IsActive',
            type: 'bool',
            defaultValue: false,
            isEditable: false
          }
        ],
        functions: [
          {
            name: 'Initialize',
            parameters: []
          },
          {
            name: 'Move',
            returnType: 'bool',
            parameters: [
              { name: 'direction', type: 'Vector' },
              { name: 'deltaTime', type: 'float' }
            ]
          }
        ]
      };
      const result = tool.testFormatBlueprintInfo(info);

      expect(result.content[0].text).toContain('Blueprint Information');
      expect(result.content[0].text).toContain('Path: /Game/Blueprints/BP_CompleteExample');
      expect(result.content[0].text).toContain('Class Name: BP_CompleteExample_C');
      expect(result.content[0].text).toContain('Parent Class: Actor');
      expect(result.content[0].text).toContain('Components (2):');
      expect(result.content[0].text).toContain('Variables (2):');
      expect(result.content[0].text).toContain('Functions (2):');
      expect(result.content[0].text).toContain('- RootComponent (SceneComponent)');
      expect(result.content[0].text).toContain('- Speed: float = 600');
      expect(result.content[0].text).toContain('- Initialize()');
      expect(result.content[0].text).toContain('- Move(direction: Vector, deltaTime: float): bool');
    });

    it('should handle empty arrays gracefully', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_Empty',
        components: [],
        variables: [],
        functions: []
      };
      const result = tool.testFormatBlueprintInfo(info);

      expect(result.content[0].text).toContain('Blueprint Information');
      expect(result.content[0].text).toContain('Path: /Game/Blueprints/BP_Empty');
      expect(result.content[0].text).not.toContain('Components');
      expect(result.content[0].text).not.toContain('Variables');
      expect(result.content[0].text).not.toContain('Functions');
    });

    it('should handle undefined default values', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_Test',
        variables: [
          {
            name: 'TestVar',
            type: 'string',
            defaultValue: undefined
          },
          {
            name: 'NullVar',
            type: 'object',
            defaultValue: null
          },
          {
            name: 'ZeroVar',
            type: 'int',
            defaultValue: 0
          }
        ]
      };
      const result = tool.testFormatBlueprintInfo(info);

      expect(result.content[0].text).toContain('- TestVar: string');
      expect(result.content[0].text).not.toContain('TestVar: string =');
      expect(result.content[0].text).toContain('- NullVar: object = null');
      expect(result.content[0].text).toContain('- ZeroVar: int = 0');
    });

    it('should handle functions with undefined parameters', () => {
      const info = {
        blueprintPath: '/Game/Blueprints/BP_Test',
        functions: [
          {
            name: 'SimpleFunction',
            parameters: undefined
          }
        ]
      };
      const result = tool.testFormatBlueprintInfo(info);

      expect(result.content[0].text).toContain('- SimpleFunction()');
    });
  });

  describe('formatError', () => {
    it('should throw error with message', () => {
      expect(() => {
        tool.testFormatError('Blueprint creation failed');
      }).toThrow('Blueprint creation failed');
    });

    it('should throw error with empty message', () => {
      expect(() => {
        tool.testFormatError('');
      }).toThrow('');
    });

    it('should throw error with complex message', () => {
      const errorMsg = 'Failed to create blueprint: Invalid parent class "NonExistentActor". Available classes: Actor, Pawn, Character.';
      expect(() => {
        tool.testFormatError(errorMsg);
      }).toThrow(errorMsg);
    });
  });
});