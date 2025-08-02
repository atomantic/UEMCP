import { MaterialTool, MaterialInfo } from '../base/material-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ToolResponse } from '../../utils/response-formatter.js';

interface MaterialListArgs {
  path?: string;
  pattern?: string;
  limit?: number;
}

/**
 * Tool for listing materials in the project
 */
export class MaterialListTool extends MaterialTool<MaterialListArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'material_list',
      description: 'List materials with optional filtering. Examples: material_list({ path: "/Game/Materials" }) for folder contents, material_list({ pattern: "sand" }) for name filtering.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to search for materials (default: /Game)',
            default: '/Game',
          },
          pattern: {
            type: 'string',
            description: 'Filter materials by name pattern (case-insensitive)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of materials to return',
            default: 50,
          },
        },
      },
    };
  }

  protected async execute(args: MaterialListArgs): Promise<ToolResponse> {
    const result = await this.executePythonCommand('material.list_materials', args);
    
    const materials = (result.materials || []) as MaterialInfo[];
    const path = args.path || '/Game';
    const pattern = args.pattern;
    
    return this.formatMaterialList(materials, path, pattern);
  }
}

export const materialListTool = new MaterialListTool().toMCPTool();