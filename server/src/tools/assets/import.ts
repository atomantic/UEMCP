import { AssetTool } from '../base/asset-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ToolResponse, ResponseFormatter } from '../../utils/response-formatter.js';

interface AssetImportArgs {
  sourcePath: string;
  targetFolder?: string;
  importSettings?: AssetImportSettings;
  assetType?: 'auto' | 'staticMesh' | 'material' | 'texture' | 'blueprint';
  batchImport?: boolean;
}

interface AssetImportSettings {
  // Static Mesh settings
  generateCollision?: boolean;
  generateLODs?: boolean;
  importMaterials?: boolean;
  importTextures?: boolean;
  combineMeshes?: boolean;
  
  // Material settings
  createMaterialInstances?: boolean;
  searchAndReplaceTextures?: boolean;
  
  // Texture settings
  sRGB?: boolean;
  compressionSettings?: 'TC_Default' | 'TC_Normalmap' | 'TC_Masks' | 'TC_Grayscale';
  
  // LOD settings
  autoGenerateLODs?: boolean;
  lodLevels?: number;
  
  // General settings
  overwriteExisting?: boolean;
  preserveHierarchy?: boolean;
}

interface ImportedAssetInfo {
  originalPath: string;
  targetPath: string;
  assetType: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  size?: number;
  vertexCount?: number;
  materialCount?: number;
}

interface AssetImportResult {
  success: boolean;
  importedAssets: ImportedAssetInfo[];
  failedAssets: ImportedAssetInfo[];
  skippedAssets: ImportedAssetInfo[];
  statistics: {
    totalProcessed: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
    totalSize?: number;
  };
  targetFolder: string;
  processingTime?: number;
  error?: string;
}

/**
 * Type guard to validate AssetImportResult structure
 */
function isAssetImportResult(obj: unknown): obj is AssetImportResult {
  if (!obj || typeof obj !== 'object') return false;
  
  const result = obj as Record<string, unknown>;
  
  // Check required properties
  if (!result.statistics || typeof result.statistics !== 'object') return false;
  if (!Array.isArray(result.importedAssets)) return false;
  if (!Array.isArray(result.failedAssets)) return false;
  if (!Array.isArray(result.skippedAssets)) return false;
  
  // Validate statistics
  const stats = result.statistics as Record<string, unknown>;
  if (typeof stats.totalProcessed !== 'number') return false;
  if (typeof stats.successCount !== 'number') return false;
  if (typeof stats.failedCount !== 'number') return false;
  if (typeof stats.skippedCount !== 'number') return false;
  
  return true;
}

/**
 * Tool for importing assets from FAB marketplace or other sources into UE project
 */
