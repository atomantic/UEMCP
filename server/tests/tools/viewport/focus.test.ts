import { ViewportFocusTool } from '../../../src/tools/viewport/focus.js';

// Create a test class that exposes the protected methods
class TestViewportFocusTool extends ViewportFocusTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testExecutePythonCommand = jest.fn();
  public testViewportCommands = {
    focus: 'viewport.focus',
  };
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }

  protected get viewportCommands() {
    return this.testViewportCommands;
  }
}

describe('ViewportFocusTool', () => {
  let focusTool: TestViewportFocusTool;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    focusTool = new TestViewportFocusTool();
    
    // Set up default mock implementation
    focusTool.testExecutePythonCommand.mockResolvedValue({
      success: true,
      location: [100, 200, 300],
    });
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = focusTool.definition;
      
      expect(definition.name).toBe('viewport_focus');
      expect(definition.description).toContain('Focus viewport on specific actor');
      expect(definition.description).toContain('viewport_focus({ actorName: "Wall_01" })');
      expect(definition.description).toContain('Great for inspecting placement');
      expect((definition.inputSchema as any).type).toBe('object');
      expect((definition.inputSchema as any).required).toEqual(['actorName']);
    });

    it('should have correct actorName property as required', () => {
      const definition = focusTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.actorName).toBeDefined();
      expect(properties.actorName.type).toBe('string');
      expect(properties.actorName.description).toBe('Name of the actor to focus on');
    });

    it('should have correct preserveRotation property with default', () => {
      const definition = focusTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.preserveRotation).toBeDefined();
      expect(properties.preserveRotation.type).toBe('boolean');
      expect(properties.preserveRotation.description).toContain('Keep current camera angles');
      expect(properties.preserveRotation.description).toContain('maintaining top-down or side views');
      expect(properties.preserveRotation.default).toBe(false);
    });
  });

  describe('execute', () => {
    it('should focus on actor with minimal arguments', async () => {
      const args = {
        actorName: 'Wall_01',
      };

      const result = await focusTool.testExecute(args);

      expect(focusTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.focus', args);
      
      expect(result.content[0].text).toContain('✓ Focused viewport on: Wall_01');
      expect(result.content[0].text).toContain('Actor location: [100.0, 200.0, 300.0]');
      expect(result.content[0].text).not.toContain('Rotation: Preserved');
    });

    it('should focus on actor with preserve rotation enabled', async () => {
      const args = {
        actorName: 'Monument_Orb',
        preserveRotation: true,
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [500, 500, 150],
      });

      const result = await focusTool.testExecute(args);

      expect(focusTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.focus', args);
      
      expect(result.content[0].text).toContain('✓ Focused viewport on: Monument_Orb');
      expect(result.content[0].text).toContain('Rotation: Preserved');
      expect(result.content[0].text).toContain('Actor location: [500.0, 500.0, 150.0]');
    });

    it('should focus on actor with preserve rotation disabled', async () => {
      const args = {
        actorName: 'TestActor',
        preserveRotation: false,
      };

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Focused viewport on: TestActor');
      expect(result.content[0].text).not.toContain('Rotation: Preserved');
      expect(result.content[0].text).toContain('Actor location: [100.0, 200.0, 300.0]');
    });

    it('should handle result without location', async () => {
      const args = {
        actorName: 'NoLocationActor',
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        // No location
      });

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toBe('✓ Focused viewport on: NoLocationActor');
      expect(result.content[0].text).not.toContain('Actor location:');
    });

    it('should handle result with null location', async () => {
      const args = {
        actorName: 'NullLocationActor',
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: null,
      });

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toBe('✓ Focused viewport on: NullLocationActor');
      expect(result.content[0].text).not.toContain('Actor location:');
    });

    it('should handle result with non-array location', async () => {
      const args = {
        actorName: 'InvalidLocationActor',
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: 'not an array',
      });

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toBe('✓ Focused viewport on: InvalidLocationActor');
      expect(result.content[0].text).not.toContain('Actor location:');
    });

    it('should format location coordinates with proper precision', async () => {
      const args = {
        actorName: 'PrecisionActor',
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [123.456789, 987.654321, 555.999999],
      });

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toContain('Actor location: [123.5, 987.7, 556.0]');
    });

    it('should handle zero coordinates', async () => {
      const args = {
        actorName: 'ZeroActor',
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [0, 0, 0],
      });

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toContain('Actor location: [0.0, 0.0, 0.0]');
    });

    it('should handle negative coordinates', async () => {
      const args = {
        actorName: 'NegativeActor',
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [-100, -200, -50],
      });

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toContain('Actor location: [-100.0, -200.0, -50.0]');
    });

    it('should handle large coordinates', async () => {
      const args = {
        actorName: 'LargeActor',
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [999999, 888888, 777777],
      });

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toContain('Actor location: [999999.0, 888888.0, 777777.0]');
    });

    it('should handle fractional coordinates', async () => {
      const args = {
        actorName: 'FractionalActor',
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [1.1, 2.25, 3.999],
      });

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toContain('Actor location: [1.1, 2.3, 4.0]');
    });

    it('should handle special actor names with spaces and characters', async () => {
      const args = {
        actorName: 'BP_Wall_Instance_01 (Clone)',
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [100, 200, 300],
      });

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Focused viewport on: BP_Wall_Instance_01 (Clone)');
    });

    it('should handle both preserveRotation and location', async () => {
      const args = {
        actorName: 'CompleteActor',
        preserveRotation: true,
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [750, 250, 125],
      });

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Focused viewport on: CompleteActor');
      expect(result.content[0].text).toContain('Rotation: Preserved');
      expect(result.content[0].text).toContain('Actor location: [750.0, 250.0, 125.0]');
    });

    it('should handle empty string actor name', async () => {
      const args = {
        actorName: '',
      };

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Focused viewport on: ');
    });

    it('should pass all arguments to Python command correctly', async () => {
      const args = {
        actorName: 'TestPassthrough',
        preserveRotation: true,
      };

      await focusTool.testExecute(args);

      expect(focusTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.focus', args);
    });

    it('should handle undefined preserveRotation as falsy', async () => {
      const args = {
        actorName: 'UndefinedRotationActor',
        preserveRotation: undefined,
      };

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Focused viewport on: UndefinedRotationActor');
      expect(result.content[0].text).not.toContain('Rotation: Preserved');
    });

    it('should handle result with additional properties', async () => {
      const args = {
        actorName: 'ExtraPropsActor',
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [100, 200, 300],
        extraProperty: 'ignored',
        rotation: [0, 0, 0], // Not used by this tool
      });

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Focused viewport on: ExtraPropsActor');
      expect(result.content[0].text).toContain('Actor location: [100.0, 200.0, 300.0]');
      expect(result.content[0].text).not.toContain('extraProperty');
    });

    it('should handle location array with wrong length', async () => {
      const args = {
        actorName: 'WrongLengthActor',
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [100, 200], // Only 2 elements instead of 3
      });

      const result = await focusTool.testExecute(args);

      // Should still process it as an array
      expect(result.content[0].text).toContain('Actor location: [100.0, 200.0]');
    });

    it('should handle location array with non-numeric values', async () => {
      const args = {
        actorName: 'NonNumericActor',
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: ['100', '200', '300'], // Strings instead of numbers
      });

      // This should throw an error because the code doesn't validate number types
      await expect(focusTool.testExecute(args)).rejects.toThrow('n.toFixed is not a function');
    });
  });

  describe('edge cases', () => {
    it('should handle Python command failure gracefully', async () => {
      focusTool.testExecutePythonCommand.mockRejectedValue(new Error('Actor not found'));

      const args = {
        actorName: 'NonExistentActor',
      };

      await expect(focusTool.testExecute(args)).rejects.toThrow('Actor not found');
      
      expect(focusTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.focus', args);
    });

    it('should handle complex actor names', async () => {
      const complexNames = [
        'StaticMeshActor_123456789',
        'BP_Modular_Wall_Corner_Instance',
        'Actor-With-Dashes_And_Underscores',
        'Actor with spaces and (parentheses)',
        'UPPERCASE_ACTOR_NAME',
        'lowercase_actor_name',
        'MixedCase_Actor_Name_123',
        'Actor/With/Slashes',
        'Actor.With.Dots',
        'Åctor_Wïth_Spéciål_Chårs',
      ];

      for (const actorName of complexNames) {
        focusTool.testExecutePythonCommand.mockClear();
        
        const args = { actorName };
        const result = await focusTool.testExecute(args);

        expect(focusTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.focus', args);
        expect(result.content[0].text).toContain(`✓ Focused viewport on: ${actorName}`);
      }
    });

    it('should return ResponseFormatter.success result', async () => {
      const args = {
        actorName: 'FormatTestActor',
      };

      const result = await focusTool.testExecute(args);

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

    it('should handle mixed truthy/falsy preserveRotation values', async () => {
      const testCases = [
        { preserveRotation: true, expectPreserved: true },
        { preserveRotation: false, expectPreserved: false },
        { preserveRotation: 1 as any, expectPreserved: true },
        { preserveRotation: 0 as any, expectPreserved: false },
        { preserveRotation: 'true' as any, expectPreserved: true },
        { preserveRotation: '' as any, expectPreserved: false },
        { preserveRotation: null as any, expectPreserved: false },
      ];

      for (const { preserveRotation, expectPreserved } of testCases) {
        focusTool.testExecutePythonCommand.mockClear();
        
        const args = {
          actorName: 'TestActor',
          preserveRotation,
        };

        const result = await focusTool.testExecute(args);

        if (expectPreserved) {
          expect(result.content[0].text).toContain('Rotation: Preserved');
        } else {
          expect(result.content[0].text).not.toContain('Rotation: Preserved');
        }
      }
    });

    it('should handle very long actor names', async () => {
      const veryLongName = 'A'.repeat(1000);
      const args = {
        actorName: veryLongName,
      };

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toContain(`✓ Focused viewport on: ${veryLongName}`);
    });

    it('should handle location with extreme values', async () => {
      const args = {
        actorName: 'ExtremeActor',
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.POSITIVE_INFINITY],
      });

      const result = await focusTool.testExecute(args);

      // Should handle extreme values gracefully
      expect(result.content[0].text).toContain('Actor location:');
    });

    it('should handle empty location array', async () => {
      const args = {
        actorName: 'EmptyLocationActor',
      };

      focusTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [],
      });

      const result = await focusTool.testExecute(args);

      expect(result.content[0].text).toContain('Actor location: []');
    });
  });
});