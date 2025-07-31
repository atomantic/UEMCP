import { AssetTool } from '../base/asset-tool.js';
import { ToolResponse } from '../../utils/response-formatter.js';
import { ToolDefinition } from '../base/base-tool.js';
import type { EnhancedAssetInfo } from '../base/asset-tool.js';

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
      description: 'Get comprehensive asset details including bounds, pivot type, sockets, collision, and materials. Returns min/max bounds, pivot offset, socket locations for snapping, collision info, material slots, and more. Essential for precise placement calculations!',
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
    
    // Format the enhanced asset info
    // Cast the Python result to our TypeScript interface
    return this.formatEnhancedAssetInfo(result as unknown as EnhancedAssetInfo, args.assetPath);
  }
}

export const assetInfoTool = new AssetInfoTool().toMCPTool();
