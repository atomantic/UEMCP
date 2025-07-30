import { BaseTool } from '../base/base-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface RestartListenerArgs {
  force?: boolean;
}

/**
 * Tool for restarting the Python listener
 */
export class RestartListenerTool extends BaseTool<RestartListenerArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'restart_listener',
      description: 'Restart the Python listener in Unreal Engine to reload code changes (hot reload)',
      inputSchema: {
        type: 'object',
        properties: {
          force: {
            type: 'boolean',
            description: 'Force restart even if listener appears offline',
            default: false,
          },
        },
      },
    };
  }

  protected async execute(args: RestartListenerArgs) {
    await this.executePythonCommand('system.restart', args);
    
    return ResponseFormatter.success(
      '✓ Listener restart initiated\n' +
      '  The listener will restart automatically and reload all code changes.'
    );
  }
}

export const restartListenerTool = new RestartListenerTool().toMCPTool();