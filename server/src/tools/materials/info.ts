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
    const result = await this.executePythonCommand('material.get_material_info', {
      material_path: args.materialPath
    });
    
    if (!result.success) {
      return this.formatError(result.error || 'Failed to get material info');
    }
    
    // Map the result to DetailedMaterialInfo structure
    const materialInfo: DetailedMaterialInfo = {
      materialPath: (result.materialPath as string) || args.materialPath,
      materialType: (result.materialType as string) || 'Unknown',
      name: (result.name as string) || args.materialPath.split('/').pop() || 'Unknown',
      domain: result.domain as string | undefined,
      blendMode: result.blendMode as string | undefined,
      shadingModel: result.shadingModel as string | undefined,
      twoSided: result.twoSided as boolean | undefined,
      parentMaterial: result.parentMaterial as string | undefined,
      scalarParameters: result.scalarParameters as Array<{ name: string; value: number }> | undefined,
      vectorParameters: result.vectorParameters as Array<{ name: string; value: { r: number; g: number; b: number; a: number } }> | undefined,
      textureParameters: result.textureParameters as Array<{ name: string; texture: string | null }> | undefined
    };
    
    return this.formatMaterialInfo(materialInfo);
  }
}

export const materialInfoTool = new MaterialInfoTool().toMCPTool();