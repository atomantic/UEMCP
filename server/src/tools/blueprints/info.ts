import { BlueprintTool } from '../base/blueprint-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface BlueprintInfoArgs {
  blueprintPath: string;
}

/**
 * Tool for getting detailed Blueprint information
 */
export class BlueprintInfoTool extends BlueprintTool<BlueprintInfoArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'blueprint_info',
      description: 'Get detailed Blueprint structure (components, variables, functions, events).',
      inputSchema: {
        type: 'object',
        properties: {
          blueprintPath: {
            type: 'string',
            description: 'Path to the Blueprint (e.g., /Game/TestBlueprints/BP_InteractiveDoor)',
          },
        },
        required: ['blueprintPath'],
      },
    };
  }

  protected async execute(args: BlueprintInfoArgs): Promise<ReturnType<typeof ResponseFormatter.success>> {
    const result = await this.executePythonCommand('blueprint.get_info', {
      blueprint_path: args.blueprintPath,
    });
    
    if (!result.success) {
      return this.formatError(result.error || 'Failed to get Blueprint information');
    }

    // Format the Blueprint information using the base class method
    return this.formatBlueprintInfo({
      blueprintPath: args.blueprintPath,
      className: result.className as string,
      parentClass: result.parentClass as string,
      components: result.components as Array<{
        name: string;
        type: string;
        properties?: Record<string, unknown>;
      }>,
      variables: result.variables as Array<{
        name: string;
        type: string;
        defaultValue?: unknown;
        isEditable?: boolean;
      }>,
      functions: result.functions as Array<{
        name: string;
        returnType?: string;
        parameters?: Array<{
          name: string;
          type: string;
        }>;
      }>,
    });
  }
}

export const blueprintInfoTool = new BlueprintInfoTool().toMCPTool();