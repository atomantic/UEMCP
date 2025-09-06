// Mock the Python bridge
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { ViewportBoundsTool } from '../../../src/tools/viewport/bounds.js';

describe('ViewportBoundsTool', () => {
  let tool: ViewportBoundsTool;

  beforeEach(() => {
    tool = new ViewportBoundsTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('viewport_bounds');
      expect(definition.description).toContain('Get current viewport boundaries and visible area');
      expect(definition.description).toContain('Returns min/max coordinates visible in viewport');
    });

    it('should have empty input schema', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      expect(schema.properties).toEqual({});
    });
  });

  describe('execute', () => {
    it('should get basic viewport bounds', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        bounds: {
          min: [-1000, -500, 0],
          max: [1000, 500, 300]
        }
      });

      const result = await tool.toMCPTool().handler({});

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'viewport.bounds',
        params: {}
      });
      expect(result.content[0].text).toContain('✓ Viewport bounds calculated');
      expect(result.content[0].text).toContain('Visible Area:');
      expect(result.content[0].text).toContain('Min: [-1000.0, -500.0, 0.0]');
      expect(result.content[0].text).toContain('Max: [1000.0, 500.0, 300.0]');
    });

    it('should include camera information when provided', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        camera: {
          location: [500, 800, 250],
          rotation: [0, -45, 0]
        },
        bounds: {
          min: [-200, 300, 0],
          max: [1200, 1300, 500]
        }
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('Camera:');
      expect(result.content[0].text).toContain('Location: [500.0, 800.0, 250.0]');
      expect(result.content[0].text).toContain('Rotation: [0.0, -45.0, 0.0]');
      expect(result.content[0].text).toContain('Visible Area:');
      expect(result.content[0].text).toContain('Min: [-200.0, 300.0, 0.0]');
      expect(result.content[0].text).toContain('Max: [1200.0, 1300.0, 500.0]');
    });

    it('should include view distance when provided', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        bounds: {
          min: [0, 0, 0],
          max: [100, 100, 100]
        },
        viewDistance: 1500
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('View Distance: 1500');
    });

    it('should include field of view when provided', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        bounds: {
          min: [0, 0, 0],
          max: [100, 100, 100]
        },
        fov: 90
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('Field of View: 90°');
    });

    it('should include both view distance and FOV', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        bounds: {
          min: [-500, -300, -50],
          max: [500, 300, 200]
        },
        viewDistance: 2000,
        fov: 75
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('Min: [-500.0, -300.0, -50.0]');
      expect(result.content[0].text).toContain('Max: [500.0, 300.0, 200.0]');
      expect(result.content[0].text).toContain('View Distance: 2000');
      expect(result.content[0].text).toContain('Field of View: 75°');
    });

    it('should format complete viewport bounds information', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        camera: {
          location: [1000, 2000, 500],
          rotation: [5, -30, 0]
        },
        bounds: {
          min: [200, 1500, 0],
          max: [1800, 2500, 1000]
        },
        viewDistance: 5000,
        fov: 90
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('✓ Viewport bounds calculated');
      expect(result.content[0].text).toContain('Camera:');
      expect(result.content[0].text).toContain('Location: [1000.0, 2000.0, 500.0]');
      expect(result.content[0].text).toContain('Rotation: [5.0, -30.0, 0.0]');
      expect(result.content[0].text).toContain('Visible Area:');
      expect(result.content[0].text).toContain('Min: [200.0, 1500.0, 0.0]');
      expect(result.content[0].text).toContain('Max: [1800.0, 2500.0, 1000.0]');
      expect(result.content[0].text).toContain('View Distance: 5000');
      expect(result.content[0].text).toContain('Field of View: 90°');
    });

    it('should handle camera with missing location or rotation', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        camera: {
          location: [100, 200, 300]
          // rotation missing
        },
        bounds: {
          min: [0, 0, 0],
          max: [200, 400, 600]
        }
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('Camera:');
      expect(result.content[0].text).toContain('Location: [100.0, 200.0, 300.0]');
      expect(result.content[0].text).toContain('Visible Area:');
    });

    it('should handle empty camera object', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        camera: {},
        bounds: {
          min: [0, 0, 0],
          max: [100, 100, 100]
        }
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('Camera:');
      expect(result.content[0].text).toContain('Visible Area:');
      expect(result.content[0].text).toContain('Min: [0.0, 0.0, 0.0]');
      expect(result.content[0].text).toContain('Max: [100.0, 100.0, 100.0]');
    });

    it('should handle bounds only (no camera info)', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        bounds: {
          min: [-100, -50, 0],
          max: [100, 50, 100]
        }
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('✓ Viewport bounds calculated');
      expect(result.content[0].text).toContain('Visible Area:');
      expect(result.content[0].text).toContain('Min: [-100.0, -50.0, 0.0]');
      expect(result.content[0].text).toContain('Max: [100.0, 50.0, 100.0]');
      expect(result.content[0].text).not.toContain('Camera:');
    });

    it('should handle no bounds or camera (empty response)', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('✓ Viewport bounds calculated');
    });

    it('should handle decimal coordinates properly', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        bounds: {
          min: [-123.456, -67.890, -12.345],
          max: [987.654, 321.098, 765.432]
        }
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('Min: [-123.5, -67.9, -12.3]');
      expect(result.content[0].text).toContain('Max: [987.7, 321.1, 765.4]');
    });

    it('should throw error when bounds calculation fails', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Failed to calculate viewport bounds: No active viewport'
      });

      await expect(tool.toMCPTool().handler({})).rejects.toThrow(
        'Failed to calculate viewport bounds: No active viewport'
      );
    });

    it('should handle large coordinate values', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        bounds: {
          min: [-999999.9, -888888.8, -777777.7],
          max: [999999.9, 888888.8, 777777.7]
        },
        viewDistance: 10000000,
        fov: 120
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('Min: [-999999.9, -888888.8, -777777.7]');
      expect(result.content[0].text).toContain('Max: [999999.9, 888888.8, 777777.7]');
      expect(result.content[0].text).toContain('View Distance: 10000000');
      expect(result.content[0].text).toContain('Field of View: 120°');
    });

    it('should handle zero values', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        camera: {
          location: [0, 0, 0],
          rotation: [0, 0, 0]
        },
        bounds: {
          min: [0, 0, 0],
          max: [0, 0, 0]
        },
        viewDistance: 0,
        fov: 0
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('Location: [0.0, 0.0, 0.0]');
      expect(result.content[0].text).toContain('Rotation: [0.0, 0.0, 0.0]');
      expect(result.content[0].text).toContain('Min: [0.0, 0.0, 0.0]');
      expect(result.content[0].text).toContain('Max: [0.0, 0.0, 0.0]');
      // viewDistance and fov of 0 are falsy, so they won't be displayed
      expect(result.content[0].text).not.toContain('View Distance:');
      expect(result.content[0].text).not.toContain('Field of View:');
    });
  });
});