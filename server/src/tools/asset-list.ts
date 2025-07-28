import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

interface AssetListArgs {
  path?: string;
  limit?: number;
  assetType?: string;
}

export const assetListTool = {
  definition: {
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
        limit: {
          type: 'number',
          description: 'Maximum number of assets to return',
          default: 20,
        },
        assetType: {
          type: 'string',
          description: 'Filter by asset type (e.g., Blueprint, Material, Texture2D)',
        },
      },
      required: [],
    },
  },
  handler: async (args: unknown = {}): Promise<{ content: Array<{ type: string; text: string }> }> => {
    const { path = '/Game', limit = 20, assetType } = args as AssetListArgs;
    
    logger.debug('Listing assets', { path, limit, assetType });
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'asset.list',
        params: { path, limit, assetType }
      });
      
      if (result.success) {
        const assets = (result.assets as Array<{
          name: string;
          type: string;
          path: string;
        }>) || [];
        const totalCount = (result.totalCount as number) || assets.length;
        
        let text = `Found ${totalCount} assets in ${path}\n`;
        if (totalCount > limit) {
          text += `(Showing first ${limit})\n`;
        }
        text += '\n';
        
        if (assets.length === 0) {
          text += 'No assets found.';
        } else {
          assets.forEach((asset) => {
            text += `• ${asset.name} (${asset.type})\n`;
            text += `  Path: ${asset.path}\n`;
          });
        }
        
        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      } else {
        throw new Error(result.error || 'Failed to list assets');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list assets: ${errorMessage}`);
    }
  },
};