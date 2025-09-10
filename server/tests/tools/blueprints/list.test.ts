import { BlueprintListTool } from '../../../src/tools/blueprints/list.js';
import { blueprintListTool as _blueprintListTool } from '../../../src/tools/blueprints/index.js';

// Create a test class that exposes the protected methods
class TestBlueprintListTool extends BlueprintListTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testExecutePythonCommand = jest.fn();
  public testFormatBlueprintListResult = jest.fn();
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }

  protected formatBlueprintListResult(data: any) {
    return this.testFormatBlueprintListResult(data);
  }
}

describe('BlueprintListTool', () => {
  let blueprintListTool: TestBlueprintListTool;

  beforeEach(() => {
    jest.clearAllMocks();
    blueprintListTool = new TestBlueprintListTool();
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = blueprintListTool.definition;
      
      expect(definition.name).toBe('blueprint_list');
      expect(definition.description).toContain('List Blueprints');
      expect(definition.inputSchema).toHaveProperty('type', 'object');
    });

    it('should have correct input schema', () => {
      const schema = blueprintListTool.definition.inputSchema as any;
      
      expect(schema.properties).toHaveProperty('path');
      expect(schema.properties).toHaveProperty('filter');
      expect(schema.properties).toHaveProperty('limit');
      expect(schema.properties.path.default).toBe('/Game');
      expect(schema.properties.limit.default).toBe(50);
    });
  });

  describe('execute', () => {
    it('should execute blueprint list with default parameters', async () => {
      // Mock successful response
      const mockResult = {
        success: true,
        blueprints: [
          {
            name: 'BP_TestActor',
            asset_path: '/Game/Blueprints/BP_TestActor',
            asset_class: 'Blueprint',
            parent_class: 'Actor'
          }
        ]
      };

      blueprintListTool.testExecutePythonCommand.mockResolvedValue(mockResult);
      blueprintListTool.testFormatBlueprintListResult.mockReturnValue({
        content: [{ type: 'text', text: 'Blueprint list result' }]
      });

      await blueprintListTool.testExecute({});

      expect(blueprintListTool.testExecutePythonCommand).toHaveBeenCalledWith(
        'blueprint.list_blueprints',
        {
          path: '/Game',
          filter: undefined,
          limit: 50
        }
      );
    });

    it('should execute blueprint list with custom parameters', async () => {
      const mockResult = {
        success: true,
        blueprints: []
      };

      blueprintListTool.testExecutePythonCommand.mockResolvedValue(mockResult);
      blueprintListTool.testFormatBlueprintListResult.mockReturnValue({
        content: [{ type: 'text', text: 'Blueprint list result' }]
      });

      await blueprintListTool.testExecute({
        path: '/Game/TestBlueprints',
        filter: 'BP_Interactive',
        limit: 10
      });

      expect(blueprintListTool.testExecutePythonCommand).toHaveBeenCalledWith(
        'blueprint.list_blueprints',
        {
          path: '/Game/TestBlueprints',
          filter: 'BP_Interactive',
          limit: 10
        }
      );
    });

    it('should handle empty blueprint list', async () => {
      const mockResult = {
        success: true,
        blueprints: []
      };

      blueprintListTool.testExecutePythonCommand.mockResolvedValue(mockResult);
      blueprintListTool.testFormatBlueprintListResult.mockReturnValue({
        content: [{ type: 'text', text: 'No Blueprints found' }]
      });

      await blueprintListTool.testExecute({ path: '/Game/NonExistent' });

      expect(blueprintListTool.testFormatBlueprintListResult).toHaveBeenCalledWith(mockResult);
    });

    it('should handle Python command errors', async () => {
      blueprintListTool.testExecutePythonCommand.mockRejectedValue(
        new Error('Python execution failed')
      );

      await expect(blueprintListTool.testExecute({}))
        .rejects.toThrow('Python execution failed');
    });
  });

  describe('integration with barrel export', () => {
    it('should be properly exported from index', () => {
      expect(_blueprintListTool).toBeDefined();
      expect(_blueprintListTool.definition.name).toBe('blueprint_list');
    });
  });
});