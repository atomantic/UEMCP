// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { AssetInfoTool } from '../../../src/tools/assets/info.js';
// Also test the barrel export
import { assetInfoTool } from '../../../src/tools/assets/index.js';

describe('AssetInfoTool', () => {
  let tool: AssetInfoTool;

  beforeEach(() => {
    tool = new AssetInfoTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('asset_info');
      expect(definition.description).toContain('Get comprehensive asset details');
      expect(definition.description).toContain('bounds, pivot, sockets, collision, and materials');
    });

    it('should have required assetPath parameter', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      expect(schema.properties?.assetPath).toEqual({
        type: 'string',
        description: 'Asset path (e.g., /Game/Meshes/SM_Wall01)',
      });
      expect(schema.required).toEqual(['assetPath']);
    });
  });

  describe('execution', () => {
    it('should call executePythonCommand with correct command and args', async () => {
      const mockResponse = {
        success: true,
        assetType: 'StaticMesh',
        bounds: {
          size: { x: 100, y: 200, z: 300 },
          extent: { x: 50, y: 100, z: 150 },
          origin: { x: 0, y: 0, z: 0 }
        },
        pivot: {
          type: 'center',
          offset: { x: 0, y: 0, z: 0 }
        },
        sockets: [],
        materialSlots: []
      };
      
      mockExecuteCommand.mockResolvedValue(mockResponse);

      const args = { assetPath: '/Game/Meshes/SM_Wall01' };
      await tool.handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'asset.info',
        params: args
      });
    });

    it('should handle successful response with asset details', async () => {
      const mockResponse = {
        success: true,
        assetType: 'StaticMesh',
        bounds: {
          size: { x: 100, y: 200, z: 300 },
          extent: { x: 50, y: 100, z: 150 },
          origin: { x: 0, y: 0, z: 0 }
        },
        pivot: {
          type: 'center',
          offset: { x: 0, y: 0, z: 0 }
        },
        sockets: [{
          name: 'Socket1',
          location: { x: 0, y: 0, z: 0 },
          rotation: { roll: 0, pitch: 0, yaw: 0 }
        }],
        materialSlots: [{ slotName: 'Material', materialPath: '/Game/Materials/M_Default' }]
      };
      
      mockExecuteCommand.mockResolvedValue(mockResponse);

      const result = await tool.handler({ assetPath: '/Game/Meshes/SM_Wall01' });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Asset Information: /Game/Meshes/SM_Wall01');
      expect(result.content[0].text).toContain('StaticMesh');
      expect(result.content[0].text).toContain('[100, 200, 300]');
    });

    it('should throw error when Python command fails', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Asset not found'
      });

      await expect(tool.handler({ assetPath: '/Game/Invalid/Asset' }))
        .rejects.toThrow('Asset not found');
    });

    it('should handle valid minimal response', async () => {
      const mockResponse = {
        success: true,
        assetType: 'StaticMesh'
      };
      
      mockExecuteCommand.mockResolvedValue(mockResponse);

      const result = await tool.handler({ assetPath: '/Game/Meshes/SM_Wall01' });

      expect(result.content[0].text).toContain('Asset Information: /Game/Meshes/SM_Wall01');
    });
  });

  describe('barrel export', () => {
    it('should export the tool instance', () => {
      expect(assetInfoTool).toBeDefined();
      expect(assetInfoTool.definition.name).toBe('asset_info');
    });
  });
});