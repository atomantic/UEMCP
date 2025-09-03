// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { AssetListTool } from '../../../src/tools/assets/list.js';

describe('AssetListTool', () => {
  let tool: AssetListTool;

  beforeEach(() => {
    tool = new AssetListTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('asset_list');
      expect(definition.description).toContain('List project assets');
      expect(definition.description).toContain('asset_list({ path: "/Game/ModularOldTown" })');
      expect(definition.description).toContain('Use before spawning');
    });

    it('should have optional parameters with defaults', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      
      expect(schema.properties?.path?.type).toBe('string');
      expect(schema.properties?.path?.default).toBe('/Game');
      
      expect(schema.properties?.assetType?.type).toBe('string');
      expect(schema.properties?.assetType?.description).toContain('Blueprint, Material, Texture2D');
      
      expect(schema.properties?.limit?.type).toBe('number');
      expect(schema.properties?.limit?.default).toBe(20);
    });

    it('should have no required parameters', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.required).toBeUndefined();
    });
  });

  describe('execute', () => {
    it('should list assets from default Game folder', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: true,
        assets: [
          {
            name: 'SM_Wall_01',
            path: '/Game/ModularOldTown/Meshes/SM_Wall_01',
            type: 'StaticMesh',
            size: 245760,
          },
          {
            name: 'M_Stone_Wall',
            path: '/Game/ModularOldTown/Materials/M_Stone_Wall',
            type: 'Material',
            size: 12345,
          },
          {
            name: 'BP_Door_Interactive',
            path: '/Game/Blueprints/BP_Door_Interactive',
            type: 'Blueprint',
            size: 8192,
          }
        ],
        searchPath: '/Game',
        total: 3,
        filtered: false,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'asset.list',
        params: args
      });
      expect(result.content[0].text).toContain('Found 3 assets in /Game');
      expect(result.content[0].text).toContain('SM_Wall_01');
      expect(result.content[0].text).toContain('M_Stone_Wall');
      expect(result.content[0].text).toContain('BP_Door_Interactive');
    });

    it('should list assets from specific folder path', async () => {
      const args = {
        path: '/Game/ModularOldTown/Meshes',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        assets: [
          {
            name: 'SM_Wall_01',
            path: '/Game/ModularOldTown/Meshes/SM_Wall_01',
            type: 'StaticMesh',
            size: 245760,
          },
          {
            name: 'SM_Door_01',
            path: '/Game/ModularOldTown/Meshes/SM_Door_01',
            type: 'StaticMesh',
            size: 189440,
          },
          {
            name: 'SM_Corner_01',
            path: '/Game/ModularOldTown/Meshes/SM_Corner_01',
            type: 'StaticMesh',
            size: 167890,
          }
        ],
        searchPath: '/Game/ModularOldTown/Meshes',
        total: 3,
        filtered: false,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 3 assets in /Game/ModularOldTown/Meshes');
      expect(result.content[0].text).toContain('SM_Wall_01');
      expect(result.content[0].text).toContain('SM_Door_01');
      expect(result.content[0].text).toContain('SM_Corner_01');
    });

    it('should filter assets by type', async () => {
      const args = {
        assetType: 'StaticMesh',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        assets: [
          {
            name: 'SM_Wall_01',
            path: '/Game/ModularOldTown/Meshes/SM_Wall_01',
            type: 'StaticMesh',
            size: 245760,
          },
          {
            name: 'SM_Door_01',
            path: '/Game/ModularOldTown/Meshes/SM_Door_01',
            type: 'StaticMesh',
            size: 189440,
          }
        ],
        searchPath: '/Game',
        total: 25,
        filtered: true,
        filterType: 'StaticMesh',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 2 assets');
      expect(result.content[0].text).toContain('SM_Wall_01');
      expect(result.content[0].text).toContain('SM_Door_01');
    });

    it('should limit number of results', async () => {
      const args = {
        limit: 2,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        assets: [
          {
            name: 'FirstAsset',
            path: '/Game/FirstAsset',
            type: 'StaticMesh',
            size: 100000,
          },
          {
            name: 'SecondAsset',
            path: '/Game/SecondAsset',
            type: 'Material',
            size: 50000,
          }
        ],
        searchPath: '/Game',
        total: 50,
        limitApplied: true,
        requestedLimit: 2,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 2 assets');
      expect(result.content[0].text).toContain('FirstAsset');
      expect(result.content[0].text).toContain('SecondAsset');
    });

    it('should display asset sizes in readable format', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: true,
        assets: [
          {
            name: 'SmallAsset',
            path: '/Game/SmallAsset',
            type: 'Texture2D',
            size: 1024, // 1KB
          },
          {
            name: 'MediumAsset',
            path: '/Game/MediumAsset',
            type: 'StaticMesh',
            size: 1048576, // 1MB
          },
          {
            name: 'LargeAsset',
            path: '/Game/LargeAsset',
            type: 'Blueprint',
            size: 10485760, // 10MB
          }
        ],
        searchPath: '/Game',
        total: 3,
      });

      const result = await tool.toMCPTool().handler(args);

      // Asset sizes are not shown in the actual format
      expect(result.content[0].text).toContain('SmallAsset');
      expect(result.content[0].text).toContain('MediumAsset');
      expect(result.content[0].text).toContain('LargeAsset');
    });

    it('should handle empty asset folder', async () => {
      const args = {
        path: '/Game/EmptyFolder',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        assets: [],
        searchPath: '/Game/EmptyFolder',
        total: 0,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 0 assets in /Game/EmptyFolder');
    });

    it('should handle asset type filter with no matches', async () => {
      const args = {
        assetType: 'SkeletalMesh',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        assets: [],
        searchPath: '/Game',
        total: 45,
        filtered: true,
        filterType: 'SkeletalMesh',
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 0 assets');
    });

    it('should display asset paths with proper formatting', async () => {
      const args = {
        path: '/Game/ModularOldTown',
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        assets: [
          {
            name: 'SM_Building_Wall',
            path: '/Game/ModularOldTown/Meshes/Buildings/SM_Building_Wall',
            type: 'StaticMesh',
            size: 345123,
          }
        ],
        searchPath: '/Game/ModularOldTown',
        total: 1,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('SM_Building_Wall');
      expect(result.content[0].text).toContain('/Game/ModularOldTown/Meshes/Buildings/SM_Building_Wall');
      expect(result.content[0].text).toContain('StaticMesh');
    });

    it('should throw error when path does not exist', async () => {
      const args = {
        path: '/Game/NonExistent',
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Path not found: /Game/NonExistent',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Path not found: /Game/NonExistent'
      );
    });

    it('should throw error when asset listing fails', async () => {
      const args = {};

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Failed to enumerate assets: insufficient permissions',
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Failed to enumerate assets: insufficient permissions'
      );
    });

    it('should combine path and type filters', async () => {
      const args = {
        path: '/Game/ModularOldTown/Materials',
        assetType: 'Material',
        limit: 5,
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        assets: [
          {
            name: 'M_Stone',
            path: '/Game/ModularOldTown/Materials/M_Stone',
            type: 'Material',
            size: 15432,
          },
          {
            name: 'M_Wood',
            path: '/Game/ModularOldTown/Materials/M_Wood',
            type: 'Material',
            size: 18765,
          }
        ],
        searchPath: '/Game/ModularOldTown/Materials',
        total: 8,
        filtered: true,
        filterType: 'Material',
        limitApplied: true,
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 2 assets');
      expect(result.content[0].text).toContain('/Game/ModularOldTown/Materials');
      expect(result.content[0].text).toContain('M_Stone');
      expect(result.content[0].text).toContain('M_Wood');
    });
  });
});