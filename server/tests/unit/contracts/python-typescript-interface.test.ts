/**
 * Contract tests for Python-TypeScript interface
 * 
 * These tests validate that TypeScript type definitions match what Python
 * operations actually provide. This catches interface drift and ensures
 * data contract consistency between layers.
 */

import { isEnhancedAssetInfo } from '../../../src/tools/base/asset-tool.js';
import { 
  WALL_ASSET_RESPONSE,
  CORNER_ASSET_RESPONSE,
  BLUEPRINT_DOOR_RESPONSE,
  COMPLEX_MESH_RESPONSE,
  NO_COLLISION_RESPONSE,
  ASSET_LIST_RESPONSE,
  LEVEL_ACTORS_RESPONSE,
  ACTOR_SPAWN_SUCCESS_RESPONSE,
  MATERIAL_APPLY_SUCCESS_RESPONSE,
  VIEWPORT_SCREENSHOT_RESPONSE,
  ASSET_NOT_FOUND_ERROR,
  VALIDATION_ERROR_RESPONSE
} from '../fixtures/python-responses.js';

describe('Python-TypeScript Interface Contracts', () => {
  
  describe('Asset Info Response Contracts', () => {
    it('should validate all asset info fixtures against TypeScript types', () => {
      const assetFixtures = [
        { name: 'WALL_ASSET_RESPONSE', fixture: WALL_ASSET_RESPONSE },
        { name: 'CORNER_ASSET_RESPONSE', fixture: CORNER_ASSET_RESPONSE },
        { name: 'BLUEPRINT_DOOR_RESPONSE', fixture: BLUEPRINT_DOOR_RESPONSE },
        { name: 'COMPLEX_MESH_RESPONSE', fixture: COMPLEX_MESH_RESPONSE },
        { name: 'NO_COLLISION_RESPONSE', fixture: NO_COLLISION_RESPONSE }
      ];

      assetFixtures.forEach(({ fixture }) => {
        expect(isEnhancedAssetInfo(fixture)).toBe(true);
      });
    });

    it('should validate required asset info properties', () => {
      // All asset responses should have success and assetType
      const assetResponses = [
        WALL_ASSET_RESPONSE,
        CORNER_ASSET_RESPONSE, 
        BLUEPRINT_DOOR_RESPONSE,
        COMPLEX_MESH_RESPONSE,
        NO_COLLISION_RESPONSE
      ];

      assetResponses.forEach(response => {
        expect(response).toHaveProperty('success', true);
        expect(response).toHaveProperty('assetType');
        expect(typeof response.assetType).toBe('string');
      });
    });

    it('should validate optional asset info properties structure', () => {
      // Test bounds structure when present
      const responsesWithBounds = [
        WALL_ASSET_RESPONSE,
        CORNER_ASSET_RESPONSE,
        BLUEPRINT_DOOR_RESPONSE,
        COMPLEX_MESH_RESPONSE,
        NO_COLLISION_RESPONSE
      ];

      responsesWithBounds.forEach(response => {
        if (response.bounds) {
          expect(response.bounds).toHaveProperty('size');
          expect(response.bounds).toHaveProperty('extent');
          expect(response.bounds).toHaveProperty('origin');
          
          // Validate Vec3 structures
          ['size', 'extent', 'origin'].forEach(prop => {
            const vec3 = (response.bounds as any)[prop];
            expect(vec3).toHaveProperty('x');
            expect(vec3).toHaveProperty('y');
            expect(vec3).toHaveProperty('z');
            expect(typeof vec3.x).toBe('number');
            expect(typeof vec3.y).toBe('number');
            expect(typeof vec3.z).toBe('number');
          });
        }
      });
    });

    it('should validate socket structure when present', () => {
      const responsesWithSockets = [WALL_ASSET_RESPONSE, CORNER_ASSET_RESPONSE, COMPLEX_MESH_RESPONSE];

      responsesWithSockets.forEach(response => {
        if (response.sockets && response.sockets.length > 0) {
          response.sockets.forEach(socket => {
            expect(socket).toHaveProperty('name');
            expect(socket).toHaveProperty('location');
            expect(socket).toHaveProperty('rotation');
            
            expect(typeof socket.name).toBe('string');
            
            // Validate location Vec3
            expect(socket.location).toHaveProperty('x');
            expect(socket.location).toHaveProperty('y');
            expect(socket.location).toHaveProperty('z');
            
            // Validate rotation structure
            expect(socket.rotation).toHaveProperty('roll');
            expect(socket.rotation).toHaveProperty('pitch');
            expect(socket.rotation).toHaveProperty('yaw');
          });
        }
      });
    });

    it('should validate material slot structure', () => {
      const responsesWithMaterials = [
        WALL_ASSET_RESPONSE,
        CORNER_ASSET_RESPONSE,
        BLUEPRINT_DOOR_RESPONSE,
        COMPLEX_MESH_RESPONSE,
        NO_COLLISION_RESPONSE
      ];

      responsesWithMaterials.forEach(response => {
        if (response.materialSlots) {
          expect(Array.isArray(response.materialSlots)).toBe(true);
          
          response.materialSlots.forEach(slot => {
            expect(slot).toHaveProperty('slotName');
            expect(slot).toHaveProperty('materialPath');
            expect(typeof slot.slotName).toBe('string');
            
            // materialPath can be string or null
            if (slot.materialPath !== null) {
              expect(typeof slot.materialPath).toBe('string');
            }
          });
        }
      });
    });

    it('should validate Blueprint-specific properties', () => {
      const blueprintResponse = BLUEPRINT_DOOR_RESPONSE;
      
      expect(blueprintResponse.assetType).toBe('Blueprint');
      expect(blueprintResponse).toHaveProperty('blueprintClass');
      expect(typeof blueprintResponse.blueprintClass).toBe('string');
      
      if (blueprintResponse.components) {
        expect(Array.isArray(blueprintResponse.components)).toBe(true);
        
        blueprintResponse.components.forEach(component => {
          expect(component).toHaveProperty('name');
          expect(component).toHaveProperty('class');
          expect(typeof component.name).toBe('string');
          expect(typeof component.class).toBe('string');
          
          // meshPath is optional
          if (component.meshPath) {
            expect(typeof component.meshPath).toBe('string');
          }
        });
      }
    });
  });

  describe('Asset List Response Contracts', () => {
    it('should validate asset list structure', () => {
      expect(ASSET_LIST_RESPONSE).toHaveProperty('success', true);
      expect(ASSET_LIST_RESPONSE).toHaveProperty('assets');
      expect(Array.isArray(ASSET_LIST_RESPONSE.assets)).toBe(true);
      
      ASSET_LIST_RESPONSE.assets.forEach(asset => {
        expect(asset).toHaveProperty('name');
        expect(asset).toHaveProperty('type');
        expect(asset).toHaveProperty('path');
        
        expect(typeof asset.name).toBe('string');
        expect(typeof asset.type).toBe('string');
        expect(typeof asset.path).toBe('string');
        expect(asset.path).toMatch(/^\/Game\//);
      });
    });
  });

  describe('Level Actor Response Contracts', () => {
    it('should validate level actors structure', () => {
      expect(LEVEL_ACTORS_RESPONSE).toHaveProperty('success', true);
      expect(LEVEL_ACTORS_RESPONSE).toHaveProperty('actors');
      expect(Array.isArray(LEVEL_ACTORS_RESPONSE.actors)).toBe(true);
      
      LEVEL_ACTORS_RESPONSE.actors.forEach(actor => {
        expect(actor).toHaveProperty('name');
        expect(actor).toHaveProperty('class');
        expect(actor).toHaveProperty('location');
        expect(actor).toHaveProperty('rotation');
        expect(actor).toHaveProperty('scale');
        expect(actor).toHaveProperty('assetPath');
        
        expect(typeof actor.name).toBe('string');
        expect(typeof actor.class).toBe('string');
        expect(typeof actor.assetPath).toBe('string');
        
        // Validate coordinate arrays
        [actor.location, actor.rotation, actor.scale].forEach(coords => {
          expect(Array.isArray(coords)).toBe(true);
          expect(coords).toHaveLength(3);
          coords.forEach(val => {
            expect(typeof val).toBe('number');
          });
        });
      });
    });
  });

  describe('Actor Spawn Response Contracts', () => {
    it('should validate successful spawn response', () => {
      expect(ACTOR_SPAWN_SUCCESS_RESPONSE).toHaveProperty('success', true);
      expect(ACTOR_SPAWN_SUCCESS_RESPONSE).toHaveProperty('actorName');
      expect(typeof ACTOR_SPAWN_SUCCESS_RESPONSE.actorName).toBe('string');
      
      // Validation properties
      expect(typeof ACTOR_SPAWN_SUCCESS_RESPONSE.validated).toBe('boolean');
      
      if (ACTOR_SPAWN_SUCCESS_RESPONSE.validation_warnings) {
        expect(Array.isArray(ACTOR_SPAWN_SUCCESS_RESPONSE.validation_warnings)).toBe(true);
        ACTOR_SPAWN_SUCCESS_RESPONSE.validation_warnings.forEach(warning => {
          expect(typeof warning).toBe('string');
        });
      }
    });

    it('should validate material apply response', () => {
      expect(MATERIAL_APPLY_SUCCESS_RESPONSE).toHaveProperty('success', true);
      expect(MATERIAL_APPLY_SUCCESS_RESPONSE).toHaveProperty('materialApplied');
      expect(MATERIAL_APPLY_SUCCESS_RESPONSE).toHaveProperty('slotIndex');
      
      expect(typeof MATERIAL_APPLY_SUCCESS_RESPONSE.materialApplied).toBe('string');
      expect(typeof MATERIAL_APPLY_SUCCESS_RESPONSE.slotIndex).toBe('number');
      expect(typeof MATERIAL_APPLY_SUCCESS_RESPONSE.validated).toBe('boolean');
    });
  });

  describe('Viewport Response Contracts', () => {
    it('should validate screenshot response structure', () => {
      expect(VIEWPORT_SCREENSHOT_RESPONSE).toHaveProperty('success', true);
      expect(VIEWPORT_SCREENSHOT_RESPONSE).toHaveProperty('screenshotPath');
      expect(VIEWPORT_SCREENSHOT_RESPONSE).toHaveProperty('resolution');
      expect(VIEWPORT_SCREENSHOT_RESPONSE).toHaveProperty('fileSize');
      
      expect(typeof VIEWPORT_SCREENSHOT_RESPONSE.screenshotPath).toBe('string');
      expect(typeof VIEWPORT_SCREENSHOT_RESPONSE.fileSize).toBe('number');
      
      // Validate resolution structure
      const resolution = VIEWPORT_SCREENSHOT_RESPONSE.resolution;
      expect(resolution).toHaveProperty('width');
      expect(resolution).toHaveProperty('height');
      expect(typeof resolution.width).toBe('number');
      expect(typeof resolution.height).toBe('number');
    });
  });

  describe('Error Response Contracts', () => {
    it('should validate error response structures', () => {
      const errorResponses = [
        ASSET_NOT_FOUND_ERROR,
        VALIDATION_ERROR_RESPONSE
      ];

      errorResponses.forEach(response => {
        expect(response).toHaveProperty('success', false);
        expect(response).toHaveProperty('error');
        expect(typeof response.error).toBe('string');
      });
    });

    it('should validate validation error specific structure', () => {
      expect(VALIDATION_ERROR_RESPONSE).toHaveProperty('validated', false);
      expect(VALIDATION_ERROR_RESPONSE).toHaveProperty('validation_errors');
      expect(VALIDATION_ERROR_RESPONSE).toHaveProperty('validation_warnings');
      
      expect(Array.isArray(VALIDATION_ERROR_RESPONSE.validation_errors)).toBe(true);
      expect(Array.isArray(VALIDATION_ERROR_RESPONSE.validation_warnings)).toBe(true);
      
      VALIDATION_ERROR_RESPONSE.validation_errors.forEach(error => {
        expect(typeof error).toBe('string');
      });
    });
  });

  describe('Data Type Consistency', () => {
    it('should ensure coordinate systems are consistent', () => {
      // All location/rotation arrays should be 3-element numeric arrays
      const actorsWithCoords = LEVEL_ACTORS_RESPONSE.actors;
      
      actorsWithCoords.forEach(actor => {
        [actor.location, actor.rotation, actor.scale].forEach((coords) => {
          expect(Array.isArray(coords)).toBe(true);
          expect(coords).toHaveLength(3);
          coords.forEach((val) => {
            expect(typeof val).toBe('number');
          });
        });
      });
    });

    it('should ensure asset paths follow UE conventions', () => {
      const pathContainers = [
        ...ASSET_LIST_RESPONSE.assets.map(a => ({ path: a.path, context: `Asset ${a.name}` })),
        ...LEVEL_ACTORS_RESPONSE.actors.map(a => ({ path: a.assetPath, context: `Actor ${a.name}` })),
        { path: MATERIAL_APPLY_SUCCESS_RESPONSE.materialApplied, context: 'Material apply response' }
      ];

      pathContainers.forEach(({ path }) => {
        expect(typeof path).toBe('string');
        expect(path).toMatch(/^\/(?:Game|Engine)\//);
      });
    });

    it('should ensure numeric precision consistency', () => {
      // Test that floating point numbers are preserved correctly
      const responsesWithNumbers = [
        WALL_ASSET_RESPONSE,
        COMPLEX_MESH_RESPONSE
      ];

      responsesWithNumbers.forEach(response => {
        if ('bounds' in response && response.bounds) {
          const bounds = response.bounds;
          ['size', 'extent', 'origin'].forEach(prop => {
            const vec3 = (bounds as any)[prop];
            if (vec3) {
              [vec3.x, vec3.y, vec3.z].forEach(val => {
                expect(typeof val).toBe('number');
                expect(isFinite(val)).toBe(true);
              });
            }
          });
        }
      });
    });

    it('should ensure boolean consistency', () => {
      // All boolean fields should be actual booleans, not strings
      const booleanFields = [
        { obj: WALL_ASSET_RESPONSE, path: 'collision.hasCollision' },
        { obj: WALL_ASSET_RESPONSE, path: 'collision.hasSimpleCollision' },
        { obj: ACTOR_SPAWN_SUCCESS_RESPONSE, path: 'validated' },
        { obj: VALIDATION_ERROR_RESPONSE, path: 'validated' }
      ];

      booleanFields.forEach(({ obj, path }) => {
        const value = path.split('.').reduce((curr: any, key) => curr?.[key], obj);
        if (value !== undefined) {
          expect(typeof value).toBe('boolean');
        }
      });
    });
  });

  describe('Interface Evolution Protection', () => {
    it('should detect when Python responses add unexpected properties', () => {
      // This test would catch if Python starts sending fields TypeScript doesn't know about
      const knownAssetProperties = new Set([
        'success', 'assetType', 'bounds', 'pivot', 'collision', 'sockets',
        'materialSlots', 'numVertices', 'numTriangles', 'numLODs',
        'blueprintClass', 'components', 'additionalProperties'
      ]);

      const unknownProperties: string[] = [];
      
      Object.keys(WALL_ASSET_RESPONSE).forEach(key => {
        if (!knownAssetProperties.has(key)) {
          unknownProperties.push(key);
        }
      });

      if (unknownProperties.length > 0) {
        console.warn(`Python response contains unknown properties: ${unknownProperties.join(', ')}`);
        console.warn('Consider updating TypeScript interfaces or adding to additionalProperties');
      }

      // This is a warning, not a failure - allows interface evolution
      expect(unknownProperties.length).toBeLessThan(5); // Reasonable threshold
    });

    it('should validate that required TypeScript properties exist in Python responses', () => {
      // Ensure Python provides what TypeScript expects as required
      const requiredProperties = ['success', 'assetType'];
      
      requiredProperties.forEach(prop => {
        expect(WALL_ASSET_RESPONSE).toHaveProperty(prop);
      });
    });
  });
});