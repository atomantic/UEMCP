import { AssetTool, AssetInfo } from '../base/asset-tool.js';
import { ToolDefinition } from '../base/base-tool.js';

interface AssetListArgs {
  path?: string;
  assetType?: string;
  limit?: number;
}

/**
 * Tool for listing project assets
 */
export class AssetListTool extends AssetTool<AssetListArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'asset_list',
      description: 'List project assets. Examples: asset_list({ path: "/Game/ModularOldTown" }) for folder contents, asset_list({ assetType: "StaticMesh" }) for all meshes. Use before spawning to find correct asset paths.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Path to search for assets (default: /Game)',
            default: '/Game',
          },
          assetType: {
            type: 'string',
            description: 'Filter by asset type (e.g., Blueprint, Material, Texture2D)',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of assets to return',
            default: 20,
          },
        },
      },
    };
  }

  protected async execute(args: AssetListArgs) {
    const result = await this.executePythonCommand('asset.list', args);
    
    const assets = (result.assets || []) as AssetInfo[];
    const path = args.path || '/Game';
    
    return this.formatAssetList(assets, path);
  }
}

export const assetListTool = new AssetListTool().toMCPTool();
