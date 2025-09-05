// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { UELogsTool } from '../../../src/tools/system/ue-logs.js';
// Also test the barrel export
import { ueLogsTool } from '../../../src/tools/system/index.js';

describe('UELogsTool', () => {
  let tool: UELogsTool;

  beforeEach(() => {
    tool = new UELogsTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('ue_logs');
      expect(definition.description).toContain('Fetch recent lines from the Unreal Engine console log file');
      expect(definition.description).toContain('debugging issues when MCP commands report failure');
    });

    it('should have optional parameters with defaults', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      
      expect(schema.properties?.lines?.type).toBe('number');
      expect(schema.properties?.lines?.default).toBe(100);
      expect(schema.properties?.lines?.description).toContain('Number of lines to read');

      expect(schema.properties?.project?.type).toBe('string');
      expect(schema.properties?.project?.default).toBe('Home');
      expect(schema.properties?.project?.description).toContain('Project name');
    });
  });

  describe('execution', () => {
    it('should call executePythonCommand with correct command and args', async () => {
      const mockResponse = {
        success: true,
        logPath: '/Users/test/Logs/HomeEditor/Home.log',
        lines: ['[2023-01-01] Log line 1\n', '[2023-01-01] Log line 2\n']
      };
      
      mockExecuteCommand.mockResolvedValue(mockResponse);

      const args = { lines: 50, project: 'TestProject' };
      await tool.handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'system.logs',
        params: args
      });
    });

    it('should format log content with default parameters', async () => {
      const mockResponse = {
        success: true,
        logPath: '/Users/test/Logs/HomeEditor/Home.log',
        lines: ['[2023-01-01] Log line 1\n', '[2023-01-01] Log line 2\n']
      };
      
      mockExecuteCommand.mockResolvedValue(mockResponse);

      const result = await tool.handler({});

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('📜 UE Console Log (last 100 lines from Home.log)');
      expect(result.content[0].text).toContain('[2023-01-01] Log line 1');
      expect(result.content[0].text).toContain('[2023-01-01] Log line 2');
    });

    it('should format log content with custom parameters', async () => {
      const mockResponse = {
        success: true,
        logPath: '/Users/test/Logs/TestProjectEditor/TestProject.log',
        lines: ['Test log entry\n']
      };
      
      mockExecuteCommand.mockResolvedValue(mockResponse);

      const result = await tool.handler({ lines: 25, project: 'TestProject' });

      expect(result.content[0].text).toContain('📜 UE Console Log (last 25 lines from TestProject.log)');
      expect(result.content[0].text).toContain('Test log entry');
    });

    it('should handle empty log content', async () => {
      const mockResponse = {
        success: true,
        logPath: '/Users/test/Logs/HomeEditor/Home.log',
        lines: []
      };
      
      mockExecuteCommand.mockResolvedValue(mockResponse);

      const result = await tool.handler({});

      expect(result.content[0].text).toContain('No log content found.');
    });

    it('should handle missing logPath gracefully', async () => {
      const mockResponse = {
        success: true,
        lines: ['Log entry\n']
      };
      
      mockExecuteCommand.mockResolvedValue(mockResponse);

      const result = await tool.handler({});

      expect(result.content[0].text).toContain('📜 UE Console Log (last 100 lines from Unknown)');
    });

    it('should handle missing lines array gracefully', async () => {
      const mockResponse = {
        success: true,
        logPath: '/Users/test/Logs/HomeEditor/Home.log'
      };
      
      mockExecuteCommand.mockResolvedValue(mockResponse);

      const result = await tool.handler({});

      expect(result.content[0].text).toContain('No log content found.');
    });
  });

  describe('barrel export', () => {
    it('should export the tool instance', () => {
      expect(ueLogsTool).toBeDefined();
      expect(ueLogsTool.definition.name).toBe('ue_logs');
    });
  });
});