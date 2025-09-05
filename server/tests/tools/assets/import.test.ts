// Mock the Python bridge
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { AssetImportTool } from '../../../src/tools/assets/import.js';

describe('AssetImportTool', () => {
  let tool: AssetImportTool;

  beforeEach(() => {
    tool = new AssetImportTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('asset_import');
      expect(definition.description).toContain('Import assets from FAB marketplace or file system');
      expect(definition.description).toContain('Supports batch importing');
      expect(definition.description).toContain('asset_import({');
    });

    it('should have proper input schema with required sourcePath', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      expect(schema.required).toEqual(['sourcePath']);
      
      expect(schema.properties.sourcePath.type).toBe('string');
      expect(schema.properties.sourcePath.description).toContain('Path to source asset file or folder');
      
      expect(schema.properties.targetFolder.type).toBe('string');
      expect(schema.properties.targetFolder.default).toBe('/Game/ImportedAssets');
      
      expect(schema.properties.assetType.type).toBe('string');
      expect(schema.properties.assetType.enum).toEqual(['auto', 'staticMesh', 'material', 'texture', 'blueprint']);
      expect(schema.properties.assetType.default).toBe('auto');
      
      expect(schema.properties.batchImport.type).toBe('boolean');
      expect(schema.properties.batchImport.default).toBe(false);
    });

    it('should have proper import settings schema', () => {
      const schema = tool.definition.inputSchema as any;
      const importSettings = schema.properties.importSettings;
      
      expect(importSettings.type).toBe('object');
      expect(importSettings.description).toContain('Import configuration settings');
      
      // Check boolean settings with defaults
      expect(importSettings.properties.generateCollision.type).toBe('boolean');
      expect(importSettings.properties.generateCollision.default).toBe(true);
      
      expect(importSettings.properties.generateLODs.type).toBe('boolean');
      expect(importSettings.properties.generateLODs.default).toBe(false);
      
      expect(importSettings.properties.importMaterials.default).toBe(true);
      expect(importSettings.properties.importTextures.default).toBe(true);
      expect(importSettings.properties.combineMeshes.default).toBe(false);
      expect(importSettings.properties.createMaterialInstances.default).toBe(false);
      expect(importSettings.properties.sRGB.default).toBe(true);
      expect(importSettings.properties.overwriteExisting.default).toBe(false);
      expect(importSettings.properties.preserveHierarchy.default).toBe(true);
    });

    it('should have compression settings enum', () => {
      const schema = tool.definition.inputSchema as any;
      const compressionSettings = schema.properties.importSettings.properties.compressionSettings;
      
      expect(compressionSettings.type).toBe('string');
      expect(compressionSettings.enum).toEqual(['TC_Default', 'TC_Normalmap', 'TC_Masks', 'TC_Grayscale']);
      expect(compressionSettings.default).toBe('TC_Default');
    });

    it('should have LOD level constraints', () => {
      const schema = tool.definition.inputSchema as any;
      const lodLevels = schema.properties.importSettings.properties.lodLevels;
      
      expect(lodLevels.type).toBe('number');
      expect(lodLevels.default).toBe(3);
      expect(lodLevels.minimum).toBe(1);
      expect(lodLevels.maximum).toBe(8);
    });
  });

  describe('execute', () => {
    it('should import single asset successfully', async () => {
      const args = {
        sourcePath: '/path/to/asset.fbx',
        targetFolder: '/Game/ImportedAssets'
      };

      const mockResult = {
        success: true,
        importedAssets: [
          {
            originalPath: '/path/to/asset.fbx',
            targetPath: '/Game/ImportedAssets/asset',
            assetType: 'StaticMesh',
            status: 'success',
            size: 1048576,
            vertexCount: 1024,
            materialCount: 2
          }
        ],
        failedAssets: [],
        skippedAssets: [],
        statistics: {
          totalProcessed: 1,
          successCount: 1,
          failedCount: 0,
          skippedCount: 0,
          totalSize: 1048576
        },
        targetFolder: '/Game/ImportedAssets',
        processingTime: 2500
      };

      mockExecuteCommand.mockResolvedValue(mockResult);

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'asset.import_assets',
        params: args
      });

      expect(result.content[0].text).toContain('Asset Import Complete - 1/1 assets imported successfully');
      expect(result.content[0].text).toContain('Processing time: 2.50s');
      expect(result.content[0].text).toContain('Target folder: /Game/ImportedAssets');
      expect(result.content[0].text).toContain('📊 Import Statistics:');
      expect(result.content[0].text).toContain('✅ Imported: 1');
      expect(result.content[0].text).toContain('📦 Total size: 1.0MB');
      expect(result.content[0].text).toContain('✅ Successfully Imported Assets (1):');
      expect(result.content[0].text).toContain('asset.fbx → /Game/ImportedAssets/asset');
      expect(result.content[0].text).toContain('Type: StaticMesh');
      expect(result.content[0].text).toContain('Vertices: 1,024');
      expect(result.content[0].text).toContain('Materials: 2');
      expect(result.content[0].text).toContain('Size: 1.0MB');
      expect(result.content[0].text).toContain('💡 Next steps:');
    });

    it('should import multiple assets with batch import', async () => {
      const args = {
        sourcePath: '/path/to/assets/',
        targetFolder: '/Game/ImportedAssets',
        batchImport: true
      };

      const mockResult = {
        success: true,
        importedAssets: [
          {
            originalPath: '/path/to/assets/wall.fbx',
            targetPath: '/Game/ImportedAssets/wall',
            assetType: 'StaticMesh',
            status: 'success',
            size: 512000,
            vertexCount: 512,
            materialCount: 1
          },
          {
            originalPath: '/path/to/assets/door.fbx',
            targetPath: '/Game/ImportedAssets/door',
            assetType: 'StaticMesh',
            status: 'success',
            size: 256000,
            vertexCount: 256,
            materialCount: 1
          }
        ],
        failedAssets: [],
        skippedAssets: [],
        statistics: {
          totalProcessed: 2,
          successCount: 2,
          failedCount: 0,
          skippedCount: 0,
          totalSize: 768000
        },
        targetFolder: '/Game/ImportedAssets',
        processingTime: 4200
      };

      mockExecuteCommand.mockResolvedValue(mockResult);

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Asset Import Complete - 2/2 assets imported successfully');
      expect(result.content[0].text).toContain('Processing time: 4.20s');
      expect(result.content[0].text).toContain('✅ Imported: 2');
      expect(result.content[0].text).toContain('📦 Total size: 750.0KB');
      expect(result.content[0].text).toContain('✅ Successfully Imported Assets (2):');
      expect(result.content[0].text).toContain('wall.fbx → /Game/ImportedAssets/wall');
      expect(result.content[0].text).toContain('door.fbx → /Game/ImportedAssets/door');
    });

    it('should handle partial failures', async () => {
      const args = {
        sourcePath: '/path/to/assets/',
        batchImport: true
      };

      const mockResult = {
        success: true,
        importedAssets: [
          {
            originalPath: '/path/to/assets/wall.fbx',
            targetPath: '/Game/ImportedAssets/wall',
            assetType: 'StaticMesh',
            status: 'success',
            size: 512000
          }
        ],
        failedAssets: [
          {
            originalPath: '/path/to/assets/corrupted.fbx',
            targetPath: '',
            assetType: 'unknown',
            status: 'failed',
            error: 'File is corrupted or invalid format'
          }
        ],
        skippedAssets: [
          {
            originalPath: '/path/to/assets/existing.fbx',
            targetPath: '/Game/ImportedAssets/existing',
            assetType: 'StaticMesh',
            status: 'skipped',
            error: 'Already exists'
          }
        ],
        statistics: {
          totalProcessed: 3,
          successCount: 1,
          failedCount: 1,
          skippedCount: 1,
          totalSize: 512000
        },
        targetFolder: '/Game/ImportedAssets'
      };

      mockExecuteCommand.mockResolvedValue(mockResult);

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Asset Import Complete - 1/3 assets imported successfully');
      expect(result.content[0].text).toContain('✅ Imported: 1');
      expect(result.content[0].text).toContain('❌ Failed: 1');
      expect(result.content[0].text).toContain('⏭️  Skipped: 1');
      expect(result.content[0].text).toContain('❌ Failed Imports (1):');
      expect(result.content[0].text).toContain('corrupted.fbx: File is corrupted or invalid format');
      expect(result.content[0].text).toContain('⏭️  Skipped Assets (1):');
      expect(result.content[0].text).toContain('existing.fbx: Already exists');
    });

    it('should handle import with custom settings', async () => {
      const args = {
        sourcePath: '/path/to/mesh.fbx',
        targetFolder: '/Game/CustomAssets',
        importSettings: {
          generateCollision: false,
          generateLODs: true,
          importMaterials: false,
          lodLevels: 5,
          compressionSettings: 'TC_Normalmap' as const,
          overwriteExisting: true
        },
        assetType: 'staticMesh' as const
      };

      const mockResult = {
        success: true,
        importedAssets: [
          {
            originalPath: '/path/to/mesh.fbx',
            targetPath: '/Game/CustomAssets/mesh',
            assetType: 'StaticMesh',
            status: 'success'
          }
        ],
        failedAssets: [],
        skippedAssets: [],
        statistics: {
          totalProcessed: 1,
          successCount: 1,
          failedCount: 0,
          skippedCount: 0
        },
        targetFolder: '/Game/CustomAssets'
      };

      mockExecuteCommand.mockResolvedValue(mockResult);

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'asset.import_assets',
        params: args
      });

      expect(result.content[0].text).toContain('Asset Import Complete - 1/1 assets imported successfully');
      expect(result.content[0].text).toContain('Target folder: /Game/CustomAssets');
    });

    it('should limit display of many imported assets', async () => {
      const args = {
        sourcePath: '/path/to/many_assets/',
        batchImport: true
      };

      // Create 25 imported assets to test the limit
      const importedAssets = Array.from({ length: 25 }, (_, i) => ({
        originalPath: `/path/to/many_assets/asset_${i + 1}.fbx`,
        targetPath: `/Game/ImportedAssets/asset_${i + 1}`,
        assetType: 'StaticMesh',
        status: 'success' as const,
        size: 100000
      }));

      const mockResult = {
        success: true,
        importedAssets,
        failedAssets: [],
        skippedAssets: [],
        statistics: {
          totalProcessed: 25,
          successCount: 25,
          failedCount: 0,
          skippedCount: 0,
          totalSize: 2500000
        },
        targetFolder: '/Game/ImportedAssets'
      };

      mockExecuteCommand.mockResolvedValue(mockResult);

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Asset Import Complete - 25/25 assets imported successfully');
      expect(result.content[0].text).toContain('✅ Successfully Imported Assets (25):');
      expect(result.content[0].text).toContain('... and 5 more assets');
      expect(result.content[0].text).toContain('📦 Total size: 2.4MB');
    });

    it('should limit display of many skipped assets', async () => {
      const args = {
        sourcePath: '/path/to/existing_assets/',
        batchImport: true
      };

      // Create 15 skipped assets to test the limit
      const skippedAssets = Array.from({ length: 15 }, (_, i) => ({
        originalPath: `/path/to/existing_assets/existing_${i + 1}.fbx`,
        targetPath: `/Game/ImportedAssets/existing_${i + 1}`,
        assetType: 'StaticMesh',
        status: 'skipped' as const,
        error: 'Already exists'
      }));

      const mockResult = {
        success: true,
        importedAssets: [],
        failedAssets: [],
        skippedAssets,
        statistics: {
          totalProcessed: 15,
          successCount: 0,
          failedCount: 0,
          skippedCount: 15
        },
        targetFolder: '/Game/ImportedAssets'
      };

      mockExecuteCommand.mockResolvedValue(mockResult);

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Asset Import Complete - 0/15 assets imported successfully');
      expect(result.content[0].text).toContain('⏭️  Skipped: 15');
      expect(result.content[0].text).toContain('⏭️  Skipped Assets (15):');
      expect(result.content[0].text).toContain('... and 5 more skipped');
    });

    it('should handle assets without optional properties', async () => {
      const args = {
        sourcePath: '/path/to/simple.fbx'
      };

      const mockResult = {
        success: true,
        importedAssets: [
          {
            originalPath: '/path/to/simple.fbx',
            targetPath: '/Game/ImportedAssets/simple',
            assetType: 'StaticMesh',
            status: 'success'
            // No size, vertexCount, materialCount
          }
        ],
        failedAssets: [],
        skippedAssets: [],
        statistics: {
          totalProcessed: 1,
          successCount: 1,
          failedCount: 0,
          skippedCount: 0
          // No totalSize
        },
        targetFolder: '/Game/ImportedAssets'
        // No processingTime
      };

      mockExecuteCommand.mockResolvedValue(mockResult);

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Asset Import Complete - 1/1 assets imported successfully');
      expect(result.content[0].text).toContain('simple.fbx → /Game/ImportedAssets/simple');
      expect(result.content[0].text).toContain('Type: StaticMesh');
      expect(result.content[0].text).not.toContain('Processing time:');
      expect(result.content[0].text).not.toContain('📦 Total size:');
      expect(result.content[0].text).not.toContain('Vertices:');
      expect(result.content[0].text).not.toContain('Materials:');
      expect(result.content[0].text).not.toContain('Size:');
    });

    it('should handle failed assets without error messages', async () => {
      const args = {
        sourcePath: '/path/to/unknown_failure.fbx'
      };

      const mockResult = {
        success: true,
        importedAssets: [],
        failedAssets: [
          {
            originalPath: '/path/to/unknown_failure.fbx',
            targetPath: '',
            assetType: 'unknown',
            status: 'failed'
            // No error property
          }
        ],
        skippedAssets: [],
        statistics: {
          totalProcessed: 1,
          successCount: 0,
          failedCount: 1,
          skippedCount: 0
        },
        targetFolder: '/Game/ImportedAssets'
      };

      mockExecuteCommand.mockResolvedValue(mockResult);

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Asset Import Complete - 0/1 assets imported successfully');
      expect(result.content[0].text).toContain('❌ Failed Imports (1):');
      expect(result.content[0].text).toContain('unknown_failure.fbx: Unknown error');
    });

    it('should handle no imported assets (no next steps)', async () => {
      const args = {
        sourcePath: '/path/to/all_failed/'
      };

      const mockResult = {
        success: true,
        importedAssets: [],
        failedAssets: [
          {
            originalPath: '/path/to/all_failed/bad.fbx',
            targetPath: '',
            assetType: 'unknown',
            status: 'failed',
            error: 'Invalid format'
          }
        ],
        skippedAssets: [],
        statistics: {
          totalProcessed: 1,
          successCount: 0,
          failedCount: 1,
          skippedCount: 0
        },
        targetFolder: '/Game/ImportedAssets'
      };

      mockExecuteCommand.mockResolvedValue(mockResult);

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Asset Import Complete - 0/1 assets imported successfully');
      expect(result.content[0].text).not.toContain('💡 Next steps:');
    });

    it('should handle zero statistics gracefully', async () => {
      const args = {
        sourcePath: '/path/to/empty/'
      };

      const mockResult = {
        success: true,
        importedAssets: [],
        failedAssets: [],
        skippedAssets: [],
        statistics: {
          totalProcessed: 0,
          successCount: 0,
          failedCount: 0,
          skippedCount: 0
        },
        targetFolder: '/Game/ImportedAssets'
      };

      mockExecuteCommand.mockResolvedValue(mockResult);

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Asset Import Complete - 0/0 assets imported successfully');
      expect(result.content[0].text).toContain('✅ Imported: 0');
      expect(result.content[0].text).not.toContain('❌ Failed:');
      expect(result.content[0].text).not.toContain('⏭️  Skipped:');
      expect(result.content[0].text).not.toContain('📦 Total size:');
    });

    it('should throw error when Python command fails', async () => {
      const args = {
        sourcePath: '/path/to/asset.fbx'
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Failed to access source path: Permission denied'
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Failed to access source path: Permission denied'
      );
    });

    it('should throw error when Python command fails without error message', async () => {
      const args = {
        sourcePath: '/path/to/asset.fbx'
      };

      mockExecuteCommand.mockResolvedValue({
        success: false
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Failed to execute asset_import: Command asset.import_assets failed'
      );
    });

    it('should throw error when result structure is invalid', async () => {
      const args = {
        sourcePath: '/path/to/asset.fbx'
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        // Missing required properties
        invalidStructure: true
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Invalid response structure from asset import command'
      );
    });

    it('should validate result structure with missing statistics', async () => {
      const args = {
        sourcePath: '/path/to/asset.fbx'
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        importedAssets: [],
        failedAssets: [],
        skippedAssets: [],
        targetFolder: '/Game/ImportedAssets'
        // Missing statistics
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Invalid response structure from asset import command'
      );
    });

    it('should validate result structure with invalid statistics', async () => {
      const args = {
        sourcePath: '/path/to/asset.fbx'
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        importedAssets: [],
        failedAssets: [],
        skippedAssets: [],
        statistics: {
          totalProcessed: 'invalid', // Should be number
          successCount: 0,
          failedCount: 0,
          skippedCount: 0
        },
        targetFolder: '/Game/ImportedAssets'
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Invalid response structure from asset import command'
      );
    });

    it('should validate result structure with missing arrays', async () => {
      const args = {
        sourcePath: '/path/to/asset.fbx'
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        importedAssets: 'not an array',
        failedAssets: [],
        skippedAssets: [],
        statistics: {
          totalProcessed: 1,
          successCount: 0,
          failedCount: 0,
          skippedCount: 0
        },
        targetFolder: '/Game/ImportedAssets'
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Invalid response structure from asset import command'
      );
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', async () => {
      const args = {
        sourcePath: '/path/to/assets'
      };

      // Test different file sizes
      const testCases = [
        { bytes: 512, expected: '512B' },
        { bytes: 1024, expected: '1.0KB' },
        { bytes: 1536, expected: '1.5KB' },
        { bytes: 1048576, expected: '1.0MB' },
        { bytes: 1610612736, expected: '1.5GB' }
      ];

      for (const testCase of testCases) {
        const mockResult = {
          success: true,
          importedAssets: [
            {
              originalPath: '/path/to/assets/test.fbx',
              targetPath: '/Game/ImportedAssets/test',
              assetType: 'StaticMesh',
              status: 'success',
              size: testCase.bytes
            }
          ],
          failedAssets: [],
          skippedAssets: [],
          statistics: {
            totalProcessed: 1,
            successCount: 1,
            failedCount: 0,
            skippedCount: 0,
            totalSize: testCase.bytes
          },
          targetFolder: '/Game/ImportedAssets'
        };

        mockExecuteCommand.mockResolvedValue(mockResult);

        const result = await tool.toMCPTool().handler(args);

        expect(result.content[0].text).toContain(`📦 Total size: ${testCase.expected}`);
        expect(result.content[0].text).toContain(`Size: ${testCase.expected}`);
      }
    });
  });
});