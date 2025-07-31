import { BaseTool } from './base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

export interface AssetInfo {
  name: string;
  type: string;
  path: string;
}

/**
 * Base class for asset-related tools
 */
export abstract class AssetTool<TArgs = unknown> extends BaseTool<TArgs> {
  /**
   * Format a list of assets
   */
  protected formatAssetList(assets: AssetInfo[], path?: string): ReturnType<typeof ResponseFormatter.success> {
    let text = `Found ${assets.length} asset${assets.length !== 1 ? 's' : ''}`;
    if (path) {
      text += ` in ${path}`;
    }
    text += '\n\n';

    if (assets.length === 0) {
      text += 'No assets found matching criteria.';
    } else {
      assets.forEach((asset, index) => {
        if (index < 20) { // Limit display
          text += `${asset.name} (${asset.type})\n`;
          text += `  Path: ${asset.path}\n`;
          if (index < assets.length - 1) text += '\n';
        }
      });
      
      if (assets.length > 20) {
        text += `\n... and ${assets.length - 20} more assets`;
      }
    }

    return ResponseFormatter.success(text);
  }

  /**
   * Format asset info details
   */
  protected formatAssetInfo(info: {
    type?: string;
    boundingBox?: {
      min: number[];
      max: number[];
      size: number[];
    };
    materials?: string[];
    vertexCount?: number;
    triangleCount?: number;
  }, assetPath: string): ReturnType<typeof ResponseFormatter.success> {
    let text = `Asset Information: ${assetPath}\n\n`;
    
    if (info.type) text += `Type: ${info.type}\n`;
    if (info.boundingBox) {
      const bb = info.boundingBox;
      text += `Bounding Box:\n`;
      text += `  Min: [${bb.min.join(', ')}]\n`;
      text += `  Max: [${bb.max.join(', ')}]\n`;
      text += `  Size: [${bb.size.join(', ')}]\n`;
    }
    
    if (info.materials && Array.isArray(info.materials) && info.materials.length > 0) {
      text += `\nMaterials (${info.materials.length}):\n`;
      info.materials.forEach((mat: string) => {
        text += `  - ${mat}\n`;
      });
    }
    
    if (info.vertexCount) text += `\nVertex Count: ${info.vertexCount}`;
    if (info.triangleCount) text += `\nTriangle Count: ${info.triangleCount}`;
    
    return ResponseFormatter.success(text.trimEnd());
  }
}