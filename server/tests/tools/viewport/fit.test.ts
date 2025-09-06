import { ViewportFitTool } from '../../../src/tools/viewport/fit.js';

// Create a test class that exposes the protected methods
class TestViewportFitTool extends ViewportFitTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testExecutePythonCommand = jest.fn();
  public testViewportCommands = {
    fit: 'viewport.fit',
  };
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }

  protected get viewportCommands() {
    return this.testViewportCommands;
  }
}

describe('ViewportFitTool', () => {
  let fitTool: TestViewportFitTool;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    fitTool = new TestViewportFitTool();
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = fitTool.definition;
      
      expect(definition.name).toBe('viewport_fit');
      expect(definition.description).toContain('Fit actors in viewport');
      expect(definition.description).toContain('viewport_fit({ actors:');
      expect(definition.description).toContain('Auto-adjusts camera');
      expect((definition.inputSchema as any).type).toBe('object');
    });

    it('should have correct actors array property', () => {
      const definition = fitTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.actors).toBeDefined();
      expect(properties.actors.type).toBe('array');
      expect(properties.actors.items.type).toBe('string');
      expect(properties.actors.description).toContain('Specific actor names to fit');
    });

    it('should have correct filter property', () => {
      const definition = fitTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.filter).toBeDefined();
      expect(properties.filter.type).toBe('string');
      expect(properties.filter.description).toContain('Filter pattern for actor names');
      expect(properties.filter.description).toContain('used if actors not provided');
    });

    it('should have correct padding property with default', () => {
      const definition = fitTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.padding).toBeDefined();
      expect(properties.padding.type).toBe('number');
      expect(properties.padding.description).toContain('Padding percentage around actors');
      expect(properties.padding.default).toBe(20);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Mock successful Python command execution
      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 3,
        boundsCenter: [500, 300, 150],
        boundsSize: [1000, 600, 300],
      });
    });

    it('should fit specific actors', async () => {
      const args = {
        actors: ['Wall_01', 'Wall_02', 'Door_01'],
      };

      const result = await fitTool.testExecute(args);

      expect(fitTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.fit', args);
      
      expect(result.content[0].text).toContain('✓ Fitted 3 actors in viewport');
      expect(result.content[0].text).toContain('Method: Specific actors (3 provided)');
      expect(result.content[0].text).toContain('Center: [500.0, 300.0, 150.0]');
      expect(result.content[0].text).toContain('Size: [1000.0, 600.0, 300.0]');
    });

    it('should fit actors by filter', async () => {
      const args = {
        filter: 'Wall_',
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 5,
        boundsCenter: [1000, 500, 200],
        boundsSize: [2000, 1000, 400],
      });

      const result = await fitTool.testExecute(args);

      expect(fitTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.fit', args);
      
      expect(result.content[0].text).toContain('✓ Fitted 5 actors in viewport');
      expect(result.content[0].text).toContain('Method: Filter pattern "Wall_"');
      expect(result.content[0].text).toContain('Center: [1000.0, 500.0, 200.0]');
      expect(result.content[0].text).toContain('Size: [2000.0, 1000.0, 400.0]');
    });

    it('should fit with custom padding', async () => {
      const args = {
        actors: ['TestActor'],
        padding: 30,
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 1,
        boundsCenter: [0, 0, 0],
        boundsSize: [100, 100, 100],
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Fitted 1 actor in viewport');
      expect(result.content[0].text).toContain('Padding: 30%');
    });

    it('should handle single actor correctly (proper pluralization)', async () => {
      const args = {
        actors: ['SingleActor'],
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 1,
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Fitted 1 actor in viewport');
      expect(result.content[0].text).not.toContain('1 actors'); // Should be singular
    });

    it('should handle zero actors', async () => {
      const args = {
        filter: 'NonExistent_',
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 0,
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Fitted 0 actors in viewport');
      expect(result.content[0].text).toContain('Method: Filter pattern "NonExistent_"');
    });

    it('should not show padding when it is default (20)', async () => {
      const args = {
        actors: ['TestActor'],
        padding: 20, // Default value
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 1,
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).not.toContain('Padding:');
    });

    it('should not show padding when it is undefined', async () => {
      const args = {
        actors: ['TestActor'],
        // padding not provided
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 1,
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).not.toContain('Padding:');
    });

    it('should show custom padding values', async () => {
      const testCases = [0, 5, 10, 15, 25, 50, 100];

      for (const padding of testCases) {
        fitTool.testExecutePythonCommand.mockClear();
        
        const args = {
          actors: ['TestActor'],
          padding,
        };

        fitTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          fittedActors: 1,
        });

        const result = await fitTool.testExecute(args);

        expect(result.content[0].text).toContain(`Padding: ${padding}%`);
      }
    });

    it('should handle result without bounds information', async () => {
      const args = {
        actors: ['Actor1', 'Actor2'],
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 2,
        // No boundsCenter or boundsSize
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Fitted 2 actors in viewport');
      expect(result.content[0].text).not.toContain('Center:');
      expect(result.content[0].text).not.toContain('Size:');
    });

    it('should handle partial bounds information', async () => {
      const args = {
        actors: ['TestActor'],
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 1,
        boundsCenter: [100, 200, 300],
        // No boundsSize
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).not.toContain('Center:');
      expect(result.content[0].text).not.toContain('Size:');
    });

    it('should prioritize actors array over filter when both provided', async () => {
      const args = {
        actors: ['SpecificActor'],
        filter: 'FilterPattern_',
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 1,
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('Method: Specific actors (1 provided)');
      expect(result.content[0].text).not.toContain('Filter pattern');
    });

    it('should handle empty actors array correctly', async () => {
      const args = {
        actors: [],
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 0,
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Fitted 0 actors in viewport');
      expect(result.content[0].text).toContain('Method: Specific actors (0 provided)');
    });

    it('should handle neither actors nor filter provided', async () => {
      const args = {
        padding: 25,
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 10,
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Fitted 10 actors in viewport');
      expect(result.content[0].text).not.toContain('Method:');
      expect(result.content[0].text).toContain('Padding: 25%');
    });

    it('should handle missing fittedActors in result', async () => {
      const args = {
        actors: ['TestActor'],
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        // No fittedActors
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Fitted 0 actors in viewport');
    });

    it('should format bounds with proper precision', async () => {
      const args = {
        filter: 'Wall_',
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 2,
        boundsCenter: [123.456, 987.654, 555.999],
        boundsSize: [1000.123, 500.789, 250.001],
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('Center: [123.5, 987.7, 556.0]');
      expect(result.content[0].text).toContain('Size: [1000.1, 500.8, 250.0]');
    });

    it('should handle zero values in bounds', async () => {
      const args = {
        actors: ['TestActor'],
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 1,
        boundsCenter: [0, 0, 0],
        boundsSize: [0, 0, 0],
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('Center: [0.0, 0.0, 0.0]');
      expect(result.content[0].text).toContain('Size: [0.0, 0.0, 0.0]');
    });

    it('should handle negative values in bounds', async () => {
      const args = {
        actors: ['TestActor'],
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 1,
        boundsCenter: [-100, -200, -50],
        boundsSize: [500, 300, 100],
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('Center: [-100.0, -200.0, -50.0]');
      expect(result.content[0].text).toContain('Size: [500.0, 300.0, 100.0]');
    });

    it('should handle large number of actors', async () => {
      const args = {
        actors: Array.from({ length: 50 }, (_, i) => `Actor_${i + 1}`),
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 50,
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Fitted 50 actors in viewport');
      expect(result.content[0].text).toContain('Method: Specific actors (50 provided)');
    });

    it('should handle special characters in filter pattern', async () => {
      const args = {
        filter: 'BP_Wall-Instance_[01]*',
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 3,
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('Method: Filter pattern "BP_Wall-Instance_[01]*"');
    });

    it('should handle various actor name formats', async () => {
      const args = {
        actors: [
          'BP_Wall_Instance_01',
          'StaticMeshActor_2',
          'Door-With-Dashes',
          'Actor with spaces',
          'UPPERCASE_ACTOR',
        ],
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 5,
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Fitted 5 actors in viewport');
      expect(result.content[0].text).toContain('Method: Specific actors (5 provided)');
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined fittedActors', async () => {
      const args = {
        actors: ['TestActor'],
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: null,
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Fitted 0 actors in viewport');
    });

    it('should handle non-array bounds data', async () => {
      const args = {
        actors: ['TestActor'],
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 1,
        boundsCenter: 'not an array',
        boundsSize: [100, 100, 100],
      });

      // This should throw an error when trying to call .map() on non-array
      await expect(fitTool.testExecute(args)).rejects.toThrow();
    });

    it('should handle extreme padding values', async () => {
      const args = {
        actors: ['TestActor'],
        padding: -50, // Negative padding
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 1,
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('Padding: -50%');
    });

    it('should handle very high padding values', async () => {
      const args = {
        actors: ['TestActor'],
        padding: 1000, // Very high padding
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 1,
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('Padding: 1000%');
    });

    it('should handle empty string filter', async () => {
      const args = {
        filter: '',
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 0,
      });

      const result = await fitTool.testExecute(args);

      // Empty string is falsy, so no method line should be shown
      expect(result.content[0].text).toBe('✓ Fitted 0 actors in viewport');
      expect(result.content[0].text).not.toContain('Method:');
    });

    it('should handle actors array with null/undefined values', async () => {
      const args = {
        actors: ['Actor1', null, 'Actor2', undefined] as any,
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 2,
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).toContain('Method: Specific actors (4 provided)'); // Length includes null/undefined
    });

    it('should handle boundsSize without boundsCenter', async () => {
      const args = {
        actors: ['TestActor'],
      };

      fitTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        fittedActors: 1,
        boundsSize: [100, 100, 100],
        // No boundsCenter
      });

      const result = await fitTool.testExecute(args);

      expect(result.content[0].text).not.toContain('Center:');
      expect(result.content[0].text).not.toContain('Size:');
    });
  });
});