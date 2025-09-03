// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();
const mockIsUnrealEngineAvailable = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand,
    isUnrealEngineAvailable: mockIsUnrealEngineAvailable
  }))
}));

import { TestConnectionTool } from '../../../src/tools/system/test-connection.js';

describe('TestConnectionTool', () => {
  let tool: TestConnectionTool;

  beforeEach(() => {
    tool = new TestConnectionTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('test_connection');
      expect(definition.description).toContain('Test the connection to the Python listener in Unreal Engine');
    });

    it('should have empty input schema', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      expect(schema.properties).toEqual({});
    });
  });

  describe('execute', () => {
    it('should report online status when connection is successful', async () => {
      mockIsUnrealEngineAvailable.mockResolvedValue(true);
      mockExecuteCommand.mockResolvedValue({
        success: true,
        version: '1.0.0',
        pythonVersion: '3.11.0',
        unrealVersion: '5.4.0',
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('✅ Python listener is ONLINE');
      expect(result.content[0].text).toContain('Version: 1.0.0');
      expect(result.content[0].text).toContain('Python: 3.11.0');
      expect(result.content[0].text).toContain('Unreal: 5.4.0');
    });

    it('should report offline status when listener is not available', async () => {
      mockIsUnrealEngineAvailable.mockResolvedValue(false);

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('❌ Python listener is OFFLINE');
      expect(result.content[0].text).toContain('Make sure Unreal Engine is running with the UEMCP plugin');
    });

    it('should handle connection errors gracefully', async () => {
      mockIsUnrealEngineAvailable.mockRejectedValue(new Error('Connection refused'));

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('🔍 Testing Python listener availability...');
      expect(result.content[0].text).toContain('❌ Python listener is OFFLINE');
      expect(result.content[0].text).toContain('Make sure Unreal Engine is running with the UEMCP plugin');
    });

    it('should handle missing version information', async () => {
      mockIsUnrealEngineAvailable.mockResolvedValue(true);
      mockExecuteCommand.mockResolvedValue({
        success: true,
        version: null,
        pythonVersion: undefined,
        unrealVersion: '',
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('✅ Python listener is ONLINE');
      expect(result.content[0].text).toContain('Version: Unknown');
      expect(result.content[0].text).toContain('Python: Unknown');
      expect(result.content[0].text).toContain('Unreal: Unknown');
    });

    it('should handle partial version information', async () => {
      mockIsUnrealEngineAvailable.mockResolvedValue(true);
      mockExecuteCommand.mockResolvedValue({
        success: true,
        version: '0.9.0',
        pythonVersion: '3.11.5',
        unrealVersion: null,
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('Version: 0.9.0');
      expect(result.content[0].text).toContain('Python: 3.11.5');
      expect(result.content[0].text).toContain('Unreal: Unknown');
    });

    it('should handle system test command failures', async () => {
      mockIsUnrealEngineAvailable.mockResolvedValue(true);
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'System test failed',
      });

      // Should still report as online since isUnrealEngineAvailable returned true
      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('✅ Python listener is ONLINE');
      expect(result.content[0].text).toContain('Version: Unknown');
    });

    it('should handle network timeout scenarios', async () => {
      // Simulate network timeout
      mockIsUnrealEngineAvailable.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('ETIMEDOUT')), 100);
        });
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('❌ Python listener is OFFLINE');
    });

    it('should handle detailed version information', async () => {
      mockIsUnrealEngineAvailable.mockResolvedValue(true);
      mockExecuteCommand.mockResolvedValue({
        success: true,
        version: '1.0.0-beta.1',
        pythonVersion: '3.11.5 (main, Aug 24 2023, 15:18:16)',
        unrealVersion: '5.4.1-29314046+++UE5+Release-5.4',
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('Version: 1.0.0-beta.1');
      expect(result.content[0].text).toContain('Python: 3.11.5 (main, Aug 24 2023, 15:18:16)');
      expect(result.content[0].text).toContain('Unreal: 5.4.1-29314046+++UE5+Release-5.4');
    });
  });
});