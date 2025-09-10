import { BlueprintCompileTool } from '../../../src/tools/blueprints/compile.js';
import { blueprintCompileTool as _blueprintCompileTool } from '../../../src/tools/blueprints/index.js';

// Create a test class that exposes the protected methods
class TestBlueprintCompileTool extends BlueprintCompileTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testExecutePythonCommand = jest.fn();
  public testFormatBlueprintCompileResult = jest.fn();
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }

  protected formatBlueprintCompileResult(data: any) {
    return this.testFormatBlueprintCompileResult(data);
  }
}

describe('BlueprintCompileTool', () => {
  let blueprintCompileTool: TestBlueprintCompileTool;

  beforeEach(() => {
    jest.clearAllMocks();
    blueprintCompileTool = new TestBlueprintCompileTool();
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = blueprintCompileTool.definition;
      
      expect(definition.name).toBe('blueprint_compile');
      expect(definition.description).toContain('Compile Blueprint');
      expect(definition.inputSchema).toHaveProperty('type', 'object');
    });

    it('should have correct input schema', () => {
      const schema = blueprintCompileTool.definition.inputSchema as any;
      
      expect(schema.properties).toHaveProperty('blueprintPath');
      expect(schema.required).toContain('blueprintPath');
      expect(schema.properties.blueprintPath.description).toContain('Path to the Blueprint to compile');
    });
  });

  describe('execute', () => {
    it('should compile Blueprint successfully with no errors', async () => {
      const mockResult = {
        success: true,
        compiled: true,
        has_errors: false,
        errors: [],
        warnings: []
      };

      blueprintCompileTool.testExecutePythonCommand.mockResolvedValue(mockResult);
      blueprintCompileTool.testFormatBlueprintCompileResult.mockReturnValue({
        content: [{ type: 'text', text: '✓ Blueprint compiled successfully' }]
      });

      await blueprintCompileTool.testExecute({
        blueprintPath: '/Game/TestBlueprints/BP_InteractiveDoor'
      });

      expect(blueprintCompileTool.testExecutePythonCommand).toHaveBeenCalledWith(
        'blueprint.compile',
        {
          blueprint_path: '/Game/TestBlueprints/BP_InteractiveDoor'
        }
      );
    });

    it('should handle Blueprint with compilation errors', async () => {
      const mockResult = {
        success: true,
        compiled: false,
        has_errors: true,
        errors: [
          'Missing connection on Event BeginPlay',
          'Undefined variable: PlayerReference'
        ],
        warnings: [
          'Unused variable: TempCounter'
        ]
      };

      blueprintCompileTool.testExecutePythonCommand.mockResolvedValue(mockResult);
      blueprintCompileTool.testFormatBlueprintCompileResult.mockReturnValue({
        content: [{ type: 'text', text: '✗ Blueprint compilation failed with 2 errors' }]
      });

      await blueprintCompileTool.testExecute({
        blueprintPath: '/Game/TestBlueprints/BP_BrokenDoor'
      });

      expect(blueprintCompileTool.testFormatBlueprintCompileResult).toHaveBeenCalledWith(mockResult);
    });

    it('should handle Blueprint with warnings only', async () => {
      const mockResult = {
        success: true,
        compiled: true,
        has_errors: false,
        errors: [],
        warnings: [
          'Unused variable: DebugMode',
          'Performance warning: Complex calculation in Tick event'
        ]
      };

      blueprintCompileTool.testExecutePythonCommand.mockResolvedValue(mockResult);
      blueprintCompileTool.testFormatBlueprintCompileResult.mockReturnValue({
        content: [{ type: 'text', text: '⚠ Blueprint compiled with 2 warnings' }]
      });

      await blueprintCompileTool.testExecute({
        blueprintPath: '/Game/TestBlueprints/BP_WarningDoor'
      });

      expect(blueprintCompileTool.testFormatBlueprintCompileResult).toHaveBeenCalledWith(mockResult);
    });

    it('should handle missing Blueprint path', async () => {
      await expect(blueprintCompileTool.testExecute({}))
        .rejects.toThrow();
    });

    it('should handle Blueprint not found', async () => {
      const mockResult = {
        success: false,
        error: 'Blueprint not found: /Game/NonExistent/BP_Missing'
      };

      blueprintCompileTool.testExecutePythonCommand.mockResolvedValue(mockResult);

      await expect(blueprintCompileTool.testExecute({
        blueprintPath: '/Game/NonExistent/BP_Missing'
      })).rejects.toThrow('Blueprint not found');
    });

    it('should handle Python command errors', async () => {
      blueprintCompileTool.testExecutePythonCommand.mockRejectedValue(
        new Error('Unreal Engine compilation service unavailable')
      );

      await expect(blueprintCompileTool.testExecute({
        blueprintPath: '/Game/TestBlueprints/BP_TestDoor'
      })).rejects.toThrow('Unreal Engine compilation service unavailable');
    });
  });

  describe('integration with barrel export', () => {
    it('should be properly exported from index', () => {
      expect(_blueprintCompileTool).toBeDefined();
      expect(_blueprintCompileTool.definition.name).toBe('blueprint_compile');
    });
  });
});