/**
 * Integration tests for asset info workflow
 * 
 * These tests use realistic Python response data to test complete workflows:
 * TypeScript tool → Python bridge → Response formatting → Final output
 * 
 * This tests real functionality, not mock interactions.
 */

const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { AssetInfoTool } from '../../../src/tools/assets/info.js';
import { 
  WALL_ASSET_RESPONSE,
  CORNER_ASSET_RESPONSE, 
  BLUEPRINT_DOOR_RESPONSE,
  COMPLEX_MESH_RESPONSE,
  NO_COLLISION_RESPONSE,
  ASSET_NOT_FOUND_ERROR
} from '../fixtures/python-responses.js';

describe('Asset Info Workflow Integration', () => {
  let tool: AssetInfoTool;

  beforeEach(() => {
    tool = new AssetInfoTool();
    jest.clearAllMocks();
  });

  describe('Complete Wall Asset Workflow', () => {
    it('should handle realistic ModularOldTown wall asset response', async () => {
      mockExecuteCommand.mockResolvedValue(WALL_ASSET_RESPONSE);

      const result = await tool.handler({ assetPath: '/Game/ModularOldTown/Meshes/SM_Wall_01' });

      // Verify Python command call structure
      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'asset.info',
        params: { assetPath: '/Game/ModularOldTown/Meshes/SM_Wall_01' }
      });

      // Test complete formatted response content
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const text = result.content[0].text!;
      
      // Verify asset header
      expect(text).toContain('Asset Information: /Game/ModularOldTown/Meshes/SM_Wall_01');
      expect(text).toContain('Type: StaticMesh');
      
      // Verify bounds formatting - test actual values from realistic response
      expect(text).toContain('Bounding Box:');
      expect(text).toContain('Size: [300, 30, 400]');
      expect(text).toContain('Extent: [150, 15, 200]');
      expect(text).toContain('Origin: [0, 0, 0]');
      expect(text).toContain('Min: [-150, -15, -200]');
      expect(text).toContain('Max: [150, 15, 200]');
      
      // Verify pivot information
      expect(text).toContain('Pivot:');
      expect(text).toContain('Type: bottom-center');
      expect(text).toContain('Offset: [0, 0, -200]');
      
      // Verify collision information
      expect(text).toContain('Collision:');
      expect(text).toContain('Has Collision: true');
      expect(text).toContain('Collision Primitives: 1');
      expect(text).toContain('Complexity: simple');
      
      // Verify socket information
      expect(text).toContain('Sockets (1):');
      expect(text).toContain('- DoorSocket:');
      expect(text).toContain('Location: [0, 0, 100]');
      expect(text).toContain('Rotation: [0, 0, 0]');
      
      // Verify material slots
      expect(text).toContain('Material Slots (1):');
      expect(text).toContain('- Wall: /Game/ModularOldTown/Materials/M_Wall');
      
      // Verify mesh statistics
      expect(text).toContain('Vertices: 24');
      expect(text).toContain('Triangles: 12');
      expect(text).toContain('LODs: 1');
    });
  });

  describe('Corner Asset Complex Structure', () => {
    it('should handle corner piece with multiple sockets and materials', async () => {
      mockExecuteCommand.mockResolvedValue(CORNER_ASSET_RESPONSE);

      const result = await tool.handler({ assetPath: '/Game/ModularOldTown/Meshes/SM_Corner_01' });
      const text = result.content[0].text!;
      
      // Test corner-specific pivot type
      expect(text).toContain('Type: corner-bottom');
      expect(text).toContain('Offset: [-150, -150, -200]');
      
      // Test multiple sockets
      expect(text).toContain('Sockets (2):');
      expect(text).toContain('- DoorSocket_North:');
      expect(text).toContain('Location: [0, -150, 100]');
      expect(text).toContain('- DoorSocket_East:');
      expect(text).toContain('Location: [150, 0, 100]');
      expect(text).toContain('Rotation: [0, 0, 90]');
      
      // Test multiple material slots
      expect(text).toContain('Material Slots (2):');
      expect(text).toContain('- Wall_North: /Game/ModularOldTown/Materials/M_Wall');
      expect(text).toContain('- Wall_East: /Game/ModularOldTown/Materials/M_Wall');
      
      // Test higher vertex/triangle counts and LODs
      expect(text).toContain('Vertices: 48');
      expect(text).toContain('Triangles: 24');
      expect(text).toContain('LODs: 3');
    });
  });

  describe('Blueprint Asset Workflow', () => {
    it('should handle Blueprint door with components', async () => {
      mockExecuteCommand.mockResolvedValue(BLUEPRINT_DOOR_RESPONSE);

      const result = await tool.handler({ assetPath: '/Game/Blueprints/BP_Door' });
      const text = result.content[0].text!;
      
      // Test Blueprint-specific information
      expect(text).toContain('Type: Blueprint');
      expect(text).toContain('Blueprint Class: BP_Door');
      
      // Test components section
      expect(text).toContain('Components (3):');
      expect(text).toContain('- DoorMesh (StaticMeshComponent) - Mesh: /Game/Doors/SM_Door');
      expect(text).toContain('- DoorTrigger (BoxComponent)');
      expect(text).toContain('- AudioComponent (AudioComponent)');
      
      // Test multiple materials for door
      expect(text).toContain('Material Slots (2):');
      expect(text).toContain('- DoorWood: /Game/Materials/M_Wood');
      expect(text).toContain('- DoorMetal: /Game/Materials/M_Metal');
      
      // Test that empty sockets section is omitted
      expect(text).not.toContain('Sockets');
    });
  });

  describe('Complex Mesh Workflow', () => {
    it('should handle high-poly mesh with many features', async () => {
      mockExecuteCommand.mockResolvedValue(COMPLEX_MESH_RESPONSE);

      const result = await tool.handler({ assetPath: '/Game/Complex/SM_Building' });
      const text = result.content[0].text!;
      
      // Test custom pivot type
      expect(text).toContain('Type: custom');
      expect(text).toContain('Offset: [0, 0, 50]');
      
      // Test complex collision
      expect(text).toContain('Collision Primitives: 12');
      expect(text).toContain('Complexity: complex');
      
      // Test many sockets with different rotations
      expect(text).toContain('Sockets (3):');
      expect(text).toContain('Rotation: [0, 0, 45]');
      expect(text).toContain('Rotation: [0, 0, -45]');
      expect(text).toContain('Rotation: [0, 0, 180]');
      
      // Test high vertex/triangle counts
      expect(text).toContain('Vertices: 15420');
      expect(text).toContain('Triangles: 7830');
      expect(text).toContain('LODs: 5');
      
      // Test multiple material types
      expect(text).toContain('Material Slots (4):');
      expect(text).toContain('- Base: /Game/Materials/M_Base');
      expect(text).toContain('- Glass: /Game/Materials/M_Glass');
      expect(text).toContain('- Metal: /Game/Materials/M_Metal');
    });
  });

  describe('Edge Cases and Special Scenarios', () => {
    it('should handle asset with no collision', async () => {
      mockExecuteCommand.mockResolvedValue(NO_COLLISION_RESPONSE);

      const result = await tool.handler({ assetPath: '/Game/Decorative/SM_NoCollision' });
      const text = result.content[0].text!;
      
      // Test no collision formatting
      expect(text).toContain('Has Collision: false');
      expect(text).not.toContain('Collision Primitives:');
      expect(text).not.toContain('Complexity:');
      
      // Test null material slot
      expect(text).toContain('- Default: None');
      
      // Test empty arrays are omitted
      expect(text).not.toContain('Sockets');
    });

    it('should handle asset not found error', async () => {
      mockExecuteCommand.mockResolvedValue(ASSET_NOT_FOUND_ERROR);

      await expect(tool.handler({ assetPath: '/Game/NonExistent/Asset' }))
        .rejects.toThrow('Asset not found at path \'/Game/NonExistent/Asset\'');
    });

    it('should validate response structure with isEnhancedAssetInfo', async () => {
      // Test that our type guard validates realistic responses
      const { isEnhancedAssetInfo } = await import('../../../src/tools/base/asset-tool.js');
      
      // All our realistic responses should pass validation
      expect(isEnhancedAssetInfo(WALL_ASSET_RESPONSE)).toBe(true);
      expect(isEnhancedAssetInfo(CORNER_ASSET_RESPONSE)).toBe(true);
      expect(isEnhancedAssetInfo(BLUEPRINT_DOOR_RESPONSE)).toBe(true);
      expect(isEnhancedAssetInfo(COMPLEX_MESH_RESPONSE)).toBe(true);
      expect(isEnhancedAssetInfo(NO_COLLISION_RESPONSE)).toBe(true);
      
      // Invalid responses should fail
      expect(isEnhancedAssetInfo(ASSET_NOT_FOUND_ERROR)).toBe(false);
      expect(isEnhancedAssetInfo({})).toBe(false);
      expect(isEnhancedAssetInfo([])).toBe(false);
    });
  });

  describe('Response Formatting Accuracy', () => {
    it('should format bounds with exact precision from Python data', async () => {
      mockExecuteCommand.mockResolvedValue(WALL_ASSET_RESPONSE);

      const result = await tool.handler({ assetPath: '/Game/Test/Asset' });
      const text = result.content[0].text!;
      
      // Test that formatting preserves exact values from Python
      // Size should be extent * 2: [150*2, 15*2, 200*2] = [300, 30, 400]
      expect(text).toContain('Size: [300, 30, 400]');
      
      // Min should be origin - extent: [0-150, 0-15, 0-200] = [-150, -15, -200]  
      expect(text).toContain('Min: [-150, -15, -200]');
      
      // Max should be origin + extent: [0+150, 0+15, 0+200] = [150, 15, 200]
      expect(text).toContain('Max: [150, 15, 200]');
    });

    it('should handle floating point precision correctly', async () => {
      // Test with response containing decimals
      const responseWithDecimals = {
        ...WALL_ASSET_RESPONSE,
        bounds: {
          ...WALL_ASSET_RESPONSE.bounds,
          size: { x: 300.5, y: 30.25, z: 400.75 }
        }
      };
      
      mockExecuteCommand.mockResolvedValue(responseWithDecimals);

      const result = await tool.handler({ assetPath: '/Game/Test/Asset' });
      const text = result.content[0].text!;
      
      expect(text).toContain('Size: [300.5, 30.25, 400.75]');
    });
  });

  describe('Contract Validation', () => {
    it('should ensure all realistic fixtures pass TypeScript validation', () => {
      const { isEnhancedAssetInfo } = require('../../../src/tools/base/asset-tool.js');
      
      // Contract test: All our Python responses should be valid TypeScript types
      const fixtures = [
        WALL_ASSET_RESPONSE,
        CORNER_ASSET_RESPONSE,
        BLUEPRINT_DOOR_RESPONSE, 
        COMPLEX_MESH_RESPONSE,
        NO_COLLISION_RESPONSE
      ];
      
      fixtures.forEach((fixture) => {
        expect(isEnhancedAssetInfo(fixture)).toBe(true);
      });
    });

    it('should handle all optional properties correctly', async () => {
      // Test minimal response with only required fields
      const minimalResponse = {
        success: true,
        assetType: 'StaticMesh'
      };
      
      mockExecuteCommand.mockResolvedValue(minimalResponse);

      const result = await tool.handler({ assetPath: '/Game/Minimal/Asset' });
      const text = result.content[0].text!;
      
      // Should handle missing optional fields gracefully
      expect(text).toContain('Type: StaticMesh');
      expect(text).not.toContain('Bounding Box:');
      expect(text).not.toContain('Sockets');
      expect(text).not.toContain('Material Slots');
    });
  });
});