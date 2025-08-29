import { BlueprintTool } from '../base/blueprint-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface BlueprintCreateArgs {
  className: string;
  parentClass?: string;
  targetFolder?: string;
  components?: Array<{
    name: string;
    type: string;
    properties?: Record<string, unknown>;
  }>;
  variables?: Array<{
    name: string;
    type: string;
    defaultValue?: unknown;
    isEditable?: boolean;
  }>;
}

/**
 * Tool for creating new Blueprint classes
 */
export class BlueprintCreateTool extends BlueprintTool<BlueprintCreateArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'blueprint_create',
      description: 'Create new Blueprint classes from C++ or Blueprint parents. Examples: blueprint_create({ className: "BP_Door", parentClass: "Actor" }) or blueprint_create({ className: "BP_InteractiveDoor", parentClass: "/Game/Blueprints/BP_BaseDoor" }).',
      inputSchema: {
        type: 'object',
        properties: {
          className: {
            type: 'string',
            description: 'Name for the new Blueprint class (e.g., "BP_Door")',
          },
          parentClass: {
            type: 'string',
            description: 'Parent class name (e.g., "Actor", "Pawn") or path to Blueprint parent',
            default: 'Actor',
          },
          targetFolder: {
            type: 'string',
            description: 'Destination folder (default: /Game/Blueprints)',
            default: '/Game/Blueprints',
          },
          components: {
            type: 'array',
            description: 'Components to add to the Blueprint',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Component name',
                },
                type: {
                  type: 'string',
                  description: 'Component type (e.g., "StaticMeshComponent", "BoxComponent")',
                },
                properties: {
                  type: 'object',
                  description: 'Component properties to set',
                  additionalProperties: true,
                },
              },
              required: ['name', 'type'],
            },
          },
          variables: {
            type: 'array',
            description: 'Variables to add to the Blueprint',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Variable name',
                },
                type: {
                  type: 'string',
                  description: 'Variable type (e.g., "float", "int", "bool", "FVector")',
                },
                defaultValue: {
                  description: 'Default value for the variable',
                },
                isEditable: {
                  type: 'boolean',
                  description: 'Whether the variable is editable in instances',
                  default: true,
                },
              },
              required: ['name', 'type'],
            },
          },
        },
        required: ['className'],
      },
    };
  }

  protected async execute(args: BlueprintCreateArgs): Promise<ReturnType<typeof ResponseFormatter.success>> {
    // Execute Python command to create Blueprint
    const result = await this.executePythonCommand('blueprint.create', {
      class_name: args.className,
      parent_class: args.parentClass || 'Actor',
      target_folder: args.targetFolder || '/Game/Blueprints',
      components: args.components,
      variables: args.variables,
    });
    
    if (!result.success) {
      return this.formatError(result.error || 'Failed to create Blueprint');
    }
    
    return this.formatBlueprintCreationResult({
      blueprintPath: result.blueprintPath as string,
      className: args.className,
      parentClass: args.parentClass,
      components: result.components as string[] | undefined,
      variables: result.variables as string[] | undefined,
    });
  }
}

export const blueprintCreateTool = new BlueprintCreateTool().toMCPTool();