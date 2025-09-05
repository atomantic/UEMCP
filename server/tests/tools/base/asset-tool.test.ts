// Mock the Python bridge
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { AssetTool, AssetInfo, EnhancedAssetInfo, isEnhancedAssetInfo } from '../../../src/tools/base/asset-tool.js';
import { ResponseFormatter } from '../../../src/utils/response-formatter.js';

// Create a concrete implementation for testing
class TestAssetTool extends AssetTool<{ testParam: string }> {
  get definition() {
    return {
      name: 'test_asset_tool',
      description: 'Test asset tool',
      inputSchema: {
        type: 'object' as const,
        properties: {
          testParam: { type: 'string' }
        }
      }
    };
  }

  protected async execute(): Promise<ReturnType<typeof ResponseFormatter.success>> {
    return ResponseFormatter.success('test result');
  }

  // Expose protected methods for testing
  public testFormatAssetList(assets: AssetInfo[], path?: string) {
    return this.formatAssetList(assets, path);
  }

  public testFormatAssetInfo(info: Parameters<AssetTool['formatAssetInfo']>[0], assetPath: string) {
    return this.formatAssetInfo(info, assetPath);
  }

  public testFormatEnhancedAssetInfo(info: EnhancedAssetInfo, assetPath: string) {
    return this.formatEnhancedAssetInfo(info, assetPath);
  }
}

