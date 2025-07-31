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

  /**
   * Format enhanced asset information with detailed bounds, pivot, and socket data
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected formatEnhancedAssetInfo(info: Record<string, any>, assetPath: string): ReturnType<typeof ResponseFormatter.success> {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
    let text = `Asset Information: ${assetPath}\n\n`;
    
    // Basic info
    if (info.assetType) text += `Type: ${info.assetType}\n`;
    
    // Bounds information
    if (info.bounds) {
      const b = info.bounds;
      text += `\nBounding Box:\n`;
      text += `  Size: [${b.size.x}, ${b.size.y}, ${b.size.z}]\n`;
      text += `  Extent: [${b.extent.x}, ${b.extent.y}, ${b.extent.z}]\n`;
      text += `  Origin: [${b.origin.x}, ${b.origin.y}, ${b.origin.z}]\n`;
      if (b.min && b.max) {
        text += `  Min: [${b.min.x}, ${b.min.y}, ${b.min.z}]\n`;
        text += `  Max: [${b.max.x}, ${b.max.y}, ${b.max.z}]\n`;
      }
    }
    
    // Pivot information
    if (info.pivot) {
      text += `\nPivot:\n`;
      text += `  Type: ${info.pivot.type}\n`;
      text += `  Offset: [${info.pivot.offset.x}, ${info.pivot.offset.y}, ${info.pivot.offset.z}]\n`;
    }
    
    // Collision information
    if (info.collision) {
      text += `\nCollision:\n`;
      text += `  Has Collision: ${info.collision.hasCollision}\n`;
      if (info.collision.numCollisionPrimitives !== undefined && info.collision.numCollisionPrimitives > 0) {
        text += `  Collision Primitives: ${info.collision.numCollisionPrimitives}\n`;
      }
      if (info.collision.collisionComplexity) {
        text += `  Complexity: ${info.collision.collisionComplexity}\n`;
      }
    }
    
    // Socket information
    if (info.sockets && info.sockets.length > 0) {
      text += `\nSockets (${info.sockets.length}):\n`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      info.sockets.forEach((socket: any) => {
        text += `  - ${socket.name}:\n`;
        text += `    Location: [${socket.location.x}, ${socket.location.y}, ${socket.location.z}]\n`;
        text += `    Rotation: [${socket.rotation.roll}, ${socket.rotation.pitch}, ${socket.rotation.yaw}]\n`;
      });
    }
    
    // Material slots
    if (info.materialSlots && info.materialSlots.length > 0) {
      text += `\nMaterial Slots (${info.materialSlots.length}):\n`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      info.materialSlots.forEach((slot: any) => {
        text += `  - ${slot.slotName}: ${slot.materialPath || 'None'}\n`;
      });
    }
    
    // Mesh statistics
    if (info.numVertices !== undefined) text += `\nVertices: ${info.numVertices}`;
    if (info.numTriangles !== undefined) text += `\nTriangles: ${info.numTriangles}`;
    if (info.numLODs !== undefined) text += `\nLODs: ${info.numLODs}`;
    
    // Blueprint specific info
    if (info.blueprintClass) {
      text += `\nBlueprint Class: ${info.blueprintClass}`;
    }
    if (info.components && info.components.length > 0) {
      text += `\nComponents (${info.components.length}):\n`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      info.components.forEach((comp: any) => {
        text += `  - ${comp.name} (${comp.class})`;
        if (comp.meshPath) text += ` - Mesh: ${comp.meshPath}`;
        text += '\n';
      });
    }
    
    return ResponseFormatter.success(text.trimEnd());
    /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
  }
}