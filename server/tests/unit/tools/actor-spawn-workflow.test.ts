/**
 * Integration tests for actor spawn workflow
 * 
 * Tests complete actor spawning functionality with realistic validation
 * responses from Python operations.
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

import { ActorSpawnTool } from '../../../src/tools/actors/spawn.js';
import { 
  ACTOR_SPAWN_SUCCESS_RESPONSE,
  ACTOR_SPAWN_VALIDATION_ERROR_RESPONSE,
  ASSET_NOT_FOUND_ERROR 
} from '../fixtures/python-responses.js';

describe('Actor Spawn Workflow Integration', () => {
  let tool: ActorSpawnTool;

  beforeEach(() => {
    tool = new ActorSpawnTool();
    jest.clearAllMocks();
  });

  describe('Successful Actor Spawn', () => {
    it('should handle successful spawn with validation warnings', async () => {
      mockExecuteCommand.mockResolvedValue(ACTOR_SPAWN_SUCCESS_RESPONSE);

      const args = {
        assetPath: '/Game/ModularOldTown/Meshes/SM_Wall_01',
        location: [1000, 2000, 100],
        rotation: [0, 0, 0],
        name: 'Wall_TestSpawn'
      };

      const result = await tool.handler(args);

      // Verify Python command structure
      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor.spawn',
        params: args
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const text = result.content[0].text!;
      
      // Verify spawn success message with actor name
      expect(text).toContain('Spawned actor: Wall_TestSpawn');
      expect(text).toContain('Asset: /Game/ModularOldTown/Meshes/SM_Wall_01');
      expect(text).toContain('Location: [1000, 2000, 100]');
      
      // Verify validation section
      expect(text).toContain('Validation: ✓ Passed');
      expect(text).toContain('Validation Warnings:');
      expect(text).toContain('- Actor placed outside recommended building bounds');
    });

    it('should handle spawn with minimal parameters', async () => {
      const minimalResponse = {
        success: true,
        actorName: 'StaticMeshActor_42',
        validated: true
      };
      
      mockExecuteCommand.mockResolvedValue(minimalResponse);

      const args = {
        assetPath: '/Engine/BasicShapes/Cube',
        location: [0, 0, 0]
      };

      const result = await tool.handler(args);
      const text = result.content[0].text!;
      
      expect(text).toContain('Spawned actor: StaticMeshActor_42');
      expect(text).toContain('Asset: /Engine/BasicShapes/Cube');
      expect(text).toContain('Location: [0, 0, 0]');
      expect(text).toContain('Validation: ✓ Passed');
      expect(text).not.toContain('Rotation:'); // Not specified
      expect(text).not.toContain('Scale:'); // Not specified
    });

    it('should handle spawn with rotation and scale', async () => {
      const fullResponse = {
        success: true,
        actorName: 'Wall_Rotated',
        validated: true
      };
      
      mockExecuteCommand.mockResolvedValue(fullResponse);

      const args = {
        assetPath: '/Game/ModularOldTown/Meshes/SM_Wall_01',
        location: [1000, 2000, 100],
        rotation: [0, 0, 90],
        scale: [2, 1, 1],
        name: 'Wall_Rotated'
      };

      const result = await tool.handler(args);
      const text = result.content[0].text!;
      
      expect(text).toContain('Location: [1000, 2000, 100]');
      expect(text).toContain('Rotation: [0, 0, 90]°');
      expect(text).toContain('Scale: [2, 1, 1]');
    });

    it('should handle spawn in specific folder', async () => {
      const folderResponse = {
        success: true,
        actorName: 'Door_Main',
        validated: true
      };
      
      mockExecuteCommand.mockResolvedValue(folderResponse);

      const args = {
        assetPath: '/Game/Blueprints/BP_Door',
        location: [1150, 2000, 100],
        folder: 'Building/Doors',
        name: 'Door_Main'
      };

      const result = await tool.handler(args);
      const text = result.content[0].text!;
      
      expect(text).toContain('Spawned actor: Door_Main');
      expect(text).toContain('Folder: Building/Doors');
    });
  });

  describe('Spawn Validation Failures', () => {
    it('should handle spawn validation errors', async () => {
      mockExecuteCommand.mockResolvedValue(ACTOR_SPAWN_VALIDATION_ERROR_RESPONSE);

      const args = {
        assetPath: '/Game/Invalid/Asset',
        location: [0, 0, 0]
      };

      await expect(tool.handler(args)).rejects.toThrow('Spawn validation failed');
    });

    it('should handle asset not found during spawn', async () => {
      mockExecuteCommand.mockResolvedValue(ASSET_NOT_FOUND_ERROR);

      const args = {
        assetPath: '/Game/NonExistent/Asset',
        location: [100, 200, 300]
      };

      await expect(tool.handler(args)).rejects.toThrow('Asset not found');
    });
  });

  describe('Location and Rotation Formatting', () => {
    it('should format location arrays correctly', async () => {
      const response = {
        success: true,
        actorName: 'TestActor',
        validated: true
      };
      
      mockExecuteCommand.mockResolvedValue(response);

      // Test various location formats
      const testCases = [
        { location: [0, 0, 0], expected: '[0, 0, 0]' },
        { location: [100.5, 200.25, 300.75], expected: '[100.5, 200.25, 300.75]' },
        { location: [-500, -1000, 50], expected: '[-500, -1000, 50]' }
      ];

      for (const testCase of testCases) {
        const args = {
          assetPath: '/Engine/BasicShapes/Cube',
          location: testCase.location
        };

        const result = await tool.handler(args);
        const text = result.content[0].text!;
        
        expect(text).toContain(`Location: ${testCase.expected}`);
        
        jest.clearAllMocks();
        mockExecuteCommand.mockResolvedValue(response);
      }
    });

    it('should format rotation arrays correctly', async () => {
      const response = {
        success: true,
        actorName: 'TestActor',
        validated: true
      };
      
      mockExecuteCommand.mockResolvedValue(response);

      const testCases = [
        { rotation: [0, 90, 180], expected: '[0, 90, 180]°' },
        { rotation: [-45, 22.5, -180], expected: '[-45, 22.5, -180]°' },
        { rotation: [5, 0, 0], expected: '[5, 0, 0]°' }
      ];

      for (const testCase of testCases) {
        const args = {
          assetPath: '/Engine/BasicShapes/Cube',
          location: [0, 0, 0],
          rotation: testCase.rotation
        };

        const result = await tool.handler(args);
        const text = result.content[0].text!;
        
        expect(text).toContain(`Rotation: ${testCase.expected}`);
        
        jest.clearAllMocks();
        mockExecuteCommand.mockResolvedValue(response);
      }
    });

    it('should detect and show non-zero rotation', async () => {
      const response = {
        success: true,
        actorName: 'TestActor',
        validated: true
      };
      
      mockExecuteCommand.mockResolvedValue(response);

      // Test with zero rotation - should not show rotation line
      let args = {
        assetPath: '/Engine/BasicShapes/Cube',
        location: [0, 0, 0],
        rotation: [0, 0, 0]
      };

      let result = await tool.handler(args);
      let text = result.content[0].text!;
      
      expect(text).not.toContain('Rotation:'); // Zero rotation omitted
      
      jest.clearAllMocks();
      mockExecuteCommand.mockResolvedValue(response);

      // Test with non-zero rotation - should show rotation line
      args = {
        assetPath: '/Engine/BasicShapes/Cube',
        location: [0, 0, 0],
        rotation: [0, 0, 90]
      };

      result = await tool.handler(args);
      text = result.content[0].text!;
      
      expect(text).toContain('Rotation: [0, 0, 90]°');
    });

    it('should detect and show non-uniform scale', async () => {
      const response = {
        success: true,
        actorName: 'TestActor',
        validated: true
      };
      
      mockExecuteCommand.mockResolvedValue(response);

      // Test with uniform scale - should not show scale line
      let args = {
        assetPath: '/Engine/BasicShapes/Cube',
        location: [0, 0, 0],
        scale: [1, 1, 1]
      };

      let result = await tool.handler(args);
      let text = result.content[0].text!;
      
      expect(text).not.toContain('Scale:'); // Uniform scale omitted
      
      jest.clearAllMocks();
      mockExecuteCommand.mockResolvedValue(response);

      // Test with non-uniform scale - should show scale line
      args = {
        assetPath: '/Engine/BasicShapes/Cube',
        location: [0, 0, 0],
        scale: [2, 1, 0.5]
      };

      result = await tool.handler(args);
      text = result.content[0].text!;
      
      expect(text).toContain('Scale: [2, 1, 0.5]');
    });
  });

  describe('Validation Response Integration', () => {
    it('should handle complex validation with both errors and warnings', async () => {
      const complexValidationResponse = {
        success: false,
        error: 'Spawn partially failed',
        validated: false,
        validation_errors: [
          'Asset path validation failed',
          'Location intersects with existing geometry'
        ],
        validation_warnings: [
          'Asset has no collision - may fall through world',
          'Location is outside level bounds'
        ]
      };
      
      mockExecuteCommand.mockResolvedValue(complexValidationResponse);

      const args = {
        assetPath: '/Game/Invalid/Asset',
        location: [0, 0, 0]
      };

      await expect(tool.handler(args)).rejects.toThrow('Spawn partially failed');
    });

    it('should handle spawn without validation data', async () => {
      const noValidationResponse = {
        success: true,
        actorName: 'SimpleActor'
        // No validation fields
      };
      
      mockExecuteCommand.mockResolvedValue(noValidationResponse);

      const args = {
        assetPath: '/Engine/BasicShapes/Cube',
        location: [0, 0, 0]
      };

      const result = await tool.handler(args);
      const text = result.content[0].text!;
      
      expect(text).toContain('Spawned actor: SimpleActor');
      expect(text).not.toContain('Validation:'); // No validation section
    });
  });

  describe('Parameter Validation', () => {
    it('should pass through all spawn parameters correctly', async () => {
      const response = {
        success: true,
        actorName: 'CompleteActor',
        validated: true
      };
      
      mockExecuteCommand.mockResolvedValue(response);

      const args = {
        assetPath: '/Game/Complex/Asset',
        location: [1000, 2000, 300],
        rotation: [0, 45, 90],
        scale: [1.5, 2.0, 0.8],
        name: 'CompleteActor',
        folder: 'Test/Actors',
        validate: true
      };

      await tool.handler(args);

      // Verify all parameters were passed to Python
      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor.spawn',
        params: {
          assetPath: '/Game/Complex/Asset',
          location: [1000, 2000, 300],
          rotation: [0, 45, 90],
          scale: [1.5, 2.0, 0.8],
          name: 'CompleteActor',
          folder: 'Test/Actors',
          validate: true
        }
      });
    });
  });

  describe('Contract Validation', () => {
    it('should validate realistic response structures', () => {
      // Test that our fixtures have expected structure
      expect(ACTOR_SPAWN_SUCCESS_RESPONSE.success).toBe(true);
      expect(typeof ACTOR_SPAWN_SUCCESS_RESPONSE.actorName).toBe('string');
      expect(typeof ACTOR_SPAWN_SUCCESS_RESPONSE.validated).toBe('boolean');
      expect(Array.isArray(ACTOR_SPAWN_SUCCESS_RESPONSE.validation_warnings)).toBe(true);
      
      expect(ACTOR_SPAWN_VALIDATION_ERROR_RESPONSE.success).toBe(false);
      expect(typeof ACTOR_SPAWN_VALIDATION_ERROR_RESPONSE.error).toBe('string');
      expect(ACTOR_SPAWN_VALIDATION_ERROR_RESPONSE.validated).toBe(false);
      expect(Array.isArray(ACTOR_SPAWN_VALIDATION_ERROR_RESPONSE.validation_errors)).toBe(true);
    });
  });
});