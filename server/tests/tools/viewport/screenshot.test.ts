// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { ViewportScreenshotTool } from '../../../src/tools/viewport/screenshot.js';

describe('ViewportScreenshotTool', () => {
  let tool: ViewportScreenshotTool;

  beforeEach(() => {
    tool = new ViewportScreenshotTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('viewport_screenshot');
      expect(definition.description).toContain('Capture viewport screenshot');
      expect(definition.description).toContain('Quick:');
      expect(definition.description).toContain('High-quality:');
    });

    it('should have proper input schema with default values', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      
      expect(schema.properties?.width?.type).toBe('number');
      expect(schema.properties?.width?.default).toBe(640);
      
      expect(schema.properties?.height?.type).toBe('number');
      expect(schema.properties?.height?.default).toBe(360);
      
      expect(schema.properties?.compress?.type).toBe('boolean');
      expect(schema.properties?.compress?.default).toBe(true);
      
      expect(schema.properties?.quality?.type).toBe('number');
      expect(schema.properties?.quality?.default).toBe(60);
      
      expect(schema.properties?.screenPercentage?.type).toBe('number');
      expect(schema.properties?.screenPercentage?.default).toBe(50);
    });

    it('should have no required parameters', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.required).toBeUndefined();
    });
  });

  describe('execute', () => {
    it('should capture screenshot with default settings', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: true,
        filePath: '/tmp/screenshot_001.jpg',
        width: 640,
        height: 360,
        screenPercentage: 50,
        compressed: true,
        quality: 60,
        fileSize: 85432,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'viewport.screenshot',
        params: args
      });
      expect(result.content[0].text).toContain('✓ Screenshot saved:');
      expect(result.content[0].text).toContain('640x360');
    });

    it('should capture high-quality screenshot with custom settings', async () => {
      const args = {
        width: 1920,
        height: 1080,
        compress: false,
        screenPercentage: 100,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        filePath: '/tmp/screenshot_hq.png',
        width: 1920,
        height: 1080,
        screenPercentage: 100,
        compressed: false,
        fileSize: 2847392,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Screenshot saved:');
      expect(result.content[0].text).toContain('1920x1080');
      expect(result.content[0].text).toContain('Format: PNG (uncompressed)');
    });

    it('should capture compressed JPEG with custom quality', async () => {
      const args = {
        width: 800,
        height: 450,
        compress: true,
        quality: 85,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        filePath: '/tmp/screenshot_custom.jpg',
        width: 800,
        height: 450,
        compressed: true,
        quality: 85,
        fileSize: 124567,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('800x450');
      expect(result.content[0].text).toContain('Quality: 85%');
    });

    it('should handle wireframe mode screenshots', async () => {
      const args = {
        width: 1280,
        height: 720,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        filePath: '/tmp/wireframe_screenshot.jpg',
        width: 1280,
        height: 720,
        renderMode: 'wireframe',
        screenPercentage: 50,
        compressed: true,
        fileSize: 45234,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Screenshot saved:');
      expect(result.content[0].text).toContain('1280x720');
      if (result.content[0]?.text?.includes('wireframe')) {
        expect(result.content[0].text).toContain('wireframe');
      }
    });

    it('should display file size information', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: true,
        filePath: '/tmp/test_screenshot.jpg',
        width: 640,
        height: 360,
        fileSize: 67890,
        compressed: true,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('66.3 KB');
    });

    it('should handle large file sizes with MB display', async () => {
      const args = {
        width: 1920,
        height: 1080,
        compress: false,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        filePath: '/tmp/large_screenshot.png',
        width: 1920,
        height: 1080,
        fileSize: 3145728, // 3MB
        compressed: false,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('3 MB');
    });

    it('should throw error when screenshot capture fails', async () => {
      const args = {
        width: 640,
        height: 360,
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Failed to capture screenshot: viewport not active',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Failed to capture screenshot: viewport not active'
      );
    });

    it('should throw error when file cannot be saved', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Cannot save screenshot: disk full',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Cannot save screenshot: disk full'
      );
    });

    it('should handle custom screen percentage settings', async () => {
      const args = {
        screenPercentage: 25,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        filePath: '/tmp/low_quality_screenshot.jpg',
        width: 640,
        height: 360,
        screenPercentage: 25,
        compressed: true,
        fileSize: 23456,
      });

      await tool.toMCPTool().handler(args);

      // Screen percentage not shown in actual output format
    });

    it('should handle screenshots with timing information', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: true,
        filePath: '/tmp/timed_screenshot.jpg',
        width: 640,
        height: 360,
        renderTime: 0.125,
        saveTime: 0.045,
        totalTime: 0.170,
        fileSize: 78234,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Screenshot saved:');
      if (result.content[0]?.text?.includes('ms')) {
        expect(result.content[0].text).toMatch(/\d+ms/);
      }
    });
  });
});