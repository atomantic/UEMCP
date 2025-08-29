import { BlueprintTool } from '../base/blueprint-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface BlueprintSetVariableArgs {
  blueprintPath: string;
  variableName: string;
  variableType: string;
  defaultValue?: unknown;
  isEditable?: boolean;
  isReadOnly?: boolean;
  category?: string;
  tooltip?: string;
  replicationMode?: 'None' | 'Replicated' | 'RepNotify';
}

/**
 * Tool for creating and modifying Blueprint variables
 */
export class BlueprintSetVariableTool extends BlueprintTool<BlueprintSetVariableArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'blueprint_set_variable',
      description: 'Create and modify Blueprint variables. Example: blueprint_set_variable({ blueprintPath: "/Game/Blueprints/BP_Door", variableName: "IsOpen", variableType: "bool", defaultValue: false }).',
      inputSchema: {
        type: 'object',
        properties: {
          blueprintPath: {
            type: 'string',
            description: 'Path to the Blueprint (e.g., "/Game/Blueprints/BP_Door")',
          },
          variableName: {
            type: 'string',
            description: 'Name of the variable',
          },
          variableType: {
            type: 'string',
            description: 'Type of the variable (e.g., "bool", "float", "int", "FVector", "AActor*")',
          },
          defaultValue: {
            description: 'Default value for the variable',
          },
          isEditable: {
            type: 'boolean',
            description: 'Whether the variable is editable in instances',
            default: true,
          },
          isReadOnly: {
            type: 'boolean',
            description: 'Whether the variable is read-only',
            default: false,
          },
          category: {
            type: 'string',
            description: 'Category for organizing the variable in the editor',
            default: 'Default',
          },
          tooltip: {
            type: 'string',
            description: 'Tooltip text for the variable',
          },
          replicationMode: {
            type: 'string',
            enum: ['None', 'Replicated', 'RepNotify'],
            description: 'Replication mode for multiplayer',
            default: 'None',
          },
        },
        required: ['blueprintPath', 'variableName', 'variableType'],
      },
    };
  }

  protected async execute(args: BlueprintSetVariableArgs): Promise<ReturnType<typeof ResponseFormatter.success>> {
    // Required fields are validated by the inputSchema
    
    // Execute Python command to set variable
    const result = await this.executePythonCommand('blueprint.set_variable', {
      blueprint_path: args.blueprintPath,
      variable_name: args.variableName,
      variable_type: args.variableType,
      default_value: args.defaultValue,
      is_editable: args.isEditable ?? true,
      is_read_only: args.isReadOnly || false,
      category: args.category || 'Default',
      tooltip: args.tooltip,
      replication_mode: args.replicationMode || 'None',
    });
    
    if (!result.success) {
      return this.formatError(result.error || 'Failed to set Blueprint variable');
    }
    
    let text = `Variable set successfully!\n\n`;
    text += `Blueprint: ${args.blueprintPath}\n`;
    text += `Variable Name: ${args.variableName}\n`;
    text += `Variable Type: ${args.variableType}\n`;
    
    if (args.defaultValue !== undefined) {
      text += `Default Value: ${JSON.stringify(args.defaultValue)}\n`;
    }
    text += `Editable: ${args.isEditable !== false}\n`;
    
    if (args.isReadOnly) {
      text += `Read-Only: ${args.isReadOnly}\n`;
    }
    if (args.category && args.category !== 'Default') {
      text += `Category: ${args.category}\n`;
    }
    if (args.tooltip) {
      text += `Tooltip: ${args.tooltip}\n`;
    }
    if (args.replicationMode && args.replicationMode !== 'None') {
      text += `Replication: ${args.replicationMode}\n`;
    }
    
    if (result.compiled) {
      text += `\nCompilation Status: Blueprint compiled successfully`;
    }
    
    return ResponseFormatter.success(text.trimEnd());
  }
}

export const blueprintSetVariableTool = new BlueprintSetVariableTool().toMCPTool();