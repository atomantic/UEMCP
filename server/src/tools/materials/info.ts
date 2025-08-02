import { MaterialTool, DetailedMaterialInfo } from '../base/material-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ToolResponse } from '../../utils/response-formatter.js';

interface MaterialInfoArgs {
  materialPath: string;
}

/**
 * Tool for getting detailed material information
 */
export class MaterialInfoTool extends MaterialTool<MaterialInfoArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'material_info',
      description: 'Get detailed material information including parameters, properties, and parent material. Essential for understanding material configuration.',
      inputSchema: {
        type: 'object',
        properties: {
          materialPath: {
            type: 'string',
            description: 'Path to the material (e.g., /Game/Materials/M_SandMaterial)',
          },
        },
        required: ['materialPath'],
      },
    };
  }

  protected async execute(args: MaterialInfoArgs): Promise<ToolResponse> {
    const result = await this.executePythonCommand('material.get_material_info', args);
    
    if (!result.success) {
      return this.formatError(result.error || 'Failed to get material info');
    }
    
    // Remove the success flag since it's not part of DetailedMaterialInfo
    const { success, ...materialInfo } = result;
    
    return this.formatMaterialInfo(materialInfo as DetailedMaterialInfo);
  }
}

export const materialInfoTool = new MaterialInfoTool().toMCPTool();