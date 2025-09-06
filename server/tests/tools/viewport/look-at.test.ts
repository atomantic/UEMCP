import { ViewportLookAtTool } from '../../../src/tools/viewport/look-at.js';

// Create a test class that exposes the protected methods
class TestViewportLookAtTool extends ViewportLookAtTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testExecutePythonCommand = jest.fn();
  public testFormatCameraInfo = jest.fn();
  public testViewportCommands = {
    lookAt: 'viewport.look_at',
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

describe('ViewportLookAtTool', () => {
  let lookAtTool: TestViewportLookAtTool;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    lookAtTool = new TestViewportLookAtTool();
    
    // Set up default mock implementations
    lookAtTool.testFormatCameraInfo.mockImplementation((loc: number[], rot: number[]) => 
      `Location: [${loc.join(', ')}]\nRotation: [${rot.join(', ')}]`
    );
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = lookAtTool.definition;
      
      expect(definition.name).toBe('viewport_look_at');
      expect(definition.description).toContain('Point viewport camera to look at');
      expect(definition.description).toContain('Automatically calculates correct Yaw angle');
      expect((definition.inputSchema as any).type).toBe('object');
    });

    it('should have correct target array property', () => {
      const definition = lookAtTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.target).toBeDefined();
      expect(properties.target.type).toBe('array');
      expect(properties.target.items.type).toBe('number');
      expect(properties.target.minItems).toBe(3);
      expect(properties.target.maxItems).toBe(3);
      expect(properties.target.description).toContain('Target location [X, Y, Z]');
      expect(properties.target.description).toContain('provide either target or actorName');
    });

    it('should have correct actorName property', () => {
      const definition = lookAtTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.actorName).toBeDefined();
      expect(properties.actorName.type).toBe('string');
      expect(properties.actorName.description).toContain('Name of actor to look at');
      expect(properties.actorName.description).toContain('provide either target or actorName');
    });

    it('should have correct distance property with default', () => {
      const definition = lookAtTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.distance).toBeDefined();
      expect(properties.distance.type).toBe('number');
      expect(properties.distance.description).toContain('Distance from target');
      expect(properties.distance.default).toBe(1000);
    });

    it('should have correct pitch property with default', () => {
      const definition = lookAtTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.pitch).toBeDefined();
      expect(properties.pitch.type).toBe('number');
      expect(properties.pitch.description).toContain('Camera pitch angle in degrees');
      expect(properties.pitch.default).toBe(-30);
    });

    it('should have correct height property with default', () => {
      const definition = lookAtTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.height).toBeDefined();
      expect(properties.height.type).toBe('number');
      expect(properties.height.description).toContain('Camera height offset from target');
      expect(properties.height.default).toBe(500);
    });

    it('should have correct angle property with default', () => {
      const definition = lookAtTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.angle).toBeDefined();
      expect(properties.angle.type).toBe('number');
      expect(properties.angle.description).toContain('Angle around target in degrees');
      expect(properties.angle.description).toContain('-135 for NW position');
      expect(properties.angle.default).toBe(-135);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Mock successful Python command execution
      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [1200, 1200, 500],
        rotation: [0, -30, -135],
        targetLocation: [0, 0, 0],
      });
    });

    it('should look at target coordinates', async () => {
      const args = {
        target: [100, 200, 300],
      };

      const result = await lookAtTool.testExecute(args);

      expect(lookAtTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.look_at', args);
      
      expect(result.content[0].text).toContain('✓ Camera positioned to look at location: [100, 200, 300]');
      expect(result.content[0].text).toContain('Location: [1200, 1200, 500]');
      expect(result.content[0].text).toContain('Rotation: [0, -30, -135]');
      expect(result.content[0].text).toContain('Target Location: [0.0, 0.0, 0.0]');
    });

    it('should look at actor by name', async () => {
      const args = {
        actorName: 'Monument_Orb',
      };

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [800, 800, 400],
        rotation: [0, -45, 90],
        targetLocation: [500, 500, 200],
      });

      const result = await lookAtTool.testExecute(args);

      expect(lookAtTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.look_at', args);
      
      expect(result.content[0].text).toContain('✓ Camera positioned to look at actor: Monument_Orb');
      expect(result.content[0].text).toContain('Location: [800, 800, 400]');
      expect(result.content[0].text).toContain('Rotation: [0, -45, 90]');
      expect(result.content[0].text).toContain('Target Location: [500.0, 500.0, 200.0]');
    });

    it('should look at target with all custom parameters', async () => {
      const args = {
        target: [0, 0, 0],
        distance: 1500,
        pitch: -45,
        height: 800,
        angle: -90,
      };

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [1500, 0, 800],
        rotation: [0, -45, -90],
        targetLocation: [0, 0, 0],
      });

      const result = await lookAtTool.testExecute(args);

      expect(lookAtTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.look_at', args);
      
      expect(result.content[0].text).toContain('✓ Camera positioned to look at location: [0, 0, 0]');
      expect(result.content[0].text).toContain('Location: [1500, 0, 800]');
      expect(result.content[0].text).toContain('Rotation: [0, -45, -90]');
    });

    it('should handle actor name with custom parameters', async () => {
      const args = {
        actorName: 'StaticMeshActor_123',
        distance: 750,
        pitch: -60,
        height: 300,
        angle: 45,
      };

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [530, 530, 300],
        rotation: [0, -60, 45],
        targetLocation: [100, 100, 0],
      });

      const result = await lookAtTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Camera positioned to look at actor: StaticMeshActor_123');
    });

    it('should handle result without location and rotation', async () => {
      const args = {
        target: [0, 0, 0],
      };

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        // No location or rotation
      });

      const result = await lookAtTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Camera positioned to look at location: [0, 0, 0]');
      expect(result.content[0].text).not.toContain('Location:');
      expect(result.content[0].text).not.toContain('Rotation:');
      expect(lookAtTool.testFormatCameraInfo).not.toHaveBeenCalled();
    });

    it('should handle result without targetLocation', async () => {
      const args = {
        actorName: 'TestActor',
      };

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [100, 100, 100],
        rotation: [0, 0, 0],
        // No targetLocation
      });

      const result = await lookAtTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Camera positioned to look at actor: TestActor');
      expect(result.content[0].text).not.toContain('Target Location:');
    });

    it('should handle both actorName and target (actorName takes priority)', async () => {
      const args = {
        actorName: 'PriorityActor',
        target: [100, 200, 300],
      };

      const result = await lookAtTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Camera positioned to look at actor: PriorityActor');
      expect(result.content[0].text).not.toContain('location: [100, 200, 300]');
    });

    it('should handle neither actorName nor target', async () => {
      const args = {
        distance: 1000,
        pitch: -30,
      };

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        // No location, rotation, or targetLocation
      });

      const result = await lookAtTool.testExecute(args);

      expect(result.content[0].text).toBe('✓ Camera positioned to look at ');
    });

    it('should format targetLocation with proper precision', async () => {
      const args = {
        target: [0, 0, 0],
      };

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [100, 100, 100],
        rotation: [0, 0, 0],
        targetLocation: [123.456789, 987.654321, 555.999999],
      });

      const result = await lookAtTool.testExecute(args);

      expect(result.content[0].text).toContain('Target Location: [123.5, 987.7, 556.0]');
    });

    it('should handle zero values in coordinates', async () => {
      const args = {
        target: [0, 0, 0],
      };

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [0, 0, 0],
        rotation: [0, 0, 0],
        targetLocation: [0, 0, 0],
      });

      const result = await lookAtTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Camera positioned to look at location: [0, 0, 0]');
      expect(result.content[0].text).toContain('Location: [0, 0, 0]');
      expect(result.content[0].text).toContain('Rotation: [0, 0, 0]');
      expect(result.content[0].text).toContain('Target Location: [0.0, 0.0, 0.0]');
    });

    it('should handle negative coordinates', async () => {
      const args = {
        target: [-500, -300, -100],
      };

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [-1000, -800, 400],
        rotation: [0, -30, 135],
        targetLocation: [-500, -300, -100],
      });

      const result = await lookAtTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Camera positioned to look at location: [-500, -300, -100]');
      expect(result.content[0].text).toContain('Location: [-1000, -800, 400]');
      expect(result.content[0].text).toContain('Rotation: [0, -30, 135]');
      expect(result.content[0].text).toContain('Target Location: [-500.0, -300.0, -100.0]');
    });

    it('should handle very precise coordinates', async () => {
      const args = {
        target: [1.23456789, 9.87654321, 5.55555555],
      };

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [10.123456, 20.987654, 30.555555],
        rotation: [1.1111, 2.2222, 3.3333],
        targetLocation: [1.23456789, 9.87654321, 5.55555555],
      });

      const result = await lookAtTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Camera positioned to look at location: [1.23456789, 9.87654321, 5.55555555]');
      expect(result.content[0].text).toContain('Target Location: [1.2, 9.9, 5.6]');
    });

    it('should call formatCameraInfo when location and rotation are available', async () => {
      const args = {
        actorName: 'TestActor',
      };

      const mockLocation = [100, 200, 300];
      const mockRotation = [5, -25, 90];

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: mockLocation,
        rotation: mockRotation,
      });

      await lookAtTool.testExecute(args);

      expect(lookAtTool.testFormatCameraInfo).toHaveBeenCalledWith(mockLocation, mockRotation);
    });

    it('should handle special actor names with spaces and characters', async () => {
      const args = {
        actorName: 'BP_Wall_Instance_01 (Clone)',
      };

      const result = await lookAtTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Camera positioned to look at actor: BP_Wall_Instance_01 (Clone)');
    });

    it('should handle edge case angle values', async () => {
      const testCases = [
        { angle: 0 },
        { angle: 90 },
        { angle: 180 },
        { angle: -90 },
        { angle: -180 },
        { angle: 360 },
        { angle: -360 },
      ];

      for (const testCase of testCases) {
        lookAtTool.testExecutePythonCommand.mockClear();
        
        const args = {
          target: [0, 0, 0],
          ...testCase,
        };

        await lookAtTool.testExecute(args);

        expect(lookAtTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.look_at', args);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty args object', async () => {
      const args = {};

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
      });

      const result = await lookAtTool.testExecute(args);

      expect(result.content[0].text).toBe('✓ Camera positioned to look at ');
    });

    it('should handle null/undefined values in result', async () => {
      const args = {
        target: [0, 0, 0],
      };

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: null,
        rotation: undefined,
        targetLocation: null,
      });

      const result = await lookAtTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Camera positioned to look at location: [0, 0, 0]');
      expect(result.content[0].text).not.toContain('Location:');
      expect(result.content[0].text).not.toContain('Target Location:');
    });

    it('should handle non-array targetLocation', async () => {
      const args = {
        target: [0, 0, 0],
      };

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [100, 100, 100],
        rotation: [0, 0, 0],
        targetLocation: 'not an array',
      });

      // This should throw an error because the code doesn't validate arrays
      await expect(lookAtTool.testExecute(args)).rejects.toThrow('target.map is not a function');
    });

    it('should handle extreme parameter values', async () => {
      const args = {
        target: [999999, -999999, 500000],
        distance: 0.1,
        pitch: -89.99,
        height: -1000000,
        angle: 720,
      };

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [999999.1, -999999.1, -500000],
        rotation: [0, -89.99, 720],
        targetLocation: [999999, -999999, 500000],
      });

      const result = await lookAtTool.testExecute(args);

      expect(lookAtTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.look_at', args);
      expect(result.content[0].text).toContain('Target Location: [999999.0, -999999.0, 500000.0]');
    });

    it('should return ResponseFormatter.success result', async () => {
      const args = {
        target: [0, 0, 0],
      };

      lookAtTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
      });

      const result = await lookAtTool.testExecute(args);

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
  });
});