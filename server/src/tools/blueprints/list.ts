import { BlueprintTool } from '../base/blueprint-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface BlueprintListArgs {
  path?: string;
  filter?: string;
  limit?: number;
}

/**
 * Tool for listing Blueprint assets
 */
export class BlueprintListTool extends BlueprintTool<BlueprintListArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'blueprint_list',
      description: 'List Blueprints with optional filtering and metadata.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to search for Blueprints (default: /Game)',
            default: '/Game',
          },
          filter: {
            type: 'string',
            description: 'Filter Blueprints by name pattern (case-insensitive)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of Blueprints to return (default: 50)',
            default: 50,
            minimum: 1,
          },
        },
      },
    };
  }

  protected async execute(args: BlueprintListArgs): Promise<ReturnType<typeof ResponseFormatter.success>> {
    const result = await this.executePythonCommand('blueprint.list_blueprints', {
      path: args.path || '/Game',
      filter: args.filter,
      limit: args.limit || 50,
    });
    
    if (!result.success) {
      return this.formatError(result.error || 'Failed to list Blueprints');
    }

    const blueprints = result.blueprints as Array<{
      name: string;
      path: string;
      parentClass?: string;
      lastModified?: string;
    }>;

    if (!blueprints || blueprints.length === 0) {
      return ResponseFormatter.success('No Blueprints found matching the criteria.');
    }

    let text = `Found ${blueprints.length} Blueprint${blueprints.length === 1 ? '' : 's'}\n\n`;
    
    blueprints.forEach(blueprint => {
      text += `${blueprint.name}\n`;
      text += `  Path: ${blueprint.path}\n`;
      if (blueprint.parentClass) {
        text += `  Parent: ${blueprint.parentClass}\n`;
      }
      if (blueprint.lastModified) {
        text += `  Modified: ${blueprint.lastModified}\n`;
      }
      text += '\n';
    });

    return ResponseFormatter.success(text.trimEnd());
  }
}

export const blueprintListTool = new BlueprintListTool().toMCPTool();