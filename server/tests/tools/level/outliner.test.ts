import { LevelOutlinerTool } from '../../../src/tools/level/outliner.js';

// Create a test class that exposes the protected methods
class TestLevelOutlinerTool extends LevelOutlinerTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testExecutePythonCommand = jest.fn();
  public testFormatOutlinerStructure = jest.fn();
  public testLevelCommands = {
    outliner: 'level.outliner',
  };
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }

  protected formatOutlinerStructure(data: any) {
    return this.testFormatOutlinerStructure(data);
  }

  protected get levelCommands() {
    return this.testLevelCommands;
  }
}

describe('LevelOutlinerTool', () => {
  let outlinerTool: TestLevelOutlinerTool;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    outlinerTool = new TestLevelOutlinerTool();
    
    // Set up default mock implementations
    outlinerTool.testFormatOutlinerStructure.mockImplementation((data: any) => 
      `World Outliner:\nTotal Folders: ${data.totalFolders}\nTotal Actors: ${data.totalActors}`
    );
    
    outlinerTool.testExecutePythonCommand.mockResolvedValue({
      success: true,
      root: {
        children: [
          { name: 'Building', type: 'folder', children: [] },
          { name: 'Wall_01', type: 'actor' },
        ]
      },
      totalFolders: 1,
      totalActors: 5,
    });
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = outlinerTool.definition;
      
      expect(definition.name).toBe('level_outliner');
      expect(definition.description).toContain('Get the World Outliner folder structure');
      expect(definition.description).toContain('actor organization');
      expect((definition.inputSchema as any).type).toBe('object');
    });

    it('should have correct showEmpty property with default', () => {
      const definition = outlinerTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.showEmpty).toBeDefined();
      expect(properties.showEmpty.type).toBe('boolean');
      expect(properties.showEmpty.description).toBe('Show empty folders');
      expect(properties.showEmpty.default).toBe(false);
    });

    it('should have correct maxDepth property with default', () => {
      const definition = outlinerTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.maxDepth).toBeDefined();
      expect(properties.maxDepth.type).toBe('number');
      expect(properties.maxDepth.description).toBe('Maximum folder depth to display');
      expect(properties.maxDepth.default).toBe(10);
    });
  });

  describe('execute', () => {
    it('should get outliner structure with default arguments', async () => {
      const args = {};

      const _result = await outlinerTool.testExecute(args);

      expect(outlinerTool.testExecutePythonCommand).toHaveBeenCalledWith('level.outliner', args);
      
      expect(outlinerTool.testFormatOutlinerStructure).toHaveBeenCalledWith({
        root: {
          children: [
            { name: 'Building', type: 'folder', children: [] },
            { name: 'Wall_01', type: 'actor' },
          ]
        },
        totalFolders: 1,
        totalActors: 5,
      });
      
      expect(_result.content[0].text).toContain('World Outliner:');
      expect(_result.content[0].text).toContain('Total Folders: 1');
      expect(_result.content[0].text).toContain('Total Actors: 5');
    });

    it('should get outliner structure with showEmpty enabled', async () => {
      const args = {
        showEmpty: true,
      };

      outlinerTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        root: {
          children: [
            { name: 'Building', type: 'folder', children: [] },
            { name: 'EmptyFolder', type: 'folder', children: [] },
            { name: 'Wall_01', type: 'actor' },
          ]
        },
        totalFolders: 2,
        totalActors: 1,
      });

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testExecutePythonCommand).toHaveBeenCalledWith('level.outliner', args);
      
      expect(outlinerTool.testFormatOutlinerStructure).toHaveBeenCalledWith({
        root: {
          children: [
            { name: 'Building', type: 'folder', children: [] },
            { name: 'EmptyFolder', type: 'folder', children: [] },
            { name: 'Wall_01', type: 'actor' },
          ]
        },
        totalFolders: 2,
        totalActors: 1,
      });
    });

    it('should get outliner structure with custom maxDepth', async () => {
      const args = {
        maxDepth: 5,
      };

      outlinerTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        root: { children: [] },
        totalFolders: 0,
        totalActors: 0,
      });

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testExecutePythonCommand).toHaveBeenCalledWith('level.outliner', args);
      
      expect(outlinerTool.testFormatOutlinerStructure).toHaveBeenCalledWith({
        root: { children: [] },
        totalFolders: 0,
        totalActors: 0,
      });
    });

    it('should get outliner structure with both options', async () => {
      const args = {
        showEmpty: false,
        maxDepth: 3,
      };

      outlinerTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        root: {
          children: [
            { 
              name: 'Level1', 
              type: 'folder', 
              children: [
                { name: 'Level2', type: 'folder', children: [] },
                { name: 'Actor_01', type: 'actor' },
              ] 
            },
          ]
        },
        totalFolders: 2,
        totalActors: 1,
      });

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testExecutePythonCommand).toHaveBeenCalledWith('level.outliner', args);
    });

    it('should handle empty outliner structure', async () => {
      const args = {};

      outlinerTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        root: { children: [] },
        totalFolders: 0,
        totalActors: 0,
      });

      const _result = await outlinerTool.testExecute(args);

      expect(outlinerTool.testFormatOutlinerStructure).toHaveBeenCalledWith({
        root: { children: [] },
        totalFolders: 0,
        totalActors: 0,
      });
      
      expect(_result.content[0].text).toContain('Total Folders: 0');
      expect(_result.content[0].text).toContain('Total Actors: 0');
    });

    it('should handle large outliner structure', async () => {
      const args = {
        maxDepth: 10,
      };

      outlinerTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        root: {
          children: Array.from({ length: 50 }, (_, i) => ({ 
            name: `Actor_${i + 1}`, 
            type: 'actor' 
          }))
        },
        totalFolders: 0,
        totalActors: 50,
      });

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testFormatOutlinerStructure).toHaveBeenCalledWith({
        root: {
          children: expect.arrayContaining([
            { name: 'Actor_1', type: 'actor' },
            { name: 'Actor_50', type: 'actor' },
          ])
        },
        totalFolders: 0,
        totalActors: 50,
      });
    });

    it('should handle complex nested structure', async () => {
      const args = {};

      const complexStructure = {
        children: [
          {
            name: 'Building',
            type: 'folder',
            children: [
              {
                name: 'Walls',
                type: 'folder',
                children: [
                  { name: 'Wall_North_01', type: 'actor' },
                  { name: 'Wall_North_02', type: 'actor' },
                ]
              },
              { name: 'Door_Main', type: 'actor' },
            ]
          },
          { name: 'Landscape', type: 'actor' },
        ]
      };

      outlinerTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        root: complexStructure,
        totalFolders: 2,
        totalActors: 4,
      });

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testFormatOutlinerStructure).toHaveBeenCalledWith({
        root: complexStructure,
        totalFolders: 2,
        totalActors: 4,
      });
    });

    it('should handle result with missing properties', async () => {
      const args = {};

      outlinerTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        // Missing root, totalFolders, totalActors
      });

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testFormatOutlinerStructure).toHaveBeenCalledWith({
        root: undefined,
        totalFolders: undefined,
        totalActors: undefined,
      });
    });

    it('should handle result with null values', async () => {
      const args = {};

      outlinerTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        root: null,
        totalFolders: null,
        totalActors: null,
      });

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testFormatOutlinerStructure).toHaveBeenCalledWith({
        root: null,
        totalFolders: null,
        totalActors: null,
      });
    });

    it('should handle extreme values', async () => {
      const args = {
        showEmpty: true,
        maxDepth: 100,
      };

      outlinerTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        root: { children: [] },
        totalFolders: 999,
        totalActors: 9999,
      });

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testFormatOutlinerStructure).toHaveBeenCalledWith({
        root: { children: [] },
        totalFolders: 999,
        totalActors: 9999,
      });
    });

    it('should handle zero values', async () => {
      const args = {
        showEmpty: false,
        maxDepth: 0,
      };

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testExecutePythonCommand).toHaveBeenCalledWith('level.outliner', args);
    });

    it('should handle negative maxDepth', async () => {
      const args = {
        maxDepth: -5,
      };

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testExecutePythonCommand).toHaveBeenCalledWith('level.outliner', args);
    });

    it('should call executePythonCommand with correct parameters', async () => {
      const args = {
        showEmpty: true,
        maxDepth: 7,
      };

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testExecutePythonCommand).toHaveBeenCalledTimes(1);
      expect(outlinerTool.testExecutePythonCommand).toHaveBeenCalledWith('level.outliner', args);
    });

    it('should always call formatOutlinerStructure', async () => {
      const args = {};

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testFormatOutlinerStructure).toHaveBeenCalledTimes(1);
    });

    it('should return ResponseFormatter.success result', async () => {
      const args = {};

      const _result = await outlinerTool.testExecute(args);

      // Check that it returns a proper ResponseFormatter.success structure
      expect(_result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.any(String),
          },
        ],
      });
    });

    it('should handle various actor and folder names', async () => {
      const args = {};

      outlinerTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        root: {
          children: [
            { name: 'BP_Wall_Instance_01', type: 'actor' },
            { name: 'StaticMeshActor_123', type: 'actor' },
            { name: 'Folder With Spaces', type: 'folder', children: [] },
            { name: 'folder-with-dashes', type: 'folder', children: [] },
            { name: 'UPPERCASE_FOLDER', type: 'folder', children: [] },
          ]
        },
        totalFolders: 3,
        totalActors: 2,
      });

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testFormatOutlinerStructure).toHaveBeenCalledWith(
        expect.objectContaining({
          root: {
            children: expect.arrayContaining([
              { name: 'BP_Wall_Instance_01', type: 'actor' },
              { name: 'Folder With Spaces', type: 'folder', children: [] },
            ])
          },
          totalFolders: 3,
          totalActors: 2,
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle Python command failure gracefully', async () => {
      outlinerTool.testExecutePythonCommand.mockRejectedValue(new Error('Failed to get outliner'));

      const args = {};

      await expect(outlinerTool.testExecute(args)).rejects.toThrow('Failed to get outliner');
      
      expect(outlinerTool.testExecutePythonCommand).toHaveBeenCalledWith('level.outliner', args);
    });

    it('should handle mixed argument types', async () => {
      const args = {
        showEmpty: 'true' as any,  // String instead of boolean
        maxDepth: '15' as any,     // String instead of number
      };

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testExecutePythonCommand).toHaveBeenCalledWith('level.outliner', args);
    });

    it('should handle null arguments', async () => {
      const args = {
        showEmpty: null as any,
        maxDepth: null as any,
      };

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testExecutePythonCommand).toHaveBeenCalledWith('level.outliner', args);
    });

    it('should handle undefined arguments', async () => {
      const args = {
        showEmpty: undefined,
        maxDepth: undefined,
      };

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testExecutePythonCommand).toHaveBeenCalledWith('level.outliner', args);
    });

    it('should handle extra properties in args', async () => {
      const args = {
        showEmpty: true,
        maxDepth: 5,
        extraProperty: 'ignored',
        nested: { value: 'also ignored' },
      };

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testExecutePythonCommand).toHaveBeenCalledWith('level.outliner', args);
    });

    it('should handle result with invalid data types', async () => {
      const args = {};

      outlinerTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        root: 'not an object',
        totalFolders: 'not a number',
        totalActors: [1, 2, 3], // Array instead of number
      });

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testFormatOutlinerStructure).toHaveBeenCalledWith({
        root: 'not an object',
        totalFolders: 'not a number',
        totalActors: [1, 2, 3],
      });
    });

    it('should handle empty result object', async () => {
      const args = {};

      outlinerTool.testExecutePythonCommand.mockResolvedValue({});

      await outlinerTool.testExecute(args);

      expect(outlinerTool.testFormatOutlinerStructure).toHaveBeenCalledWith({
        root: undefined,
        totalFolders: undefined,
        totalActors: undefined,
      });
    });

    it('should handle formatOutlinerStructure return value', async () => {
      const args = {};

      outlinerTool.testFormatOutlinerStructure.mockReturnValue('Custom formatted outliner structure');

      const _result = await outlinerTool.testExecute(args);

      expect(_result.content[0].text).toBe('Custom formatted outliner structure');
    });

    it('should maintain consistent argument passing', async () => {
      const testCases = [
        {},
        { showEmpty: true },
        { maxDepth: 5 },
        { showEmpty: false, maxDepth: 3 },
        { showEmpty: true, maxDepth: 0 },
      ];

      for (const args of testCases) {
        outlinerTool.testExecutePythonCommand.mockClear();
        
        await outlinerTool.testExecute(args);

        expect(outlinerTool.testExecutePythonCommand).toHaveBeenCalledWith('level.outliner', args);
      }
    });
  });
});