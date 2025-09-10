import { BlueprintTool } from '../base/blueprint-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface BlueprintCompileArgs {
  blueprintPath: string;
}

/**
 * Tool for compiling Blueprints and reporting status
 */
export class BlueprintCompileTool extends BlueprintTool<BlueprintCompileArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'blueprint_compile',
      description: 'Compile Blueprint and report compilation status/errors.',
      inputSchema: {
        type: 'object',
        properties: {
          blueprintPath: {
            type: 'string',
            description: 'Path to the Blueprint to compile (e.g., /Game/TestBlueprints/BP_InteractiveDoor)',
          },
        },
        required: ['blueprintPath'],
      },
    };
  }

  protected async execute(args: BlueprintCompileArgs): Promise<ReturnType<typeof ResponseFormatter.success>> {
    const result = await this.executePythonCommand('blueprint.compile', {
      blueprint_path: args.blueprintPath,
    });
    
    if (!result.success) {
      return this.formatError(result.error || 'Failed to compile Blueprint');
    }

    let text = `Blueprint Compilation Result\n\n`;
    text += `Blueprint: ${args.blueprintPath}\n`;
    text += `Status: ${result.compilationSuccess ? '✅ Success' : '❌ Failed'}\n`;
    
    const errors = result.errors as string[] || [];
    const warnings = result.warnings as string[] || [];
    
    if (errors.length > 0) {
      text += `\nCompilation Errors (${errors.length}):\n`;
      errors.forEach((error, index) => {
        text += `  ${index + 1}. ${error}\n`;
      });
    }
    
    if (warnings.length > 0) {
      text += `\nWarnings (${warnings.length}):\n`;
      warnings.forEach((warning, index) => {
        text += `  ${index + 1}. ${warning}\n`;
      });
    }
    
    if (result.compilationSuccess && errors.length === 0) {
      text += `\nBlueprint compiled successfully with no errors!`;
    }

    return ResponseFormatter.success(text.trimEnd());
  }
}

export const blueprintCompileTool = new BlueprintCompileTool().toMCPTool();