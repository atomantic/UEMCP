import { BaseTool } from '../base/base-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter, ToolResponse } from '../../utils/response-formatter.js';

interface PythonProxyArgs {
  code: string;
  context?: Record<string, unknown>;
}

/**
 * Tool for executing arbitrary Python code in Unreal Engine
 */
export class PythonProxyTool extends BaseTool<PythonProxyArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'python_proxy',
      description: 'Execute ANY Python code in UE. Full unreal module access! Example: python_proxy({ code: "import unreal\\nactors = unreal.EditorLevelLibrary.get_all_level_actors()" }). Perfect for complex operations MCP tools don\'t cover. See help({ tool: "python_proxy" }) for power user tips.',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Python code to execute. Has full access to the unreal module and all UE Python APIs. Can run any Python code including imports, loops, functions, etc. Assign to "result" variable or the last expression will be returned. Examples: manipulating actors, querying assets, modifying editor settings, automating workflows.',
          },
          context: {
            type: 'object',
            additionalProperties: true,
            description: 'Optional context variables to make available in the execution environment',
          },
        },
        required: ['code'],
      },
    };
  }

  protected async execute(args: PythonProxyArgs): Promise<ToolResponse> {
    const result = await this.executePythonCommand('python.execute', args);
    
    let text = '✓ Python code executed successfully\n\n';
    
    if (result.result !== undefined && result.result !== null) {
      text += 'Result:\n';
      if (typeof result.result === 'string') {
        text += result.result;
      } else {
        text += JSON.stringify(result.result, null, 2);
      }
    }
    
    if (result.message) {
      text = result.message;
    }
    
    return ResponseFormatter.success(text);
  }
}

export const pythonProxyTool = new PythonProxyTool().toMCPTool();
