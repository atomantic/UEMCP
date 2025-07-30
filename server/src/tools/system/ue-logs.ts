import { BaseTool } from '../base/base-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface UELogsArgs {
  lines?: number;
  project?: string;
}

/**
 * Tool for fetching Unreal Engine log files
 */
export class UELogsTool extends BaseTool<UELogsArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'ue_logs',
      description: 'Fetch recent lines from the Unreal Engine console log file. Useful for debugging issues when MCP commands report failure but may have succeeded.',
      inputSchema: {
        type: 'object',
        properties: {
          lines: {
            type: 'number',
            description: 'Number of lines to read from the end of the log (default: 100)',
            default: 100,
          },
          project: {
            type: 'string',
            description: 'Project name (default: Home)',
            default: 'Home',
          },
        },
      },
    };
  }

  protected async execute(args: UELogsArgs) {
    const result = await this.executePythonCommand('system.logs', args);
    
    const logPath = result.logPath as string || 'Unknown';
    const lines = result.lines as string[] || [];
    const requestedLines = args.lines || 100;
    
    let text = `📜 UE Console Log (last ${requestedLines} lines from ${logPath.split('/').pop()}):\n\n`;
    
    if (lines.length === 0) {
      text += 'No log content found.';
    } else {
      text += lines.join('');
    }
    
    return ResponseFormatter.success(text);
  }
}

export const ueLogsTool = new UELogsTool().toMCPTool();