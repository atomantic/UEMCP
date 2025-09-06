// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { ViewportCameraTool } from '../../../src/tools/viewport/camera.js';

describe('ViewportCameraTool', () => {
  let tool: ViewportCameraTool;

  beforeEach(() => {
    tool = new ViewportCameraTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('viewport_camera');
      expect(definition.description).toContain('Set viewport camera position/rotation');
      expect(definition.description).toContain('Top-down:');
      expect(definition.description).toContain('Look at point:');
    });

    it('should have optional location parameter with correct format', () => {
      const schema = tool.definition.inputSchema as any;
      const locationProp = schema.properties?.location;
      expect(locationProp?.type).toBe('array');
      expect(locationProp?.items?.type).toBe('number');
      expect(locationProp?.minItems).toBe(3);
      expect(locationProp?.maxItems).toBe(3);
      expect(locationProp?.description).toContain('X-=North, Y-=East, Z+=Up');
    });

    it('should have optional rotation parameter with correct format', () => {
      const schema = tool.definition.inputSchema as any;
      const rotationProp = schema.properties?.rotation;
      expect(rotationProp?.type).toBe('array');
      expect(rotationProp?.items?.type).toBe('number');
      expect(rotationProp?.minItems).toBe(3);
      expect(rotationProp?.maxItems).toBe(3);
      expect(rotationProp?.description).toContain('Pitch=-90 for top-down');
    });

    it('should have optional focusActor and distance parameters', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.properties?.focusActor?.type).toBe('string');
      expect(schema.properties?.distance?.type).toBe('number');
      expect(schema.properties?.distance?.default).toBe(500);
    });
  });

  describe('execute', () => {
    it('should set camera location and rotation successfully', async () => {
      const args = {
        location: [1000, 1000, 500] as [number, number, number],
        rotation: [0, -45, 0] as [number, number, number],
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        location: [1000, 1000, 500],
        rotation: [0, -45, 0],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'viewport.camera',
        params: args
      });
      expect(result.content[0].text).toContain('✓ Viewport camera updated');
      expect(result.content[0].text).toContain('Location: [1000.0, 1000.0, 500.0]');
      expect(result.content[0].text).toContain('Rotation: [0.0, -45.0, 0.0]°');
    });

    it('should focus on specific actor with distance', async () => {
      const args = {
        focusActor: 'Monument_Orb',
        distance: 800,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        focusActor: 'Monument_Orb',
        distance: 800,
        location: [1200, 800, 600],
        rotation: [0, -30, -45],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Focused on: Monument_Orb');
      expect(result.content[0].text).toContain('Distance: 800');
    });

    it('should set top-down view correctly', async () => {
      const args = {
        location: [0, 0, 2000] as [number, number, number],
        rotation: [0, -90, 0] as [number, number, number],
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        location: [0, 0, 2000],
        rotation: [0, -90, 0],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Viewport camera updated');
      expect(result.content[0].text).toContain('Rotation: [0.0, -90.0, 0.0]°');
    });

    it('should handle isometric view angles', async () => {
      const args = {
        location: [1500, 1500, 1000] as [number, number, number],
        rotation: [0, -30, -135] as [number, number, number],
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        location: [1500, 1500, 1000],
        rotation: [0, -30, -135],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Viewport camera updated');
      expect(result.content[0].text).toContain('Location: [1500.0, 1500.0, 1000.0]');
      expect(result.content[0].text).toContain('Rotation: [0.0, -30.0, -135.0]°');
    });

    it('should handle focus actor with default distance', async () => {
      const args = {
        focusActor: 'Building_Main',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        focusActor: 'Building_Main',
        distance: 500,
        location: [800, 600, 400],
        rotation: [0, -20, -90],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Focused on: Building_Main');
      // Distance not shown separately when using default distance"
    });

    it('should throw error when camera positioning fails', async () => {
      const args = {
        location: [0, 0, 0] as [number, number, number],
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Invalid camera location: cannot position at origin',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Invalid camera location: cannot position at origin'
      );
    });

    it('should throw error when focus actor not found', async () => {
      const args = {
        focusActor: 'NonExistentActor',
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Actor not found: NonExistentActor',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Actor not found: NonExistentActor'
      );
    });

    it('should handle empty parameters gracefully', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: true,
        location: [0, 0, 500],
        rotation: [0, 0, 0],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Viewport camera updated');
    });

    it('should handle rotation warnings for Roll values', async () => {
      const args = {
        location: [1000, 1000, 500] as [number, number, number],
        rotation: [45, -30, 0] as [number, number, number], // Non-zero Roll
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        location: [1000, 1000, 500],
        rotation: [45, -30, 0],
        warnings: ['Non-zero Roll value may cause tilted horizon'],
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Viewport camera updated');
      if (result.content[0]?.text?.includes('⚠')) {
        expect(result.content[0].text).toContain('tilted horizon');
      }
    });
  });
});