describe('AssetTool', () => {
  let tool: TestAssetTool;

  beforeEach(() => {
    tool = new TestAssetTool();
    jest.clearAllMocks();
  });

  describe('isEnhancedAssetInfo type guard', () => {
    it('should return true for valid enhanced asset info', () => {
      const validInfo: EnhancedAssetInfo = {
        assetType: 'StaticMesh',
        numVertices: 100,
        numTriangles: 50,
        numLODs: 3,
        blueprintClass: 'BP_Test',
        sockets: [],
        materialSlots: [],
        components: [],
        additionalProperties: {}
      };

      expect(isEnhancedAssetInfo(validInfo)).toBe(true);
    });

    it('should return true for minimal valid object', () => {
      const minimalInfo = {};
      expect(isEnhancedAssetInfo(minimalInfo)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isEnhancedAssetInfo(null)).toBe(false);
      expect(isEnhancedAssetInfo(undefined)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(isEnhancedAssetInfo('string')).toBe(false);
      expect(isEnhancedAssetInfo(123)).toBe(false);
      expect(isEnhancedAssetInfo(true)).toBe(false);
    });

    it('should return false for invalid assetType', () => {
      const invalidInfo = { assetType: 123 };
      expect(isEnhancedAssetInfo(invalidInfo)).toBe(false);
    });

    it('should return false for invalid numeric properties', () => {
      expect(isEnhancedAssetInfo({ numVertices: 'invalid' })).toBe(false);
      expect(isEnhancedAssetInfo({ numTriangles: 'invalid' })).toBe(false);
      expect(isEnhancedAssetInfo({ numLODs: 'invalid' })).toBe(false);
    });

    it('should return false for invalid blueprintClass', () => {
      const invalidInfo = { blueprintClass: 123 };
      expect(isEnhancedAssetInfo(invalidInfo)).toBe(false);
    });

    it('should return false for invalid array properties', () => {
      expect(isEnhancedAssetInfo({ sockets: 'not-array' })).toBe(false);
      expect(isEnhancedAssetInfo({ materialSlots: 'not-array' })).toBe(false);
      expect(isEnhancedAssetInfo({ components: 'not-array' })).toBe(false);
    });

    it('should return false for invalid additionalProperties', () => {
      expect(isEnhancedAssetInfo({ additionalProperties: 'not-object' })).toBe(false);
      expect(isEnhancedAssetInfo({ additionalProperties: null })).toBe(false);
      expect(isEnhancedAssetInfo({ additionalProperties: [] })).toBe(false);
    });
  });

  describe('formatAssetList', () => {
    it('should format empty asset list', () => {
      const assets: AssetInfo[] = [];
      const result = tool.testFormatAssetList(assets);

      expect(result.content[0].text).toContain('Found 0 assets');
      expect(result.content[0].text).toContain('No assets found matching criteria.');
    });

    it('should format single asset', () => {
      const assets: AssetInfo[] = [
        {
          name: 'SM_Wall',
          type: 'StaticMesh',
          path: '/Game/Meshes/SM_Wall'
        }
      ];
      const result = tool.testFormatAssetList(assets);

      expect(result.content[0].text).toContain('Found 1 asset');
      expect(result.content[0].text).toContain('SM_Wall (StaticMesh)');
      expect(result.content[0].text).toContain('Path: /Game/Meshes/SM_Wall');
    });

    it('should format multiple assets', () => {
      const assets: AssetInfo[] = [
        {
          name: 'SM_Wall',
          type: 'StaticMesh',
          path: '/Game/Meshes/SM_Wall'
        },
        {
          name: 'M_Material',
          type: 'Material',
          path: '/Game/Materials/M_Material'
        }
      ];
      const result = tool.testFormatAssetList(assets);

      expect(result.content[0].text).toContain('Found 2 assets');
      expect(result.content[0].text).toContain('SM_Wall (StaticMesh)');
      expect(result.content[0].text).toContain('M_Material (Material)');
    });

    it('should include path in output when provided', () => {
      const assets: AssetInfo[] = [
        {
          name: 'SM_Test',
          type: 'StaticMesh',
          path: '/Game/Test/SM_Test'
        }
      ];
      const result = tool.testFormatAssetList(assets, '/Game/Test');

      expect(result.content[0].text).toContain('Found 1 asset in /Game/Test');
    });

    it('should limit display to 20 assets', () => {
      const assets: AssetInfo[] = Array.from({ length: 25 }, (_, i) => ({
        name: `Asset_${i}`,
        type: 'StaticMesh',
        path: `/Game/Assets/Asset_${i}`
      }));
      const result = tool.testFormatAssetList(assets);

      expect(result.content[0].text).toContain('Found 25 assets');
      expect(result.content[0].text).toContain('... and 5 more assets');
      // Should contain first 20 assets
      expect(result.content[0].text).toContain('Asset_0');
      expect(result.content[0].text).toContain('Asset_19');
      // Should not contain assets beyond 20
      expect(result.content[0].text).not.toContain('Asset_20');
    });
  });

  describe('formatAssetInfo', () => {
    it('should format minimal asset info', () => {
      const info = {};
      const result = tool.testFormatAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Asset Information: /Game/Test/Asset');
    });

    it('should format asset info with type', () => {
      const info = { type: 'StaticMesh' };
      const result = tool.testFormatAssetInfo(info, '/Game/Test/SM_Asset');

      expect(result.content[0].text).toContain('Asset Information: /Game/Test/SM_Asset');
      expect(result.content[0].text).toContain('Type: StaticMesh');
    });

    it('should format asset info with bounding box', () => {
      const info = {
        boundingBox: {
          min: [0, 0, 0],
          max: [100, 100, 100],
          size: [100, 100, 100]
        }
      };
      const result = tool.testFormatAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Bounding Box:');
      expect(result.content[0].text).toContain('Min: [0, 0, 0]');
      expect(result.content[0].text).toContain('Max: [100, 100, 100]');
      expect(result.content[0].text).toContain('Size: [100, 100, 100]');
    });

    it('should format asset info with materials', () => {
      const info = {
        materials: [
          '/Game/Materials/M_Wall',
          '/Game/Materials/M_Floor'
        ]
      };
      const result = tool.testFormatAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Materials (2):');
      expect(result.content[0].text).toContain('- /Game/Materials/M_Wall');
      expect(result.content[0].text).toContain('- /Game/Materials/M_Floor');
    });

    it('should format asset info with vertex and triangle counts', () => {
      const info = {
        vertexCount: 1500,
        triangleCount: 800
      };
      const result = tool.testFormatAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Vertex Count: 1500');
      expect(result.content[0].text).toContain('Triangle Count: 800');
    });

    it('should handle empty materials array', () => {
      const info = { materials: [] };
      const result = tool.testFormatAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).not.toContain('Materials');
    });

    it('should handle non-array materials', () => {
      const info = { materials: 'not-array' as any };
      const result = tool.testFormatAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).not.toContain('Materials');
    });
  });

  describe('formatEnhancedAssetInfo', () => {
    it('should format minimal enhanced asset info', () => {
      const info: EnhancedAssetInfo = {};
      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Asset Information: /Game/Test/Asset');
    });

    it('should format enhanced asset info with type', () => {
      const info: EnhancedAssetInfo = { assetType: 'StaticMesh' };
      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/SM_Asset');

      expect(result.content[0].text).toContain('Type: StaticMesh');
    });

    it('should format enhanced asset info with bounds', () => {
      const info: EnhancedAssetInfo = {
        bounds: {
          size: { x: 200, y: 100, z: 50 },
          extent: { x: 100, y: 50, z: 25 },
          origin: { x: 0, y: 0, z: 25 },
          min: { x: -100, y: -50, z: 0 },
          max: { x: 100, y: 50, z: 50 }
        }
      };
      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Bounding Box:');
      expect(result.content[0].text).toContain('Size: [200, 100, 50]');
      expect(result.content[0].text).toContain('Extent: [100, 50, 25]');
      expect(result.content[0].text).toContain('Origin: [0, 0, 25]');
      expect(result.content[0].text).toContain('Min: [-100, -50, 0]');
      expect(result.content[0].text).toContain('Max: [100, 50, 50]');
    });

    it('should format bounds without min/max when not provided', () => {
      const info: EnhancedAssetInfo = {
        bounds: {
          size: { x: 200, y: 100, z: 50 },
          extent: { x: 100, y: 50, z: 25 },
          origin: { x: 0, y: 0, z: 25 }
        }
      };
      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Size: [200, 100, 50]');
      expect(result.content[0].text).not.toContain('Min:');
      expect(result.content[0].text).not.toContain('Max:');
    });

    it('should format pivot information', () => {
      const info: EnhancedAssetInfo = {
        pivot: {
          type: 'Center',
          offset: { x: 10, y: 5, z: 0 }
        }
      };
      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Pivot:');
      expect(result.content[0].text).toContain('Type: Center');
      expect(result.content[0].text).toContain('Offset: [10, 5, 0]');
    });

    it('should format collision information', () => {
      const info: EnhancedAssetInfo = {
        collision: {
          hasCollision: true,
          numCollisionPrimitives: 3,
          collisionComplexity: 'Simple'
        }
      };
      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Collision:');
      expect(result.content[0].text).toContain('Has Collision: true');
      expect(result.content[0].text).toContain('Collision Primitives: 3');
      expect(result.content[0].text).toContain('Complexity: Simple');
    });

    it('should format collision without primitives when zero', () => {
      const info: EnhancedAssetInfo = {
        collision: {
          hasCollision: false,
          numCollisionPrimitives: 0
        }
      };
      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Has Collision: false');
      expect(result.content[0].text).not.toContain('Collision Primitives:');
    });

    it('should format socket information', () => {
      const info: EnhancedAssetInfo = {
        sockets: [
          {
            name: 'Door',
            location: { x: 100, y: 0, z: 100 },
            rotation: { roll: 0, pitch: 0, yaw: 90 }
          },
          {
            name: 'Window',
            location: { x: 50, y: 100, z: 150 },
            rotation: { roll: 0, pitch: 0, yaw: 180 }
          }
        ]
      };
      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Sockets (2):');
      expect(result.content[0].text).toContain('- Door:');
      expect(result.content[0].text).toContain('Location: [100, 0, 100]');
      expect(result.content[0].text).toContain('Rotation: [0, 0, 90]');
      expect(result.content[0].text).toContain('- Window:');
      expect(result.content[0].text).toContain('Location: [50, 100, 150]');
      expect(result.content[0].text).toContain('Rotation: [0, 0, 180]');
    });

    it('should format material slots', () => {
      const info: EnhancedAssetInfo = {
        materialSlots: [
          {
            slotName: 'Wall',
            materialPath: '/Game/Materials/M_Wall'
          },
          {
            slotName: 'Trim',
            materialPath: null
          }
        ]
      };
      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Material Slots (2):');
      expect(result.content[0].text).toContain('- Wall: /Game/Materials/M_Wall');
      expect(result.content[0].text).toContain('- Trim: None');
    });

    it('should format mesh statistics', () => {
      const info: EnhancedAssetInfo = {
        numVertices: 2500,
        numTriangles: 1200,
        numLODs: 4
      };
      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Vertices: 2500');
      expect(result.content[0].text).toContain('Triangles: 1200');
      expect(result.content[0].text).toContain('LODs: 4');
    });

    it('should format blueprint information', () => {
      const info: EnhancedAssetInfo = {
        blueprintClass: 'BP_Wall',
        components: [
          {
            name: 'StaticMeshComponent',
            class: 'UStaticMeshComponent',
            meshPath: '/Game/Meshes/SM_Wall'
          },
          {
            name: 'CollisionComponent',
            class: 'UBoxComponent'
          }
        ]
      };
      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Blueprint Class: BP_Wall');
      expect(result.content[0].text).toContain('Components (2):');
      expect(result.content[0].text).toContain('- StaticMeshComponent (UStaticMeshComponent) - Mesh: /Game/Meshes/SM_Wall');
      expect(result.content[0].text).toContain('- CollisionComponent (UBoxComponent)');
    });

    it('should handle empty arrays gracefully', () => {
      const info: EnhancedAssetInfo = {
        sockets: [],
        materialSlots: [],
        components: []
      };
      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).not.toContain('Sockets');
      expect(result.content[0].text).not.toContain('Material Slots');
      expect(result.content[0].text).not.toContain('Components');
    });
  });
});