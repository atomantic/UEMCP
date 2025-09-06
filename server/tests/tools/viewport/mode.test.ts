import { ViewportModeTool } from '../../../src/tools/viewport/mode.js';

// Create a test class that exposes the protected methods
class TestViewportModeTool extends ViewportModeTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testExecutePythonCommand = jest.fn();
  public testFormatCameraInfo = jest.fn();
  public testViewportCommands = {
    mode: 'viewport.mode',
  };
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }

  protected formatCameraInfo(location: number[], rotation: number[]) {
    return this.testFormatCameraInfo(location, rotation);
  }

  protected get viewportCommands() {
    return this.testViewportCommands;
  }
}

describe('ViewportModeTool', () => {
  let modeTool: TestViewportModeTool;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    modeTool = new TestViewportModeTool();
    
    // Set up default mock implementations
    modeTool.testFormatCameraInfo.mockImplementation((loc: any, rot: any) => 
      `Location: [${Array.isArray(loc) ? loc.join(', ') : 'invalid'}]\nRotation: [${Array.isArray(rot) ? rot.join(', ') : 'invalid'}]`
    );
    
    modeTool.testExecutePythonCommand.mockResolvedValue({
      success: true,
      location: [1000, 500, 800],
      rotation: [0, -90, 0],
    });
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = modeTool.definition;
      
      expect(definition.name).toBe('viewport_mode');
      expect(definition.description).toContain('Position camera for standard views');
      expect(definition.description).toContain('viewport_mode({ mode: "top" })');
      expect(definition.description).toContain('Auto-centers on selected actors');
      expect(definition.description).toContain('Positions camera only (UE limitation)');
      expect((definition.inputSchema as any).type).toBe('object');
      expect((definition.inputSchema as any).required).toEqual(['mode']);
    });

    it('should have correct mode enum property', () => {
      const definition = modeTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.mode).toBeDefined();
      expect(properties.mode.type).toBe('string');
      expect(properties.mode.description).toBe('Viewport mode');
      
      const expectedModes = ['perspective', 'top', 'bottom', 'left', 'right', 'front', 'back'];
      expect(properties.mode.enum).toEqual(expectedModes);
    });
  });

  describe('execute', () => {
    it('should set perspective view', async () => {
      const args = { mode: 'perspective' as const };

      const result = await modeTool.testExecute(args);

      expect(modeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.mode', args);
      
      expect(result.content[0].text).toContain('✓ Viewport set to perspective view');
      expect(result.content[0].text).toContain('Location: [1000, 500, 800]');
      expect(result.content[0].text).toContain('Rotation: [0, -90, 0]');
      expect(modeTool.testFormatCameraInfo).toHaveBeenCalledWith([1000, 500, 800], [0, -90, 0]);
    });

    it('should set top view', async () => {
      const args = { mode: 'top' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [500, 500, 2000],
        rotation: [0, -90, 0],
      });

      const result = await modeTool.testExecute(args);

      expect(modeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.mode', args);
      
      expect(result.content[0].text).toContain('✓ Viewport set to top view');
      expect(result.content[0].text).toContain('Location: [500, 500, 2000]');
      expect(result.content[0].text).toContain('Rotation: [0, -90, 0]');
      expect(modeTool.testFormatCameraInfo).toHaveBeenCalledWith([500, 500, 2000], [0, -90, 0]);
    });

    it('should set bottom view', async () => {
      const args = { mode: 'bottom' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [500, 500, -2000],
        rotation: [0, 90, 0],
      });

      const result = await modeTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Viewport set to bottom view');
      expect(modeTool.testFormatCameraInfo).toHaveBeenCalledWith([500, 500, -2000], [0, 90, 0]);
    });

    it('should set left view', async () => {
      const args = { mode: 'left' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [-1500, 500, 400],
        rotation: [0, 0, 90],
      });

      const result = await modeTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Viewport set to left view');
      expect(modeTool.testFormatCameraInfo).toHaveBeenCalledWith([-1500, 500, 400], [0, 0, 90]);
    });

    it('should set right view', async () => {
      const args = { mode: 'right' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [1500, 500, 400],
        rotation: [0, 0, -90],
      });

      const result = await modeTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Viewport set to right view');
      expect(modeTool.testFormatCameraInfo).toHaveBeenCalledWith([1500, 500, 400], [0, 0, -90]);
    });

    it('should set front view', async () => {
      const args = { mode: 'front' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [500, -1500, 400],
        rotation: [0, 0, 0],
      });

      const result = await modeTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Viewport set to front view');
      expect(modeTool.testFormatCameraInfo).toHaveBeenCalledWith([500, -1500, 400], [0, 0, 0]);
    });

    it('should set back view', async () => {
      const args = { mode: 'back' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [500, 1500, 400],
        rotation: [0, 0, 180],
      });

      const result = await modeTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Viewport set to back view');
      expect(modeTool.testFormatCameraInfo).toHaveBeenCalledWith([500, 1500, 400], [0, 0, 180]);
    });

    it('should test all viewport modes systematically', async () => {
      const modes = ['perspective', 'top', 'bottom', 'left', 'right', 'front', 'back'] as const;

      for (const mode of modes) {
        modeTool.testExecutePythonCommand.mockClear();
        modeTool.testFormatCameraInfo.mockClear();
        
        const args = { mode };

        modeTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          location: [100, 200, 300],
          rotation: [1, 2, 3],
        });

        const result = await modeTool.testExecute(args);

        expect(modeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.mode', args);
        expect(result.content[0].text).toContain(`✓ Viewport set to ${mode} view`);
        expect(modeTool.testFormatCameraInfo).toHaveBeenCalledWith([100, 200, 300], [1, 2, 3]);
      }
    });

    it('should handle result without location and rotation', async () => {
      const args = { mode: 'perspective' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        // No location or rotation
      });

      const result = await modeTool.testExecute(args);

      expect(result.content[0].text).toBe('✓ Viewport set to perspective view');
      expect(modeTool.testFormatCameraInfo).not.toHaveBeenCalled();
    });

    it('should handle result with only location', async () => {
      const args = { mode: 'top' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [100, 200, 300],
        // No rotation
      });

      const result = await modeTool.testExecute(args);

      expect(result.content[0].text).toBe('✓ Viewport set to top view');
      expect(modeTool.testFormatCameraInfo).not.toHaveBeenCalled();
    });

    it('should handle result with only rotation', async () => {
      const args = { mode: 'front' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        rotation: [0, 0, 90],
        // No location
      });

      const result = await modeTool.testExecute(args);

      expect(result.content[0].text).toBe('✓ Viewport set to front view');
      expect(modeTool.testFormatCameraInfo).not.toHaveBeenCalled();
    });

    it('should handle result with custom message override', async () => {
      const args = { mode: 'perspective' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [100, 200, 300],
        rotation: [0, 0, 0],
        message: 'Custom viewport message from Python',
      });

      const result = await modeTool.testExecute(args);

      // When message is provided, it should override the default text completely
      expect(result.content[0].text).toBe('Custom viewport message from Python');
      expect(result.content[0].text).not.toContain('✓ Viewport set to perspective view');
      // formatCameraInfo is called during normal flow, but message overrides the final text
    });

    it('should handle numeric message as string', async () => {
      const args = { mode: 'top' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        message: 12345,
      });

      const result = await modeTool.testExecute(args);

      expect(result.content[0].text).toBe('12345');
    });

    it('should handle boolean message as string', async () => {
      const args = { mode: 'left' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        message: true,
      });

      const result = await modeTool.testExecute(args);

      expect(result.content[0].text).toBe('true');
    });

    it('should handle null message as string', async () => {
      const args = { mode: 'right' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        message: null,
      });

      const result = await modeTool.testExecute(args);

      // null is falsy, so should use normal flow instead of message override
      expect(result.content[0].text).toContain('✓ Viewport set to right view');
    });

    it('should handle undefined message normally', async () => {
      const args = { mode: 'back' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [500, 500, 500],
        rotation: [0, 0, 0],
        message: undefined,
      });

      const result = await modeTool.testExecute(args);

      // undefined is falsy, so should use normal flow
      expect(result.content[0].text).toContain('✓ Viewport set to back view');
      expect(modeTool.testFormatCameraInfo).toHaveBeenCalled();
    });

    it('should handle empty string message', async () => {
      const args = { mode: 'perspective' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        message: '',
      });

      const result = await modeTool.testExecute(args);

      // Empty string is falsy, so should use normal flow
      expect(result.content[0].text).toContain('✓ Viewport set to perspective view');
    });

    it('should call executePythonCommand with correct parameters', async () => {
      const args = { mode: 'top' as const };

      await modeTool.testExecute(args);

      expect(modeTool.testExecutePythonCommand).toHaveBeenCalledTimes(1);
      expect(modeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.mode', args);
    });

    it('should handle complex location and rotation values', async () => {
      const args = { mode: 'perspective' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [-999.123, 1234.567, 0.001],
        rotation: [359.999, -180.0, 90.5],
      });

      const result = await modeTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Viewport set to perspective view');
      expect(modeTool.testFormatCameraInfo).toHaveBeenCalledWith([-999.123, 1234.567, 0.001], [359.999, -180.0, 90.5]);
    });

    it('should handle zero values in location and rotation', async () => {
      const args = { mode: 'perspective' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [0, 0, 0],
        rotation: [0, 0, 0],
      });

      await modeTool.testExecute(args);

      expect(modeTool.testFormatCameraInfo).toHaveBeenCalledWith([0, 0, 0], [0, 0, 0]);
    });

    it('should maintain consistent response format', async () => {
      const args = { mode: 'top' as const };

      const result = await modeTool.testExecute(args);

      // All responses should have the same structure
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.any(String),
          },
        ],
      });
    });
  });

  describe('edge cases', () => {
    it('should handle Python command failure gracefully', async () => {
      modeTool.testExecutePythonCommand.mockRejectedValue(new Error('Invalid viewport mode'));

      const args = { mode: 'perspective' as const };

      await expect(modeTool.testExecute(args)).rejects.toThrow('Invalid viewport mode');
      
      expect(modeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.mode', args);
    });

    it('should handle non-string location and rotation', async () => {
      const args = { mode: 'top' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: 'not an array',
        rotation: { x: 0, y: 0, z: 0 },
      });

      const result = await modeTool.testExecute(args);

      // The condition checks truthy values, so non-arrays are still passed
      expect(result.content[0].text).toContain('✓ Viewport set to top view');
      expect(result.content[0].text).toContain('Location: [invalid]');
      expect(modeTool.testFormatCameraInfo).toHaveBeenCalledWith('not an array', { x: 0, y: 0, z: 0 });
    });

    it('should handle unknown mode gracefully', async () => {
      // This would be caught by TypeScript in practice, but testing runtime behavior
      const args = { mode: 'unknown_mode' as any };

      const result = await modeTool.testExecute(args);

      expect(modeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.mode', args);
      expect(result.content[0].text).toContain('✓ Viewport set to unknown_mode view');
    });

    it('should return ResponseFormatter.success result', async () => {
      const args = { mode: 'perspective' as const };

      const result = await modeTool.testExecute(args);

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

    it('should handle object message correctly', async () => {
      const args = { mode: 'perspective' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        message: { complex: 'object', with: ['nested', 'values'] },
      });

      const result = await modeTool.testExecute(args);

      expect(result.content[0].text).toBe('[object Object]');
    });

    it('should handle message that evaluates to false', async () => {
      const falseValues = [false, 0, '', null, undefined, NaN];

      for (const falseValue of falseValues) {
        modeTool.testExecutePythonCommand.mockClear();
        modeTool.testFormatCameraInfo.mockClear();
        
        const args = { mode: 'perspective' as const };

        modeTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          location: [100, 200, 300],
          rotation: [1, 2, 3],
          message: falseValue,
        });

        const result = await modeTool.testExecute(args);

        if (falseValue === false || falseValue === 0) {
          // These are falsy, so uses normal flow instead of message override
          expect(result.content[0].text).toContain('✓ Viewport set to perspective view');
          expect(modeTool.testFormatCameraInfo).toHaveBeenCalled();
        } else if (falseValue === null) {
          // null is falsy, so uses normal flow
          expect(result.content[0].text).toContain('✓ Viewport set to perspective view');
          expect(modeTool.testFormatCameraInfo).toHaveBeenCalled();
        } else if (falseValue === '' || falseValue === undefined) {
          // These are falsy, so use normal flow
          expect(result.content[0].text).toContain('✓ Viewport set to perspective view');
          expect(modeTool.testFormatCameraInfo).toHaveBeenCalled();
        } else if (Number.isNaN(falseValue)) {
          // NaN is falsy, so uses normal flow
          expect(result.content[0].text).toContain('✓ Viewport set to perspective view');
          expect(modeTool.testFormatCameraInfo).toHaveBeenCalled();
        }
      }
    });

    it('should handle result with additional unrelated properties', async () => {
      const args = { mode: 'top' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [100, 200, 300],
        rotation: [0, 0, 0],
        extraProperty: 'ignored',
        anotherProp: 12345,
        nested: { object: 'also ignored' },
      });

      const result = await modeTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Viewport set to top view');
      expect(modeTool.testFormatCameraInfo).toHaveBeenCalledWith([100, 200, 300], [0, 0, 0]);
    });

    it('should handle empty result object', async () => {
      const args = { mode: 'perspective' as const };

      modeTool.testExecutePythonCommand.mockResolvedValue({});

      const result = await modeTool.testExecute(args);

      expect(result.content[0].text).toBe('✓ Viewport set to perspective view');
      expect(modeTool.testFormatCameraInfo).not.toHaveBeenCalled();
    });
  });
});