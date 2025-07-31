import { AssetTool } from '../base/asset-tool.js';
import { ToolResponse } from '../../utils/response-formatter.js';
import { ToolDefinition } from '../base/base-tool.js';

interface AssetInfoArgs {
  assetPath: string;
}

/**
 * Tool for getting detailed asset information
 */
export class AssetInfoTool extends AssetTool<AssetInfoArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'asset_info',
      description: 'Get asset details (dimensions, materials, etc). asset_info({ assetPath: "/Game/Meshes/SM_Wall" }) returns bounding box size. Essential for calculating placement!',
      inputSchema: {
        type: 'object',
        properties: {
          assetPath: {
            type: 'string',
            description: 'Asset path (e.g., /Game/Meshes/SM_Wall01)',
          },
        },
        required: ['assetPath'],
      },
    };
  }

  protected async execute(args: AssetInfoArgs): Promise<ToolResponse> {
    const result = await this.executePythonCommand('asset.info', args);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get asset info');
    }
    
    return this.formatAssetInfo({
      type: result.type as string,
      boundingBox: result.boundingBox as { min: number[]; max: number[]; size: number[] },
      materials: result.materials as string[],
      vertexCount: result.vertexCount as number,
      triangleCount: result.triangleCount as number,
    }, args.assetPath);
  }
}

export const assetInfoTool = new AssetInfoTool().toMCPTool();
