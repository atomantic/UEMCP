/**
 * Integration tests for asset list workflow
 * 
 * Tests complete asset listing functionality using realistic responses
 * from Python operations.
 */

const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

// Mock logger to prevent console noise in tests
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

import { AssetListTool } from '../../../src/tools/assets/list.js';
import { ASSET_LIST_RESPONSE } from '../fixtures/python-responses.js';

describe('Asset List Workflow Integration', () => {
  let tool: AssetListTool;

  beforeEach(() => {
    tool = new AssetListTool();
    jest.clearAllMocks();
  });

  describe('Complete Asset List Workflow', () => {
    it('should handle realistic ModularOldTown asset list response', async () => {
      mockExecuteCommand.mockResolvedValue(ASSET_LIST_RESPONSE);

      const result = await tool.handler({ path: '/Game/ModularOldTown' });

      // Verify Python command structure
      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'asset.list',
        params: { path: '/Game/ModularOldTown' }
      });

      // Test complete formatted response
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const text = result.content[0].text!;
      
      // Verify header with count and path
      expect(text).toContain('Found 5 assets in /Game/ModularOldTown');
      
      // Verify each asset in realistic response
      expect(text).toContain('SM_Wall_01 (StaticMesh)');
      expect(text).toContain('Path: /Game/ModularOldTown/Meshes/SM_Wall_01');
      
      expect(text).toContain('SM_Wall_02 (StaticMesh)');
      expect(text).toContain('Path: /Game/ModularOldTown/Meshes/SM_Wall_02');
      
      expect(text).toContain('SM_Corner_01 (StaticMesh)');
      expect(text).toContain('Path: /Game/ModularOldTown/Meshes/SM_Corner_01');
      
      expect(text).toContain('SM_Door_01 (StaticMesh)');
      expect(text).toContain('Path: /Game/ModularOldTown/Meshes/SM_Door_01');
      
      expect(text).toContain('M_Wall (Material)');
      expect(text).toContain('Path: /Game/ModularOldTown/Materials/M_Wall');
    });

    it('should handle empty asset list', async () => {
      const emptyResponse = {
        success: true,
        assets: []
      };
      
      mockExecuteCommand.mockResolvedValue(emptyResponse);

      const result = await tool.handler({ path: '/Game/EmptyFolder' });
      const text = result.content[0].text!;
      
      expect(text).toContain('Found 0 assets in /Game/EmptyFolder');
      expect(text).toContain('No assets found matching criteria.');
    });

    it('should handle large asset list with truncation', async () => {
      // Generate 25 assets to test truncation at 20
      const manyAssets = Array.from({ length: 25 }, (_, i) => ({
        name: `SM_Asset_${i.toString().padStart(2, '0')}`,
        type: 'StaticMesh',
        path: `/Game/ManyAssets/SM_Asset_${i.toString().padStart(2, '0')}`
      }));
      
      const largeResponse = {
        success: true,
        assets: manyAssets
      };
      
      mockExecuteCommand.mockResolvedValue(largeResponse);

      const result = await tool.handler({ path: '/Game/ManyAssets' });
      const text = result.content[0].text!;
      
      expect(text).toContain('Found 25 assets in /Game/ManyAssets');
      
      // Should show first 20 assets
      expect(text).toContain('SM_Asset_00 (StaticMesh)');
      expect(text).toContain('SM_Asset_19 (StaticMesh)');
      
      // Should not show asset 20 and beyond
      expect(text).not.toContain('SM_Asset_20 (StaticMesh)');
      
      // Should show truncation message
      expect(text).toContain('... and 5 more assets');
    });

    it('should handle mixed asset types', async () => {
      const mixedResponse = {
        success: true,
        assets: [
          { name: 'SM_Mesh', type: 'StaticMesh', path: '/Game/Meshes/SM_Mesh' },
          { name: 'M_Material', type: 'Material', path: '/Game/Materials/M_Material' },
          { name: 'T_Texture', type: 'Texture2D', path: '/Game/Textures/T_Texture' },
          { name: 'BP_Blueprint', type: 'Blueprint', path: '/Game/Blueprints/BP_Blueprint' },
          { name: 'SFX_Audio', type: 'SoundWave', path: '/Game/Audio/SFX_Audio' }
        ]
      };
      
      mockExecuteCommand.mockResolvedValue(mixedResponse);

      const result = await tool.handler({ path: '/Game/Mixed' });
      const text = result.content[0].text!;
      
      expect(text).toContain('Found 5 assets in /Game/Mixed');
      expect(text).toContain('SM_Mesh (StaticMesh)');
      expect(text).toContain('M_Material (Material)');
      expect(text).toContain('T_Texture (Texture2D)');
      expect(text).toContain('BP_Blueprint (Blueprint)');
      expect(text).toContain('SFX_Audio (SoundWave)');
    });

    it('should handle asset list without path parameter', async () => {
      mockExecuteCommand.mockResolvedValue(ASSET_LIST_RESPONSE);

      const result = await tool.handler({});
      const text = result.content[0].text!;
      
      // Without path, header should not include "in <path>"
      expect(text).toContain('Found 5 assets');
      expect(text).not.toContain('in /Game/');
    });

    it('should handle asset list with type filtering', async () => {
      const filteredResponse = {
        success: true,
        assets: [
          { name: 'SM_Wall_01', type: 'StaticMesh', path: '/Game/ModularOldTown/Meshes/SM_Wall_01' },
          { name: 'SM_Wall_02', type: 'StaticMesh', path: '/Game/ModularOldTown/Meshes/SM_Wall_02' },
          { name: 'SM_Corner_01', type: 'StaticMesh', path: '/Game/ModularOldTown/Meshes/SM_Corner_01' }
        ]
      };
      
      mockExecuteCommand.mockResolvedValue(filteredResponse);

      const result = await tool.handler({ path: '/Game/ModularOldTown', assetType: 'StaticMesh' });
      
      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'asset.list',
        params: { path: '/Game/ModularOldTown', assetType: 'StaticMesh' }
      });
      
      const text = result.content[0].text!;
      expect(text).toContain('Found 3 assets in /Game/ModularOldTown');
      
      // Should only contain StaticMesh assets
      expect(text).toContain('SM_Wall_01 (StaticMesh)');
      expect(text).toContain('SM_Wall_02 (StaticMesh)');
      expect(text).toContain('SM_Corner_01 (StaticMesh)');
      expect(text).not.toContain('(Material)');
    });
  });

  describe('Error Handling', () => {
    it('should handle Python bridge errors', async () => {
      const errorResponse = {
        success: false,
        error: 'Path not found: /Game/NonExistent'
      };
      
      mockExecuteCommand.mockResolvedValue(errorResponse);

      await expect(tool.handler({ path: '/Game/NonExistent' }))
        .rejects.toThrow('Path not found: /Game/NonExistent');
    });

    it('should handle malformed asset data', async () => {
      const malformedResponse = {
        success: true,
        assets: [
          { name: 'ValidAsset', type: 'StaticMesh', path: '/Game/Valid' },
          { name: null, type: 'StaticMesh', path: '/Game/Invalid' }, // Invalid name
          { /* missing required fields */ } as any
        ]
      };
      
      mockExecuteCommand.mockResolvedValue(malformedResponse);

      const result = await tool.handler({ path: '/Game/Mixed' });
      const text = result.content[0].text!;
      
      // Should handle valid assets and gracefully deal with invalid ones
      expect(text).toContain('Found 3 assets');
      expect(text).toContain('ValidAsset (StaticMesh)');
      
      // May contain null or undefined, but shouldn't crash
      expect(result.content).toHaveLength(1);
    });
  });

  describe('Performance Edge Cases', () => {
    it('should handle single asset efficiently', async () => {
      const singleResponse = {
        success: true,
        assets: [
          { name: 'SM_Single', type: 'StaticMesh', path: '/Game/Single/SM_Single' }
        ]
      };
      
      mockExecuteCommand.mockResolvedValue(singleResponse);

      const result = await tool.handler({ path: '/Game/Single' });
      const text = result.content[0].text!;
      
      expect(text).toContain('Found 1 asset in /Game/Single'); // Singular "asset"
      expect(text).toContain('SM_Single (StaticMesh)');
      expect(text).not.toContain('... and');
    });

    it('should handle exactly 20 assets without truncation message', async () => {
      const exactlyTwentyAssets = Array.from({ length: 20 }, (_, i) => ({
        name: `SM_Asset_${i}`,
        type: 'StaticMesh',
        path: `/Game/Twenty/SM_Asset_${i}`
      }));
      
      const exactResponse = {
        success: true,
        assets: exactlyTwentyAssets
      };
      
      mockExecuteCommand.mockResolvedValue(exactResponse);

      const result = await tool.handler({ path: '/Game/Twenty' });
      const text = result.content[0].text!;
      
      expect(text).toContain('Found 20 assets');
      expect(text).toContain('SM_Asset_0 (StaticMesh)');
      expect(text).toContain('SM_Asset_19 (StaticMesh)');
      expect(text).not.toContain('... and'); // No truncation message
    });
  });

  describe('Contract Validation', () => {
    it('should validate response structure', () => {
      // Verify our fixture has the expected structure
      expect(ASSET_LIST_RESPONSE.success).toBe(true);
      expect(Array.isArray(ASSET_LIST_RESPONSE.assets)).toBe(true);
      expect(ASSET_LIST_RESPONSE.assets.length).toBe(5);
      
      // Each asset should have required fields
      ASSET_LIST_RESPONSE.assets.forEach(asset => {
        expect(typeof asset.name).toBe('string');
        expect(typeof asset.type).toBe('string');
        expect(typeof asset.path).toBe('string');
        expect(asset.path).toMatch(/^\/Game\//);
      });
    });
  });
});