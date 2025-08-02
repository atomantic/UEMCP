import { MaterialTool } from '../base/material-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ToolResponse } from '../../utils/response-formatter.js';

interface MaterialApplyArgs {
  actorName: string;
  materialPath: string;
  slotIndex?: number;
}

/**
 * Tool for applying materials to actors
 */
export class MaterialApplyTool extends MaterialTool<MaterialApplyArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'material_apply',
      description: 'Apply material to actor\'s static mesh component. Example: material_apply({ actorName: "DressageArena-20mx60m", materialPath: "/Game/Materials/M_Sand", slotIndex: 0 }).',
      inputSchema: {
        type: 'object',
        properties: {
          actorName: {
            type: 'string',
            description: 'Name of the actor to apply material to',
          },
          materialPath: {
            type: 'string',
            description: 'Path to the material to apply',
          },
          slotIndex: {
            type: 'number',
            description: 'Material slot index (default: 0)',
            default: 0,
          },
        },
        required: ['actorName', 'materialPath'],
      },
    };
  }

  protected async execute(args: MaterialApplyArgs): Promise<ToolResponse> {
    const result = await this.executePythonCommand('material.apply_material_to_actor', args);
    
    if (!result.success) {
      return this.formatError(result.error || 'Failed to apply material');
    }
    
    return this.formatMaterialApplicationResult(result);
  }
}

export const materialApplyTool = new MaterialApplyTool().toMCPTool();