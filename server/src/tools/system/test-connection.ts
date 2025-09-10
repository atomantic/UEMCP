import { BaseTool } from '../base/base-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter, ToolResponse } from '../../utils/response-formatter.js';
import { PythonBridge } from '../../services/python-bridge.js';

/**
 * Tool for testing connection to Python listener
 */
export class TestConnectionTool extends BaseTool {
  get definition(): ToolDefinition {
    return {
      name: 'test_connection',
      description: 'Test the connection to the Python listener in Unreal Engine',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };
  }

  protected async execute(): Promise<ToolResponse> {
    try {
      // First check if listener is available
      const bridge = new PythonBridge();
      const isAvailable = await bridge.isUnrealEngineAvailable();
      
      if (!isAvailable) {
        return ResponseFormatter.success(
          '❌ Python listener is OFFLINE\n' +
          '   Make sure Unreal Engine is running with the UEMCP plugin'
        );
      }
      
      // If available, get detailed status
      const result = await this.executePythonCommand('system.test', {});
      
      let text = '✅ Python listener is ONLINE\n';
      text += `   Version: ${(result.version as string) || 'Unknown'}\n`;
      text += `   Python: ${(result.pythonVersion as string) || 'Unknown'}\n`;
      text += `   Unreal: ${(result.unrealVersion as string) || 'Unknown'}`;
      
      return ResponseFormatter.success(text);
      
    } catch {
      return ResponseFormatter.success(
        '🔍 Testing Python listener availability...\n' +
        '❌ Python listener is OFFLINE\n' +
        '   Make sure Unreal Engine is running with the UEMCP plugin'
      );
    }
  }
}

export const testConnectionTool = new TestConnectionTool().toMCPTool();
