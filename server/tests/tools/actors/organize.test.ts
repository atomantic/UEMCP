import { ActorOrganizeTool } from '../../../src/tools/actors/organize.js';
import { ResponseFormatter } from '../../../src/utils/response-formatter.js';

// Create a test class that exposes the protected methods
class TestActorOrganizeTool extends ActorOrganizeTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testExecutePythonCommand = jest.fn();
  public testBuildSuccessResponse = jest.fn();
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }

  protected buildSuccessResponse(text: string, result: any) {
    return this.testBuildSuccessResponse(text, result);
  }
}

describe('ActorOrganizeTool', () => {
  let organizeTool: TestActorOrganizeTool;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    organizeTool = new TestActorOrganizeTool();
    
    // Set up default mock implementations
    organizeTool.testBuildSuccessResponse.mockImplementation((text: string, _result: any) => 
      ResponseFormatter.success(text)
    );
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = organizeTool.definition;
      
      expect(definition.name).toBe('actor_organize');
      expect(definition.description).toContain('Organize existing actors into folders');
      expect(definition.description).toContain('World Outliner');
      expect((definition.inputSchema as any).type).toBe('object');
      expect((definition.inputSchema as any).required).toEqual(['folder']);
    });

    it('should have correct folder property as required', () => {
      const definition = organizeTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.folder).toBeDefined();
      expect(properties.folder.type).toBe('string');
      expect(properties.folder.description).toContain('Target folder path');
      expect(properties.folder.description).toContain('Estate/House');
    });

    it('should have optional actors array property', () => {
      const definition = organizeTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.actors).toBeDefined();
      expect(properties.actors.type).toBe('array');
      expect(properties.actors.items.type).toBe('string');
      expect(properties.actors.description).toContain('List of specific actor names');
      expect((definition.inputSchema as any).required).not.toContain('actors');
    });

    it('should have optional pattern property', () => {
      const definition = organizeTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.pattern).toBeDefined();
      expect(properties.pattern.type).toBe('string');
      expect(properties.pattern.description).toContain('Pattern to match actor names');
      expect(properties.pattern.description).toContain('Wall_');
      expect(properties.pattern.description).toContain('Corner_');
      expect((definition.inputSchema as any).required).not.toContain('pattern');
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Mock successful Python command execution
      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 3,
        organizedActors: ['Wall_01', 'Wall_02', 'Door_01'],
      });
    });

    it('should organize actors with minimal arguments (folder only)', async () => {
      const args = {
        folder: 'Building/Walls',
      };

      await organizeTool.testExecute(args);

      expect(organizeTool.testExecutePythonCommand).toHaveBeenCalledWith('actor.organize', args);
      
      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Organized 3 actors into folder: Building/Walls');
      expect(buildResponseCall).toContain('Organized actors:');
      expect(buildResponseCall).toContain('- Wall_01');
      expect(buildResponseCall).toContain('- Wall_02');
      expect(buildResponseCall).toContain('- Door_01');
    });

    it('should organize specific actors', async () => {
      const args = {
        folder: 'House/Doors',
        actors: ['Door_01', 'Door_02', 'Window_01'],
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 3,
        organizedActors: ['Door_01', 'Door_02', 'Window_01'],
      });

      await organizeTool.testExecute(args);

      expect(organizeTool.testExecutePythonCommand).toHaveBeenCalledWith('actor.organize', args);
      
      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Organized 3 actors into folder: House/Doors');
      expect(buildResponseCall).toContain('Method: Specific actors (3 provided)');
      expect(buildResponseCall).toContain('- Door_01');
      expect(buildResponseCall).toContain('- Door_02');
      expect(buildResponseCall).toContain('- Window_01');
    });

    it('should organize actors by pattern', async () => {
      const args = {
        folder: 'Building/Walls',
        pattern: 'Wall_',
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 5,
        organizedActors: ['Wall_01', 'Wall_02', 'Wall_03', 'Wall_04', 'Wall_05'],
      });

      await organizeTool.testExecute(args);

      expect(organizeTool.testExecutePythonCommand).toHaveBeenCalledWith('actor.organize', args);
      
      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Organized 5 actors into folder: Building/Walls');
      expect(buildResponseCall).toContain('Method: Pattern matching "Wall_"');
      expect(buildResponseCall).toContain('- Wall_01');
      expect(buildResponseCall).toContain('- Wall_05');
    });

    it('should handle single actor correctly (proper pluralization)', async () => {
      const args = {
        folder: 'Special',
        actors: ['UniqueActor'],
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 1,
        organizedActors: ['UniqueActor'],
      });

      await organizeTool.testExecute(args);

      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Organized 1 actor into folder: Special');
      expect(buildResponseCall).not.toContain('1 actors'); // Should be singular
      expect(buildResponseCall).toContain('Method: Specific actors (1 provided)');
    });

    it('should handle zero actors', async () => {
      const args = {
        folder: 'Empty',
        pattern: 'NonExistent_',
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 0,
        organizedActors: [],
      });

      await organizeTool.testExecute(args);

      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Organized 0 actors into folder: Empty');
      expect(buildResponseCall).toContain('Method: Pattern matching "NonExistent_"');
      expect(buildResponseCall).not.toContain('Organized actors:');
    });

    it('should handle large number of actors with truncation', async () => {
      const args = {
        folder: 'ManyActors',
        pattern: 'Actor_',
      };

      // Create 15 actors
      const manyActors = Array.from({ length: 15 }, (_, i) => `Actor_${i + 1}`);

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 15,
        organizedActors: manyActors,
      });

      await organizeTool.testExecute(args);

      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Organized 15 actors into folder: ManyActors');
      expect(buildResponseCall).toContain('Method: Pattern matching "Actor_"');
      expect(buildResponseCall).toContain('- Actor_1');
      expect(buildResponseCall).toContain('- Actor_10');
      expect(buildResponseCall).toContain('... and 5 more');
      expect(buildResponseCall).not.toContain('Actor_11'); // Should be truncated
    });

    it('should handle exactly 10 actors without truncation message', async () => {
      const args = {
        folder: 'ExactlyTen',
      };

      const tenActors = Array.from({ length: 10 }, (_, i) => `Actor_${i + 1}`);

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 10,
        organizedActors: tenActors,
      });

      await organizeTool.testExecute(args);

      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Organized 10 actors into folder: ExactlyTen');
      expect(buildResponseCall).toContain('- Actor_10');
      expect(buildResponseCall).not.toContain('... and');
    });

    it('should prioritize actors array over pattern when both provided', async () => {
      const args = {
        folder: 'Priority',
        actors: ['SpecificActor'],
        pattern: 'Pattern_',
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 1,
        organizedActors: ['SpecificActor'],
      });

      await organizeTool.testExecute(args);

      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('Method: Specific actors (1 provided)');
      expect(buildResponseCall).not.toContain('Pattern matching');
    });

    it('should handle empty actors array correctly', async () => {
      const args = {
        folder: 'EmptyArray',
        actors: [],
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 0,
        organizedActors: [],
      });

      await organizeTool.testExecute(args);

      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Organized 0 actors into folder: EmptyArray');
      expect(buildResponseCall).not.toContain('Method:'); // No method should be shown
    });

    it('should handle missing count and organizedActors in result', async () => {
      const args = {
        folder: 'MissingData',
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        // No count or organizedActors
      });

      await organizeTool.testExecute(args);

      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Organized 0 actors into folder: MissingData');
      expect(buildResponseCall).not.toContain('Organized actors:');
    });

    it('should handle non-array organizedActors in result (truthy)', async () => {
      const args = {
        folder: 'NonArrayActors',
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 2,
        organizedActors: 'not an array',
      });

      // This should throw an error because the code doesn't properly validate arrays
      await expect(organizeTool.testExecute(args)).rejects.toThrow('organizedActors.slice(...).forEach is not a function');
    });

    it('should handle falsy non-array organizedActors in result', async () => {
      const args = {
        folder: 'FalsyActors',
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 1,
        organizedActors: null, // Falsy, should get fallback []
      });

      await organizeTool.testExecute(args);

      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Organized 1 actor into folder: FalsyActors');
      expect(buildResponseCall).not.toContain('Organized actors:');
    });

    it('should handle deep folder paths', async () => {
      const args = {
        folder: 'Level1/Level2/Level3/DeepFolder',
        actors: ['DeepActor'],
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 1,
        organizedActors: ['DeepActor'],
      });

      await organizeTool.testExecute(args);

      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Organized 1 actor into folder: Level1/Level2/Level3/DeepFolder');
    });

    it('should call buildSuccessResponse with correct parameters', async () => {
      const args = {
        folder: 'TestFolder',
        actors: ['TestActor'],
      };

      const mockResult = {
        success: true,
        count: 1,
        organizedActors: ['TestActor'],
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue(mockResult);

      await organizeTool.testExecute(args);

      expect(organizeTool.testBuildSuccessResponse).toHaveBeenCalledWith(
        expect.stringContaining('✓ Organized 1 actor into folder: TestFolder'),
        mockResult
      );
    });

    it('should trim trailing whitespace from text', async () => {
      const args = {
        folder: 'TrimTest',
        pattern: 'Test_',
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 0,
        organizedActors: [],
      });

      await organizeTool.testExecute(args);

      // The text should end with the pattern line, and trimEnd() should be called
      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toMatch(/Pattern matching "Test_"$/);
      expect(buildResponseCall).not.toMatch(/Pattern matching "Test_"\s+$/);
    });

    it('should handle various actor name formats', async () => {
      const args = {
        folder: 'Various',
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 5,
        organizedActors: [
          'BP_Wall_Instance_01',
          'StaticMeshActor_2',
          'Door-With-Dashes',
          'Actor with spaces',
          'UPPERCASE_ACTOR',
        ],
      });

      await organizeTool.testExecute(args);

      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('- BP_Wall_Instance_01');
      expect(buildResponseCall).toContain('- StaticMeshActor_2');
      expect(buildResponseCall).toContain('- Door-With-Dashes');
      expect(buildResponseCall).toContain('- Actor with spaces');
      expect(buildResponseCall).toContain('- UPPERCASE_ACTOR');
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined count gracefully', async () => {
      const args = {
        folder: 'NullCount',
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: null,
        organizedActors: undefined,
      });

      await organizeTool.testExecute(args);

      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Organized 0 actors into folder: NullCount');
    });

    it('should handle special characters in folder name', async () => {
      const args = {
        folder: 'Folder/With-Special_Characters & Symbols',
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 1,
        organizedActors: ['TestActor'],
      });

      await organizeTool.testExecute(args);

      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Organized 1 actor into folder: Folder/With-Special_Characters & Symbols');
    });

    it('should handle empty string folder', async () => {
      const args = {
        folder: '',
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 1,
        organizedActors: ['Actor'],
      });

      await organizeTool.testExecute(args);

      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('✓ Organized 1 actor into folder: ');
    });

    it('should handle actors array with undefined/null values', async () => {
      const args = {
        folder: 'WithNulls',
        actors: ['Actor1', null, 'Actor2', undefined] as any,
      };

      organizeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        count: 2,
        organizedActors: ['Actor1', 'Actor2'],
      });

      await organizeTool.testExecute(args);

      const buildResponseCall = organizeTool.testBuildSuccessResponse.mock.calls[0][0];
      expect(buildResponseCall).toContain('Method: Specific actors (4 provided)'); // Length includes null/undefined
      expect(buildResponseCall).toContain('- Actor1');
      expect(buildResponseCall).toContain('- Actor2');
    });
  });
});