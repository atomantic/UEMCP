import { BlueprintInfoTool } from '../../../src/tools/blueprints/info.js';
import { blueprintInfoTool as _blueprintInfoTool } from '../../../src/tools/blueprints/index.js';

// Create a test class that exposes the protected methods
class TestBlueprintInfoTool extends BlueprintInfoTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testExecutePythonCommand = jest.fn();
  public testFormatBlueprintInfoResult = jest.fn();
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }

  protected formatBlueprintInfoResult(data: any) {
    return this.testFormatBlueprintInfoResult(data);
  }
}

describe('BlueprintInfoTool', () => {
  let blueprintInfoTool: TestBlueprintInfoTool;

  beforeEach(() => {
    jest.clearAllMocks();
    blueprintInfoTool = new TestBlueprintInfoTool();
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = blueprintInfoTool.definition;
      
      expect(definition.name).toBe('blueprint_info');
      expect(definition.description).toContain('Get detailed Blueprint structure');
      expect(definition.inputSchema).toHaveProperty('type', 'object');
    });

    it('should have correct input schema', () => {
      const schema = blueprintInfoTool.definition.inputSchema as any;
      
      expect(schema.properties).toHaveProperty('blueprintPath');
      expect(schema.required).toContain('blueprintPath');
      expect(schema.properties.blueprintPath.description).toContain('Path to the Blueprint');
    });
  });

  describe('execute', () => {
    it('should execute blueprint info successfully', async () => {
      const mockResult = {
        success: true,
        info: {
          name: 'BP_InteractiveDoor',
          parent_class: 'Actor',
          asset_class: 'Blueprint',
          variables: [
            {
              name: 'IsOpen',
              type: 'bool',
              default_value: false
            }
          ],
          components: [
            {
              name: 'DefaultSceneRoot',
              class: 'SceneComponent'
            },
            {
              name: 'DoorMesh',
              class: 'StaticMeshComponent'
            }
          ],
          functions: [
            {
              name: 'OpenDoor',
              inputs: [],
              outputs: []
            }
          ]
        }
      };

      blueprintInfoTool.testExecutePythonCommand.mockResolvedValue(mockResult);
      blueprintInfoTool.testFormatBlueprintInfoResult.mockReturnValue({
        content: [{ type: 'text', text: 'Blueprint info result' }]
      });

      await blueprintInfoTool.testExecute({
        blueprintPath: '/Game/TestBlueprints/BP_InteractiveDoor'
      });

      expect(blueprintInfoTool.testExecutePythonCommand).toHaveBeenCalledWith(
        'blueprint.get_info',
        {
          blueprint_path: '/Game/TestBlueprints/BP_InteractiveDoor'
        }
      );
    });

    it('should handle missing Blueprint path', async () => {
      await expect(blueprintInfoTool.testExecute({}))
        .rejects.toThrow();
    });

    it('should handle Blueprint not found', async () => {
      const mockResult = {
        success: false,
        error: 'Blueprint not found: /Game/NonExistent/BP_Missing'
      };

      blueprintInfoTool.testExecutePythonCommand.mockResolvedValue(mockResult);

      await expect(blueprintInfoTool.testExecute({
        blueprintPath: '/Game/NonExistent/BP_Missing'
      })).rejects.toThrow('Blueprint not found');
    });

    it('should handle complex Blueprint structure', async () => {
      const mockResult = {
        success: true,
        info: {
          name: 'BP_ComplexSystem',
          parent_class: 'ActorComponent',
          asset_class: 'Blueprint',
          variables: [
            { name: 'Health', type: 'float', default_value: 100.0 },
            { name: 'MaxHealth', type: 'float', default_value: 100.0 },
            { name: 'Items', type: 'Array<FItemData>', default_value: [] }
          ],
          components: [
            { name: 'RootComponent', class: 'SceneComponent' },
            { name: 'MeshComponent', class: 'StaticMeshComponent' },
            { name: 'CollisionComponent', class: 'BoxComponent' }
          ],
          functions: [
            { name: 'TakeDamage', inputs: ['float'], outputs: ['bool'] },
            { name: 'Heal', inputs: ['float'], outputs: [] },
            { name: 'GetItemCount', inputs: [], outputs: ['int'] }
          ],
          interfaces: ['BPI_Interactable', 'BPI_Saveable']
        }
      };

      blueprintInfoTool.testExecutePythonCommand.mockResolvedValue(mockResult);
      blueprintInfoTool.testFormatBlueprintInfoResult.mockReturnValue({
        content: [{ type: 'text', text: 'Complex Blueprint info' }]
      });

      await blueprintInfoTool.testExecute({
        blueprintPath: '/Game/Systems/BP_ComplexSystem'
      });

      expect(blueprintInfoTool.testFormatBlueprintInfoResult).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('integration with barrel export', () => {
    it('should be properly exported from index', () => {
      expect(_blueprintInfoTool).toBeDefined();
      expect(_blueprintInfoTool.definition.name).toBe('blueprint_info');
    });
  });
});