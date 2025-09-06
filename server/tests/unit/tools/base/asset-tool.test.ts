import { isEnhancedAssetInfo, EnhancedAssetInfo } from '../../../../src/tools/base/asset-tool.js';

describe('Asset Tool Business Logic', () => {
  describe('isEnhancedAssetInfo type guard', () => {
    it('should accept valid minimal asset info', () => {
      const validInfo = { success: true, assetType: 'StaticMesh' };
      expect(isEnhancedAssetInfo(validInfo)).toBe(true);
    });

    it('should accept valid complete asset info', () => {
      const validInfo: EnhancedAssetInfo = {
        success: true,
        assetType: 'StaticMesh',
        bounds: {
          size: { x: 100, y: 200, z: 300 },
          extent: { x: 50, y: 100, z: 150 },
          origin: { x: 0, y: 0, z: 0 },
          min: { x: -50, y: -100, z: -150 },
          max: { x: 50, y: 100, z: 150 }
        },
        pivot: {
          type: 'center',
          offset: { x: 0, y: 0, z: 0 }
        },
        collision: {
          hasCollision: true,
          numCollisionPrimitives: 2,
          collisionComplexity: 'simple'
        },
        sockets: [{
          name: 'Socket1',
          location: { x: 0, y: 0, z: 0 },
          rotation: { roll: 0, pitch: 0, yaw: 0 }
        }],
        materialSlots: [{ slotName: 'Material', materialPath: '/Game/Materials/M_Default' }],
        numVertices: 1000,
        numTriangles: 500,
        numLODs: 3,
        blueprintClass: 'Blueprint',
        components: [{ name: 'MeshComponent', class: 'StaticMeshComponent' }],
        additionalProperties: { customProperty: 'value' }
      };
      
      expect(isEnhancedAssetInfo(validInfo)).toBe(true);
    });

    it('should reject null or undefined', () => {
      expect(isEnhancedAssetInfo(null)).toBe(false);
      expect(isEnhancedAssetInfo(undefined)).toBe(false);
    });

    it('should reject non-objects', () => {
      expect(isEnhancedAssetInfo('string')).toBe(false);
      expect(isEnhancedAssetInfo(123)).toBe(false);
      expect(isEnhancedAssetInfo(true)).toBe(false);
      expect(isEnhancedAssetInfo([])).toBe(false);
    });

    it('should reject invalid assetType', () => {
      expect(isEnhancedAssetInfo({ assetType: 123 })).toBe(false);
      expect(isEnhancedAssetInfo({ assetType: null })).toBe(false);
      expect(isEnhancedAssetInfo({ assetType: [] })).toBe(false);
    });

    it('should reject invalid numeric properties', () => {
      expect(isEnhancedAssetInfo({ numVertices: '1000' })).toBe(false);
      expect(isEnhancedAssetInfo({ numTriangles: null })).toBe(false);
      expect(isEnhancedAssetInfo({ numLODs: [] })).toBe(false);
    });

    it('should reject invalid string properties', () => {
      expect(isEnhancedAssetInfo({ blueprintClass: 123 })).toBe(false);
      expect(isEnhancedAssetInfo({ blueprintClass: null })).toBe(false);
    });

    it('should reject invalid array properties', () => {
      expect(isEnhancedAssetInfo({ sockets: 'not an array' })).toBe(false);
      expect(isEnhancedAssetInfo({ materialSlots: 123 })).toBe(false);
      expect(isEnhancedAssetInfo({ components: null })).toBe(false);
    });

    it('should reject invalid additionalProperties', () => {
      expect(isEnhancedAssetInfo({ additionalProperties: 'string' })).toBe(false);
      expect(isEnhancedAssetInfo({ additionalProperties: null })).toBe(false);
      expect(isEnhancedAssetInfo({ additionalProperties: [] })).toBe(false);
    });

    it('should accept valid additionalProperties object', () => {
      const validInfo = { 
        success: true,
        assetType: 'Material',
        additionalProperties: { prop1: 'value', prop2: 42, prop3: { nested: true } }
      };
      expect(isEnhancedAssetInfo(validInfo)).toBe(true);
    });

    it('should handle mixed valid and invalid properties', () => {
      const validInfo = { 
        success: true,
        assetType: 'StaticMesh',
        numVertices: 1000,
        sockets: [],
        additionalProperties: { custom: 'data' }
      };
      expect(isEnhancedAssetInfo(validInfo)).toBe(true);

      const invalidInfo = { 
        assetType: 'StaticMesh',
        numVertices: 'invalid', // This makes it invalid
        sockets: [],
        additionalProperties: { custom: 'data' }
      };
      expect(isEnhancedAssetInfo(invalidInfo)).toBe(false);
    });
  });
});