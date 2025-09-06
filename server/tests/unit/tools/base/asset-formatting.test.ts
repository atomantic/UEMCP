import { AssetTool, EnhancedAssetInfo } from '../../../../src/tools/base/asset-tool.js';

// Create a test implementation of AssetTool to access protected methods
class TestAssetTool extends AssetTool<any> {
  get definition() {
    return {
      name: 'test',
      description: 'test',
      inputSchema: { type: 'object', properties: {}, required: [] }
    };
  }

  protected async execute(): Promise<any> {
    throw new Error('Not implemented');
  }

  // Expose protected methods for testing
  public testFormatEnhancedAssetInfo(info: EnhancedAssetInfo, assetPath: string) {
    return this.formatEnhancedAssetInfo(info, assetPath);
  }

  public testFormatAssetList(assets: any[], path?: string) {
    return this.formatAssetList(assets, path);
  }

  public testFormatAssetInfo(info: any, assetPath: string) {
    return this.formatAssetInfo(info, assetPath);
  }
}

describe('Asset Formatting Business Logic', () => {
  let tool: TestAssetTool;

  beforeEach(() => {
    tool = new TestAssetTool();
  });

  describe('formatEnhancedAssetInfo', () => {
    it('should format basic asset type correctly', () => {
      const info: EnhancedAssetInfo = { success: true, assetType: 'StaticMesh' };
      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Asset Information: /Game/Test/Asset');
      expect(result.content[0].text).toContain('Type: StaticMesh');
    });

    it('should format bounds information correctly', () => {
      const info: EnhancedAssetInfo = {
        success: true,
        assetType: 'StaticMesh',
        bounds: {
          size: { x: 100, y: 200, z: 300 },
          extent: { x: 50, y: 100, z: 150 },
          origin: { x: 10, y: 20, z: 30 },
          min: { x: -40, y: -80, z: -120 },
          max: { x: 60, y: 120, z: 180 }
        }
      };

      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).toContain('Bounding Box:');
      expect(text).toContain('Size: [100, 200, 300]');
      expect(text).toContain('Extent: [50, 100, 150]');
      expect(text).toContain('Origin: [10, 20, 30]');
      expect(text).toContain('Min: [-40, -80, -120]');
      expect(text).toContain('Max: [60, 120, 180]');
    });

    it('should format bounds without min/max when not provided', () => {
      const info: EnhancedAssetInfo = {
        success: true,
        assetType: 'StaticMesh',
        bounds: {
          size: { x: 100, y: 200, z: 300 },
          extent: { x: 50, y: 100, z: 150 },
          origin: { x: 0, y: 0, z: 0 }
        }
      };

      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).toContain('Size: [100, 200, 300]');
      expect(text).not.toContain('Min:');
      expect(text).not.toContain('Max:');
    });

    it('should format pivot information correctly', () => {
      const info: EnhancedAssetInfo = {
        success: true,
        assetType: 'StaticMesh',
        pivot: {
          type: 'center',
          offset: { x: 5, y: 10, z: 15 }
        }
      };

      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).toContain('Pivot:');
      expect(text).toContain('Type: center');
      expect(text).toContain('Offset: [5, 10, 15]');
    });

    it('should format collision information with all details', () => {
      const info: EnhancedAssetInfo = {
        success: true,
        assetType: 'StaticMesh',
        collision: {
          hasCollision: true,
          numCollisionPrimitives: 3,
          collisionComplexity: 'complex',
          hasSimpleCollision: true
        }
      };

      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).toContain('Collision:');
      expect(text).toContain('Has Collision: true');
      expect(text).toContain('Collision Primitives: 3');
      expect(text).toContain('Complexity: complex');
    });

    it('should format collision information without optional fields', () => {
      const info: EnhancedAssetInfo = {
        success: true,
        assetType: 'StaticMesh',
        collision: {
          hasCollision: false
        }
      };

      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).toContain('Has Collision: false');
      expect(text).not.toContain('Collision Primitives:');
      expect(text).not.toContain('Complexity:');
    });

    it('should handle zero collision primitives correctly', () => {
      const info: EnhancedAssetInfo = {
        success: true,
        assetType: 'StaticMesh',
        collision: {
          hasCollision: true,
          numCollisionPrimitives: 0
        }
      };

      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).toContain('Has Collision: true');
      expect(text).not.toContain('Collision Primitives:');
    });

    it('should format socket information correctly', () => {
      const info: EnhancedAssetInfo = {
        success: true,
        assetType: 'StaticMesh',
        sockets: [
          {
            name: 'Socket1',
            location: { x: 10, y: 20, z: 30 },
            rotation: { roll: 0, pitch: 45, yaw: 90 }
          },
          {
            name: 'Socket2',
            location: { x: 40, y: 50, z: 60 },
            rotation: { roll: 10, pitch: 20, yaw: 30 }
          }
        ]
      };

      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).toContain('Sockets (2):');
      expect(text).toContain('- Socket1:');
      expect(text).toContain('Location: [10, 20, 30]');
      expect(text).toContain('Rotation: [0, 45, 90]');
      expect(text).toContain('- Socket2:');
      expect(text).toContain('Location: [40, 50, 60]');
      expect(text).toContain('Rotation: [10, 20, 30]');
    });

    it('should format material slots correctly', () => {
      const info: EnhancedAssetInfo = {
        success: true,
        assetType: 'StaticMesh',
        materialSlots: [
          { slotName: 'Material1', materialPath: '/Game/Materials/M_Red' },
          { slotName: 'Material2', materialPath: null }
        ]
      };

      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).toContain('Material Slots (2):');
      expect(text).toContain('- Material1: /Game/Materials/M_Red');
      expect(text).toContain('- Material2: None');
    });

    it('should format mesh statistics correctly', () => {
      const info: EnhancedAssetInfo = {
        success: true,
        assetType: 'StaticMesh',
        numVertices: 1500,
        numTriangles: 750,
        numLODs: 4
      };

      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).toContain('Vertices: 1500');
      expect(text).toContain('Triangles: 750');
      expect(text).toContain('LODs: 4');
    });

    it('should format blueprint information correctly', () => {
      const info: EnhancedAssetInfo = {
        success: true,
        assetType: 'Blueprint',
        blueprintClass: 'BP_TestActor',
        components: [
          { name: 'MeshComponent', class: 'StaticMeshComponent', meshPath: '/Game/Meshes/SM_Test' },
          { name: 'CollisionComponent', class: 'BoxComponent' }
        ]
      };

      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).toContain('Blueprint Class: BP_TestActor');
      expect(text).toContain('Components (2):');
      expect(text).toContain('- MeshComponent (StaticMeshComponent) - Mesh: /Game/Meshes/SM_Test');
      expect(text).toContain('- CollisionComponent (BoxComponent)');
    });

    it('should handle empty arrays gracefully', () => {
      const info: EnhancedAssetInfo = {
        success: true,
        assetType: 'StaticMesh',
        sockets: [],
        materialSlots: [],
        components: []
      };

      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).not.toContain('Sockets');
      expect(text).not.toContain('Material Slots');
      expect(text).not.toContain('Components');
    });

    it('should format complete asset info with all sections', () => {
      const info: EnhancedAssetInfo = {
        success: true,
        assetType: 'StaticMesh',
        bounds: {
          size: { x: 300, y: 300, z: 400 },
          extent: { x: 150, y: 150, z: 200 },
          origin: { x: 0, y: 0, z: 0 }
        },
        pivot: { type: 'bottom', offset: { x: 0, y: 0, z: -200 } },
        collision: { hasCollision: true, numCollisionPrimitives: 1 },
        sockets: [{ name: 'DoorSocket', location: { x: 0, y: 150, z: 0 }, rotation: { roll: 0, pitch: 0, yaw: 0 } }],
        materialSlots: [{ slotName: 'Wall', materialPath: '/Game/Materials/M_Wall' }],
        numVertices: 24,
        numTriangles: 12,
        numLODs: 1
      };

      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/ModularOldTown/SM_Wall01');
      const text = result.content[0].text;

      // Should contain all sections
      expect(text).toContain('Asset Information: /Game/ModularOldTown/SM_Wall01');
      expect(text).toContain('Type: StaticMesh');
      expect(text).toContain('Bounding Box:');
      expect(text).toContain('Pivot:');
      expect(text).toContain('Collision:');
      expect(text).toContain('Sockets (1):');
      expect(text).toContain('Material Slots (1):');
      expect(text).toContain('Vertices: 24');
      expect(text).toContain('Triangles: 12');
      expect(text).toContain('LODs: 1');
    });

    it('should handle undefined numeric values gracefully', () => {
      const info: EnhancedAssetInfo = {
        success: true,
        assetType: 'Blueprint',
        numVertices: undefined,
        numTriangles: undefined,
        numLODs: undefined
      };

      const result = tool.testFormatEnhancedAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).not.toContain('Vertices:');
      expect(text).not.toContain('Triangles:');
      expect(text).not.toContain('LODs:');
    });
  });

  describe('formatAssetList', () => {
    it('should format empty asset list', () => {
      const result = tool.testFormatAssetList([]);

      expect(result.content[0].text).toContain('Found 0 assets');
      expect(result.content[0].text).toContain('No assets found matching criteria.');
    });

    it('should format single asset correctly', () => {
      const assets = [{ name: 'SM_Wall', type: 'StaticMesh', path: '/Game/Meshes/SM_Wall' }];
      const result = tool.testFormatAssetList(assets);

      expect(result.content[0].text).toContain('Found 1 asset');
      expect(result.content[0].text).toContain('SM_Wall (StaticMesh)');
      expect(result.content[0].text).toContain('Path: /Game/Meshes/SM_Wall');
    });

    it('should format multiple assets correctly', () => {
      const assets = [
        { name: 'SM_Wall', type: 'StaticMesh', path: '/Game/Meshes/SM_Wall' },
        { name: 'M_Material', type: 'Material', path: '/Game/Materials/M_Material' }
      ];
      const result = tool.testFormatAssetList(assets);

      expect(result.content[0].text).toContain('Found 2 assets');
      expect(result.content[0].text).toContain('SM_Wall (StaticMesh)');
      expect(result.content[0].text).toContain('M_Material (Material)');
    });

    it('should include path in header when provided', () => {
      const assets = [{ name: 'SM_Wall', type: 'StaticMesh', path: '/Game/Meshes/SM_Wall' }];
      const result = tool.testFormatAssetList(assets, '/Game/ModularOldTown');

      expect(result.content[0].text).toContain('Found 1 asset in /Game/ModularOldTown');
    });

    it('should limit display to first 20 assets', () => {
      const assets = Array.from({ length: 25 }, (_, i) => ({
        name: `Asset${i}`,
        type: 'StaticMesh',
        path: `/Game/Assets/Asset${i}`
      }));

      const result = tool.testFormatAssetList(assets);
      const text = result.content[0].text;

      expect(text).toContain('Found 25 assets');
      expect(text).toContain('Asset0');
      expect(text).toContain('Asset19');
      expect(text).not.toContain('Asset20');
      expect(text).toContain('... and 5 more assets');
    });
  });

  describe('formatAssetInfo (legacy)', () => {
    it('should format basic asset info', () => {
      const info = { type: 'StaticMesh' };
      const result = tool.testFormatAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).toContain('Asset Information: /Game/Test/Asset');
      expect(result.content[0].text).toContain('Type: StaticMesh');
    });

    it('should format bounding box information', () => {
      const info = {
        type: 'StaticMesh',
        boundingBox: {
          min: [0, 0, 0],
          max: [100, 200, 300],
          size: [100, 200, 300]
        }
      };

      const result = tool.testFormatAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).toContain('Bounding Box:');
      expect(text).toContain('Min: [0, 0, 0]');
      expect(text).toContain('Max: [100, 200, 300]');
      expect(text).toContain('Size: [100, 200, 300]');
    });

    it('should format materials list', () => {
      const info = {
        materials: ['/Game/Materials/M_Red', '/Game/Materials/M_Blue']
      };

      const result = tool.testFormatAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).toContain('Materials (2):');
      expect(text).toContain('- /Game/Materials/M_Red');
      expect(text).toContain('- /Game/Materials/M_Blue');
    });

    it('should handle empty materials array', () => {
      const info = { materials: [] };
      const result = tool.testFormatAssetInfo(info, '/Game/Test/Asset');

      expect(result.content[0].text).not.toContain('Materials');
    });

    it('should format vertex and triangle counts', () => {
      const info = {
        vertexCount: 1500,
        triangleCount: 750
      };

      const result = tool.testFormatAssetInfo(info, '/Game/Test/Asset');
      const text = result.content[0].text;

      expect(text).toContain('Vertex Count: 1500');
      expect(text).toContain('Triangle Count: 750');
    });
  });
});