export class AssetImportTool extends AssetTool<AssetImportArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'asset_import',
      description: 'Import assets from FAB marketplace or file system into Unreal Engine project. Supports batch importing, custom settings for materials/collision/LODs. Examples: asset_import({ sourcePath: "/path/to/fab/asset", targetFolder: "/Game/ImportedAssets" })',
      inputSchema: {
        type: 'object',
        properties: {
          sourcePath: {
            type: 'string',
            description: 'Path to source asset file or folder (FAB library, local files, etc.)',
          },
          targetFolder: {
            type: 'string',
            description: 'Destination folder in UE project (e.g., "/Game/ImportedAssets")',
            default: '/Game/ImportedAssets',
          },
          importSettings: {
            type: 'object',
            description: 'Import configuration settings',
            properties: {
              generateCollision: {
                type: 'boolean',
                description: 'Generate collision for static meshes',
                default: true,
              },
              generateLODs: {
                type: 'boolean', 
                description: 'Auto-generate LODs for static meshes',
                default: false,
              },
              importMaterials: {
                type: 'boolean',
                description: 'Import materials with meshes',
                default: true,
              },
              importTextures: {
                type: 'boolean',
                description: 'Import textures with materials',
                default: true,
              },
              combineMeshes: {
                type: 'boolean',
                description: 'Combine multiple meshes into single asset',
                default: false,
              },
              createMaterialInstances: {
                type: 'boolean',
                description: 'Create material instances instead of materials',
                default: false,
              },
              sRGB: {
                type: 'boolean',
                description: 'Use sRGB for texture imports',
                default: true,
              },
              compressionSettings: {
                type: 'string',
                enum: ['TC_Default', 'TC_Normalmap', 'TC_Masks', 'TC_Grayscale'],
                description: 'Texture compression settings',
                default: 'TC_Default',
              },
              autoGenerateLODs: {
                type: 'boolean',
                description: 'Auto-generate LOD levels',
                default: false,
              },
              lodLevels: {
                type: 'number',
                description: 'Number of LOD levels to generate',
                default: 3,
                minimum: 1,
                maximum: 8,
              },
              overwriteExisting: {
                type: 'boolean',
                description: 'Overwrite existing assets with same name',
                default: false,
              },
              preserveHierarchy: {
                type: 'boolean',
                description: 'Preserve source folder hierarchy in target',
                default: true,
              },
            },
          },
          assetType: {
            type: 'string',
            enum: ['auto', 'staticMesh', 'material', 'texture', 'blueprint'],
            description: 'Type of asset to import (auto-detect if not specified)',
            default: 'auto',
          },
          batchImport: {
            type: 'boolean',
            description: 'Import entire folder with all compatible assets',
            default: false,
          },
        },
        required: ['sourcePath'],
      },
    };
  }

  protected async execute(args: AssetImportArgs): Promise<ToolResponse> {
    const result = await this.executePythonCommand('asset.import_assets', args);
    
    if (!result.success) {
      throw new Error(result.error || 'Asset import failed');
    }
    
    // Validate the result structure using a type guard
    if (!isAssetImportResult(result)) {
      throw new Error('Invalid response structure from asset import command');
    }
    return this.formatImportResult(result);
  }

  /**
   * Format the import result for display
   */
  private formatImportResult(result: AssetImportResult): ToolResponse {
    const parts: string[] = [];
    const stats = result.statistics;
    
    // Header with summary
    parts.push(`Asset Import Complete - ${stats.successCount}/${stats.totalProcessed} assets imported successfully\n`);
    
    if (result.processingTime) {
      parts.push(`Processing time: ${(result.processingTime / 1000).toFixed(2)}s\n`);
    }
    
    parts.push(`Target folder: ${result.targetFolder}\n\n`);
    
    // Statistics
    parts.push(`📊 Import Statistics:\n`);
    parts.push(`  ✅ Imported: ${stats.successCount}\n`);
    if (stats.failedCount > 0) {
      parts.push(`  ❌ Failed: ${stats.failedCount}\n`);
    }
    if (stats.skippedCount > 0) {
      parts.push(`  ⏭️  Skipped: ${stats.skippedCount}\n`);
    }
    if (stats.totalSize) {
      parts.push(`  📦 Total size: ${this.formatFileSize(stats.totalSize)}\n`);
    }
    parts.push('\n');
    
    // Successfully imported assets
    if (result.importedAssets.length > 0) {
      parts.push(`✅ Successfully Imported Assets (${result.importedAssets.length}):\n`);
      result.importedAssets.forEach((asset, index) => {
        if (index < 20) { // Limit display
          parts.push(`  ${asset.originalPath.split('/').pop()} → ${asset.targetPath}\n`);
          if (asset.assetType) parts.push(`    Type: ${asset.assetType}\n`);
          if (asset.vertexCount) parts.push(`    Vertices: ${asset.vertexCount.toLocaleString()}\n`);
          if (asset.materialCount) parts.push(`    Materials: ${asset.materialCount}\n`);
          if (asset.size) parts.push(`    Size: ${this.formatFileSize(asset.size)}\n`);
          parts.push('\n');
        }
      });
      
      if (result.importedAssets.length > 20) {
        parts.push(`  ... and ${result.importedAssets.length - 20} more assets\n\n`);
      }
    }
    
    // Failed imports
    if (result.failedAssets.length > 0) {
      parts.push(`❌ Failed Imports (${result.failedAssets.length}):\n`);
      result.failedAssets.forEach((asset) => {
        parts.push(`  ${asset.originalPath.split('/').pop()}: ${asset.error || 'Unknown error'}\n`);
      });
      parts.push('\n');
    }
    
    // Skipped assets
    if (result.skippedAssets.length > 0) {
      parts.push(`⏭️  Skipped Assets (${result.skippedAssets.length}):\n`);
      result.skippedAssets.slice(0, 10).forEach((asset) => {
        parts.push(`  ${asset.originalPath.split('/').pop()}: ${asset.error || 'Already exists'}\n`);
      });
      if (result.skippedAssets.length > 10) {
        parts.push(`  ... and ${result.skippedAssets.length - 10} more skipped\n`);
      }
      parts.push('\n');
    }
    
    // Usage hints
    if (result.importedAssets.length > 0) {
      parts.push(`💡 Next steps:\n`);
      parts.push(`  • Use asset_list({ path: "${result.targetFolder}" }) to see imported assets\n`);
      parts.push(`  • Use asset_info({ assetPath: "path" }) to get detailed asset information\n`);
      parts.push(`  • Use actor_spawn to place assets in your level\n`);
    }
    
    return ResponseFormatter.success(parts.join('').trimEnd());
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`;
  }
}

export const assetImportTool = new AssetImportTool().toMCPTool();