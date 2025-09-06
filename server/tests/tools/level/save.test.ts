import { LevelSaveTool } from '../../../src/tools/level/save.js';

// Create a test class that exposes the protected methods
class TestLevelSaveTool extends LevelSaveTool {
  public async testExecute() {
    return this.execute();
  }

  public testExecutePythonCommand = jest.fn();
  public testLevelCommands = {
    save: 'level.save',
  };
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }

  protected get levelCommands() {
    return this.testLevelCommands;
  }
}

describe('LevelSaveTool', () => {
  let saveTool: TestLevelSaveTool;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    saveTool = new TestLevelSaveTool();
    
    // Set up default mock implementation
    saveTool.testExecutePythonCommand.mockResolvedValue({
      success: true,
      levelName: 'TestLevel',
      timestamp: '2023-12-01T10:30:00.000Z',
    });
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = saveTool.definition;
      
      expect(definition.name).toBe('level_save');
      expect(definition.description).toBe('Save the current level');
      expect((definition.inputSchema as any).type).toBe('object');
      expect((definition.inputSchema as any).properties).toEqual({});
    });

    it('should have empty properties object for input schema', () => {
      const definition = saveTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties).toEqual({});
      expect(Object.keys(properties)).toHaveLength(0);
    });
  });

  describe('execute', () => {
    it('should save level with level name and timestamp', async () => {
      const result = await saveTool.testExecute();

      expect(saveTool.testExecutePythonCommand).toHaveBeenCalledWith('level.save', {});
      
      expect(result.content[0].text).toContain('✓ Saved TestLevel');
      expect(result.content[0].text).toContain('Time: 2023-12-01T10:30:00.000Z');
    });

    it('should save level with custom level name', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        levelName: 'MyCustomLevel',
        timestamp: '2023-12-01T14:45:30.000Z',
      });

      const result = await saveTool.testExecute();
      
      expect(result.content[0].text).toContain('✓ Saved MyCustomLevel');
      expect(result.content[0].text).toContain('Time: 2023-12-01T14:45:30.000Z');
    });

    it('should use fallback level name when missing', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        // No levelName provided
        timestamp: '2023-12-01T16:20:15.000Z',
      });

      const result = await saveTool.testExecute();
      
      expect(result.content[0].text).toContain('✓ Saved current level');
      expect(result.content[0].text).toContain('Time: 2023-12-01T16:20:15.000Z');
    });

    it('should use fallback level name for null value', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        levelName: null,
        timestamp: '2023-12-01T16:20:15.000Z',
      });

      const result = await saveTool.testExecute();
      
      expect(result.content[0].text).toContain('✓ Saved current level');
    });

    it('should use fallback level name for empty string', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        levelName: '',
        timestamp: '2023-12-01T16:20:15.000Z',
      });

      const result = await saveTool.testExecute();
      
      expect(result.content[0].text).toContain('✓ Saved current level');
    });

    it('should generate fallback timestamp when missing', async () => {
      const beforeExecute = new Date().toISOString();
      
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        levelName: 'TestLevel',
        // No timestamp provided
      });

      const result = await saveTool.testExecute();
      
      const afterExecute = new Date().toISOString();
      
      expect(result.content[0].text).toContain('✓ Saved TestLevel');
      expect(result.content[0].text).toContain('Time: ');
      
      // Extract timestamp from result
      const text = result.content[0]!.text!;
      const timestampMatch = text.match(/Time: (.+)$/);
      expect(timestampMatch).toBeTruthy();
      
      const extractedTimestamp = timestampMatch![1];
      expect(extractedTimestamp >= beforeExecute).toBeTruthy();
      expect(extractedTimestamp <= afterExecute).toBeTruthy();
    });

    it('should generate fallback timestamp for null value', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        levelName: 'TestLevel',
        timestamp: null,
      });

      const result = await saveTool.testExecute();
      
      expect(result.content[0].text).toContain('✓ Saved TestLevel');
      expect(result.content[0].text).toContain('Time: ');
      expect(result.content[0].text).toMatch(/Time: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should generate fallback timestamp for empty string', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        levelName: 'TestLevel',
        timestamp: '',
      });

      const result = await saveTool.testExecute();
      
      expect(result.content[0].text).toContain('✓ Saved TestLevel');
      expect(result.content[0].text).toContain('Time: ');
      expect(result.content[0].text).toMatch(/Time: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should handle both missing level name and timestamp', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        // Both missing
      });

      const result = await saveTool.testExecute();
      
      expect(result.content[0].text).toContain('✓ Saved current level');
      expect(result.content[0].text).toContain('Time: ');
      expect(result.content[0].text).toMatch(/Time: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should handle level names with special characters', async () => {
      const specialNames = [
        'Level with spaces',
        'Level-with-dashes',
        'Level_with_underscores',
        'Level.with.dots',
        'Level/with/slashes',
        'Level(with)parentheses',
        'Level[with]brackets',
        'Level{with}braces',
        'Level@with#symbols$',
        'LevelWithNumbers123',
        'UPPERCASE_LEVEL',
        'lowercase_level',
        'MixedCase_Level_Name',
      ];

      for (const levelName of specialNames) {
        saveTool.testExecutePythonCommand.mockClear();
        saveTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          levelName,
          timestamp: '2023-12-01T12:00:00.000Z',
        });

        const result = await saveTool.testExecute();

        expect(result.content[0].text).toContain(`✓ Saved ${levelName}`);
        expect(saveTool.testExecutePythonCommand).toHaveBeenCalledWith('level.save', {});
      }
    });

    it('should handle various timestamp formats', async () => {
      const timestamps = [
        '2023-12-01T10:30:00.000Z',
        '2023-12-01T10:30:00Z',
        '2023-12-01 10:30:00',
        '12/01/2023 10:30 AM',
        '2023-12-01T10:30:00.123456Z',
        '2023-12-01T10:30:00-05:00',
        '2023-12-01T10:30:00+02:00',
      ];

      for (const timestamp of timestamps) {
        saveTool.testExecutePythonCommand.mockClear();
        saveTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          levelName: 'TestLevel',
          timestamp,
        });

        const result = await saveTool.testExecute();

        expect(result.content[0].text).toContain(`Time: ${timestamp}`);
      }
    });

    it('should handle very long level names', async () => {
      const veryLongName = 'A'.repeat(1000);
      
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        levelName: veryLongName,
        timestamp: '2023-12-01T12:00:00.000Z',
      });

      const result = await saveTool.testExecute();

      expect(result.content[0].text).toContain(`✓ Saved ${veryLongName}`);
    });

    it('should pass empty object to Python command', async () => {
      await saveTool.testExecute();

      expect(saveTool.testExecutePythonCommand).toHaveBeenCalledWith('level.save', {});
      expect(saveTool.testExecutePythonCommand).toHaveBeenCalledTimes(1);
    });

    it('should ignore arguments passed to execute method', async () => {
      // The execute method doesn't take arguments
      await saveTool.testExecute();

      expect(saveTool.testExecutePythonCommand).toHaveBeenCalledWith('level.save', {});
    });

    it('should return ResponseFormatter.success result', async () => {
      const result = await saveTool.testExecute();

      // Check that it returns a proper ResponseFormatter.success structure
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.any(String),
          },
        ],
      });
    });

    it('should handle non-string level name types', async () => {
      const testCases = [
        { levelName: 123, expected: '123' },
        { levelName: true, expected: 'true' },
        { levelName: false, expected: 'current level' }, // falsy, should use fallback
        { levelName: 0, expected: 'current level' }, // falsy, should use fallback
        { levelName: [], expected: '' }, // empty array is truthy (no fallback), but becomes empty string in template
        { levelName: {}, expected: '[object Object]' }, // object is truthy
      ];

      for (const { levelName, expected } of testCases) {
        saveTool.testExecutePythonCommand.mockClear();
        saveTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          levelName,
          timestamp: '2023-12-01T12:00:00.000Z',
        });

        const result = await saveTool.testExecute();

        expect(result.content[0].text).toContain(`✓ Saved ${expected}`);
      }
    });

    it('should handle non-string timestamp types', async () => {
      const testCases = [
        { timestamp: 123, expected: '123' },
        { timestamp: true, expected: 'true' },
        { timestamp: false, fallback: true }, // falsy, should use fallback
        { timestamp: [], expected: '' }, // empty array is truthy (no fallback), but becomes empty string in template
        { timestamp: {}, expected: '[object Object]' },
      ];

      for (const { timestamp, expected, fallback } of testCases) {
        saveTool.testExecutePythonCommand.mockClear();
        saveTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          levelName: 'TestLevel',
          timestamp,
        });

        const result = await saveTool.testExecute();

        if (fallback) {
          // Should generate a fallback timestamp
          expect(result.content[0].text).toContain('Time: ');
          expect(result.content[0].text).toMatch(/Time: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
        } else {
          expect(result.content[0].text).toContain(`Time: ${expected}`);
        }
      }
    });

    it('should format output consistently', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        levelName: 'TestLevel',
        timestamp: '2023-12-01T10:30:00.000Z',
      });

      const result = await saveTool.testExecute();
      
      const expectedLines = [
        '✓ Saved TestLevel',
        '  Time: 2023-12-01T10:30:00.000Z',
      ];
      
      expect(result.content[0].text).toBe(expectedLines.join('\n'));
    });

    it('should format output without timestamp section when not provided', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        levelName: 'TestLevel',
        timestamp: null,
      });

      const result = await saveTool.testExecute();
      
      // Should still include timestamp section with fallback
      expect(result.content[0].text).toContain('\n  Time: ');
    });

    it('should handle result with extra properties', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        levelName: 'TestLevel',
        timestamp: '2023-12-01T10:30:00.000Z',
        extraProperty: 'ignored',
        someOtherData: { nested: 'object' },
        anotherField: 123,
      });

      const result = await saveTool.testExecute();
      
      expect(result.content[0].text).toContain('✓ Saved TestLevel');
      expect(result.content[0].text).toContain('Time: 2023-12-01T10:30:00.000Z');
      expect(result.content[0].text).not.toContain('extraProperty');
      expect(result.content[0].text).not.toContain('someOtherData');
    });
  });

  describe('edge cases', () => {
    it('should handle Python command failure gracefully', async () => {
      saveTool.testExecutePythonCommand.mockRejectedValue(new Error('Save failed'));

      await expect(saveTool.testExecute()).rejects.toThrow('Save failed');
      
      expect(saveTool.testExecutePythonCommand).toHaveBeenCalledWith('level.save', {});
    });

    it('should handle empty result object', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue({});

      const result = await saveTool.testExecute();
      
      expect(result.content[0].text).toContain('✓ Saved current level');
      expect(result.content[0].text).toContain('Time: ');
      expect(result.content[0].text).toMatch(/Time: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should handle null result', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue(null);

      // This will likely cause a TypeError when trying to access properties
      await expect(saveTool.testExecute()).rejects.toThrow();
    });

    it('should handle undefined result', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue(undefined);

      // This will likely cause a TypeError when trying to access properties
      await expect(saveTool.testExecute()).rejects.toThrow();
    });

    it('should handle result with level name as number zero', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        levelName: 0,
        timestamp: '2023-12-01T10:30:00.000Z',
      });

      const result = await saveTool.testExecute();
      
      // 0 is falsy, so should use fallback
      expect(result.content[0].text).toContain('✓ Saved current level');
    });

    it('should handle result with timestamp as number zero', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        levelName: 'TestLevel',
        timestamp: 0,
      });

      const result = await saveTool.testExecute();
      
      // 0 is falsy, so should use fallback timestamp
      expect(result.content[0].text).toContain('Time: ');
      expect(result.content[0].text).toMatch(/Time: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should handle large timestamp values', async () => {
      const largeTimestamp = Number.MAX_SAFE_INTEGER.toString();
      
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        levelName: 'TestLevel',
        timestamp: largeTimestamp,
      });

      const result = await saveTool.testExecute();
      
      expect(result.content[0].text).toContain(`Time: ${largeTimestamp}`);
    });

    it('should always include time section when timestamp exists', async () => {
      saveTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        levelName: 'TestLevel',
        timestamp: '2023-12-01T10:30:00.000Z',
      });

      const result = await saveTool.testExecute();
      
      const text = result.content[0]!.text!;
      expect(text.split('\n')).toHaveLength(2);
      expect(result.content[0].text).toMatch(/^✓ Saved TestLevel\n  Time: .+$/);
    });
  });
});