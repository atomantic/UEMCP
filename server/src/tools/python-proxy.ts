import { PythonBridge } from '../services/python-bridge.js';

export const pythonProxyTool = {
  definition: {
    name: 'python_proxy',
    description: 'Execute ANY Python code in UE. Full unreal module access! Example: python_proxy({ code: "import unreal\\nactors = unreal.EditorLevelLibrary.get_all_level_actors()" }). Perfect for complex operations MCP tools don\'t cover. See help({ tool: "python_proxy" }) for power user tips.',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Python code to execute. Has full access to the unreal module and all UE Python APIs. Can run any Python code including imports, loops, functions, etc. Assign to "result" variable or the last expression will be returned. Examples: manipulating actors, querying assets, modifying editor settings, automating workflows.'
        },
        context: {
          type: 'object',
          description: 'Optional context variables to make available in the execution environment',
          additionalProperties: true
        }
      },
      required: ['code']
    }
  },
  handler: async ({ code, context = {} }: { code: string; context?: Record<string, unknown> }): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> => {
    const bridge = new PythonBridge();
    
    try {
      const result = await bridge.executeCommand({
        type: 'python.execute',
        params: { code, context }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to execute Python code');
      }

      // Format the output
      let output = '✓ Python code executed successfully\n\n';
      
      // Show the result if any
      if (result.result !== null && result.result !== undefined) {
        output += 'Result:\n';
        output += JSON.stringify(result.result, null, 2) + '\n';
      }
      
      // Show any locals that were created (excluding result)
      if (result.locals && Object.keys(result.locals as Record<string, unknown>).length > 0) {
        const filteredLocals = Object.entries(result.locals as Record<string, unknown>)
          .filter(([key]) => key !== 'result')
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as Record<string, unknown>);
        
        if (Object.keys(filteredLocals).length > 0) {
          output += '\nLocal variables:\n';
          output += JSON.stringify(filteredLocals, null, 2);
        }
      }

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if we have traceback information
      let errorOutput = `Error executing Python code: ${errorMessage}`;
      if (error instanceof Error && 'traceback' in error) {
        const errorWithTraceback = error as Error & { traceback: string };
        errorOutput += '\n\nTraceback:\n' + errorWithTraceback.traceback;
      }
      
      return {
        content: [{
          type: 'text',
          text: errorOutput
        }],
        isError: true
      };
    }
  }
};