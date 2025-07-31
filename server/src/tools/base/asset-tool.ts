import { BaseTool } from './base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

export interface AssetInfo {
  name: string;
  type: string;
  path: string;
}

// Interfaces for enhanced asset info
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface BoundsInfo {
  size: Vec3;
  extent: Vec3;
  origin: Vec3;
  min?: Vec3;
  max?: Vec3;
}

interface PivotInfo {
  type: string;
  offset: Vec3;
}

interface CollisionInfo {
  hasCollision: boolean;
  numCollisionPrimitives?: number;
  collisionComplexity?: string;
  hasSimpleCollision?: boolean;
}

interface SocketInfo {
  name: string;
  location: Vec3;
  rotation: {
    roll: number;
    pitch: number;
    yaw: number;
  };
  scale?: Vec3;
}

interface MaterialSlot {
  slotName: string;
  materialPath: string | null;
}

interface ComponentInfo {
  name: string;
  class: string;
  meshPath?: string;
}

export interface EnhancedAssetInfo {
  assetType?: string;
  bounds?: BoundsInfo;
  pivot?: PivotInfo;
  collision?: CollisionInfo;
  sockets?: SocketInfo[];
  materialSlots?: MaterialSlot[];
  numVertices?: number;
  numTriangles?: number;
  numLODs?: number;
  blueprintClass?: string;
  components?: ComponentInfo[];
  additionalProperties?: Record<string, unknown>; // Allow additional properties from Python
}

// Type guard to validate enhanced asset info structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isEnhancedAssetInfo(obj: any): obj is EnhancedAssetInfo {
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  if (!obj || typeof obj !== 'object') return false;
  
  // Check optional properties have correct types when present
  if (obj.assetType !== undefined && typeof obj.assetType !== 'string') return false;
  if (obj.numVertices !== undefined && typeof obj.numVertices !== 'number') return false;
  if (obj.numTriangles !== undefined && typeof obj.numTriangles !== 'number') return false;
  if (obj.numLODs !== undefined && typeof obj.numLODs !== 'number') return false;
  if (obj.blueprintClass !== undefined && typeof obj.blueprintClass !== 'string') return false;
  
  // Validate arrays
  if (obj.sockets !== undefined && !Array.isArray(obj.sockets)) return false;
  if (obj.materialSlots !== undefined && !Array.isArray(obj.materialSlots)) return false;
  if (obj.components !== undefined && !Array.isArray(obj.components)) return false;
  
  return true;
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */
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
  protected formatEnhancedAssetInfo(info: EnhancedAssetInfo, assetPath: string): ReturnType<typeof ResponseFormatter.success> {
    const textParts: string[] = [];
    textParts.push(`Asset Information: ${assetPath}\n\n`);
    
    // Basic info
    if (info.assetType) textParts.push(`Type: ${info.assetType}\n`);
    
    // Bounds information
    if (info.bounds) {
      const b = info.bounds;
      textParts.push(`\nBounding Box:\n`);
      textParts.push(`  Size: [${b.size.x}, ${b.size.y}, ${b.size.z}]\n`);
      textParts.push(`  Extent: [${b.extent.x}, ${b.extent.y}, ${b.extent.z}]\n`);
      textParts.push(`  Origin: [${b.origin.x}, ${b.origin.y}, ${b.origin.z}]\n`);
      if (b.min && b.max) {
        textParts.push(`  Min: [${b.min.x}, ${b.min.y}, ${b.min.z}]\n`);
        textParts.push(`  Max: [${b.max.x}, ${b.max.y}, ${b.max.z}]\n`);
      }
    }
    
    // Pivot information
    if (info.pivot) {
      textParts.push(`\nPivot:\n`);
      textParts.push(`  Type: ${info.pivot.type}\n`);
      textParts.push(`  Offset: [${info.pivot.offset.x}, ${info.pivot.offset.y}, ${info.pivot.offset.z}]\n`);
    }
    
    // Collision information
    if (info.collision) {
      textParts.push(`\nCollision:\n`);
      textParts.push(`  Has Collision: ${info.collision.hasCollision}\n`);
      if (info.collision.numCollisionPrimitives !== undefined && info.collision.numCollisionPrimitives > 0) {
        textParts.push(`  Collision Primitives: ${info.collision.numCollisionPrimitives}\n`);
      }
      if (info.collision.collisionComplexity) {
        textParts.push(`  Complexity: ${info.collision.collisionComplexity}\n`);
      }
    }
    
    // Socket information
    if (info.sockets && info.sockets.length > 0) {
      textParts.push(`\nSockets (${info.sockets.length}):\n`);
      info.sockets.forEach((socket) => {
        textParts.push(`  - ${socket.name}:\n`);
        textParts.push(`    Location: [${socket.location.x}, ${socket.location.y}, ${socket.location.z}]\n`);
        textParts.push(`    Rotation: [${socket.rotation.roll}, ${socket.rotation.pitch}, ${socket.rotation.yaw}]\n`);
      });
    }
    
    // Material slots
    if (info.materialSlots && info.materialSlots.length > 0) {
      textParts.push(`\nMaterial Slots (${info.materialSlots.length}):\n`);
      info.materialSlots.forEach((slot) => {
        textParts.push(`  - ${slot.slotName}: ${slot.materialPath || 'None'}\n`);
      });
    }
    
    // Mesh statistics
    if (info.numVertices !== undefined) textParts.push(`\nVertices: ${info.numVertices}`);
    if (info.numTriangles !== undefined) textParts.push(`\nTriangles: ${info.numTriangles}`);
    if (info.numLODs !== undefined) textParts.push(`\nLODs: ${info.numLODs}`);
    
    // Blueprint specific info
    if (info.blueprintClass) {
      textParts.push(`\nBlueprint Class: ${info.blueprintClass}`);
    }
    if (info.components && info.components.length > 0) {
      textParts.push(`\nComponents (${info.components.length}):\n`);
      info.components.forEach((comp) => {
        textParts.push(`  - ${comp.name} (${comp.class})`);
        if (comp.meshPath) textParts.push(` - Mesh: ${comp.meshPath}`);
        textParts.push('\n');
      });
    }
    
    return ResponseFormatter.success(textParts.join('').trimEnd());
  }
}