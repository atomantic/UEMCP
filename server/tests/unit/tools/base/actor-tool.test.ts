import { ActorTool } from '../../../../src/tools/base/actor-tool.js';
import { PythonResult } from '../../../../src/tools/base/base-tool.js';

// Create a test implementation of ActorTool to access protected methods
class TestActorTool extends ActorTool<any> {
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
  public testFormatValidation(result: PythonResult) {
    return this.formatValidation(result);
  }

  public testBuildSuccessResponse(mainText: string, result?: PythonResult) {
    return this.buildSuccessResponse(mainText, result);
  }

  public testFormatLocation(location: unknown) {
    return this.formatLocation(location);
  }

  public testFormatRotation(rotation: unknown) {
    return this.formatRotation(rotation);
  }

  public testHasRotation(rotation: unknown) {
    return this.hasRotation(rotation);
  }

  public testHasScale(scale: unknown) {
    return this.hasScale(scale);
  }
}

describe('ActorTool Business Logic', () => {
  let tool: TestActorTool;

  beforeEach(() => {
    tool = new TestActorTool();
  });

  describe('formatValidation', () => {
    it('should format validation when validated is undefined', () => {
      const result: PythonResult = { success: true };
      const formatted = tool.testFormatValidation(result);
      expect(formatted).toBe('');
    });

    it('should format passing validation', () => {
      const result: PythonResult = { success: true, validated: true };
      const formatted = tool.testFormatValidation(result);
      expect(formatted).toBe('\nValidation: ✓ Passed');
    });

    it('should format failing validation with errors', () => {
      const result: PythonResult = { 
        success: true, 
        validated: false, 
        validation_errors: ['Asset not found'] 
      };
      const formatted = tool.testFormatValidation(result);
      expect(formatted).toBe('\nValidation: ✗ Failed\nValidation Errors:\n  - Asset not found');
    });

    it('should format validation with warnings', () => {
      const result: PythonResult = { 
        success: true, 
        validated: true, 
        validation_warnings: ['Actor placed outside bounds'] 
      };
      const formatted = tool.testFormatValidation(result);
      expect(formatted).toBe('\nValidation: ✓ Passed\nValidation Warnings:\n  - Actor placed outside bounds');
    });
  });

  describe('buildSuccessResponse', () => {
    it('should build response without validation', () => {
      const response = tool.testBuildSuccessResponse('Actor spawned successfully');
      
      expect(response.content).toHaveLength(1);
      expect(response.content[0].type).toBe('text');
      expect(response.content[0].text).toBe('Actor spawned successfully');
    });

    it('should build response with passing validation', () => {
      const result: PythonResult = { success: true, validated: true };
      const response = tool.testBuildSuccessResponse('Actor spawned successfully', result);
      
      expect(response.content[0].text).toBe('Actor spawned successfully\nValidation: ✓ Passed');
    });

    it('should build response with failing validation', () => {
      const result: PythonResult = { 
        success: true, 
        validated: false,
        validation_errors: ['Location invalid']
      };
      const response = tool.testBuildSuccessResponse('Actor spawned', result);
      
      expect(response.content[0].text).toBe('Actor spawned\nValidation: ✗ Failed\nValidation Errors:\n  - Location invalid');
    });

    it('should build response when result has no validation data', () => {
      const result: PythonResult = { success: true, actorName: 'TestActor' };
      const response = tool.testBuildSuccessResponse('Actor spawned successfully', result);
      
      expect(response.content[0].text).toBe('Actor spawned successfully');
    });
  });

  describe('formatLocation', () => {
    it('should format valid 3D location array', () => {
      const location = [100, 200, 300];
      const result = tool.testFormatLocation(location);
      expect(result).toBe('[100, 200, 300]');
    });

    it('should format location with decimal values', () => {
      const location = [100.5, 200.75, 300.25];
      const result = tool.testFormatLocation(location);
      expect(result).toBe('[100.5, 200.75, 300.25]');
    });

    it('should format location with negative values', () => {
      const location = [-100, -200, 50];
      const result = tool.testFormatLocation(location);
      expect(result).toBe('[-100, -200, 50]');
    });

    it('should format location with zero values', () => {
      const location = [0, 0, 0];
      const result = tool.testFormatLocation(location);
      expect(result).toBe('[0, 0, 0]');
    });

    it('should return [Unknown] for non-array', () => {
      const result = tool.testFormatLocation('not an array');
      expect(result).toBe('[Unknown]');
    });

    it('should return [Unknown] for null', () => {
      const result = tool.testFormatLocation(null);
      expect(result).toBe('[Unknown]');
    });

    it('should return [Unknown] for undefined', () => {
      const result = tool.testFormatLocation(undefined);
      expect(result).toBe('[Unknown]');
    });

    it('should return [Unknown] for array with wrong length', () => {
      const result = tool.testFormatLocation([100, 200]);
      expect(result).toBe('[Unknown]');
    });

    it('should return [Unknown] for array with too many elements', () => {
      const result = tool.testFormatLocation([100, 200, 300, 400]);
      expect(result).toBe('[Unknown]');
    });

    it('should return [Unknown] for empty array', () => {
      const result = tool.testFormatLocation([]);
      expect(result).toBe('[Unknown]');
    });

    it('should handle array with non-numeric values', () => {
      const location = [100, 'invalid', 300];
      const result = tool.testFormatLocation(location);
      expect(result).toBe('[100, invalid, 300]'); // Still formats, but invalid
    });
  });

  describe('formatRotation', () => {
    it('should format valid 3D rotation array', () => {
      const rotation = [0, 90, 180];
      const result = tool.testFormatRotation(rotation);
      expect(result).toBe('[0, 90, 180]°');
    });

    it('should format rotation with decimal values', () => {
      const rotation = [45.5, 90.25, 270.75];
      const result = tool.testFormatRotation(rotation);
      expect(result).toBe('[45.5, 90.25, 270.75]°');
    });

    it('should format rotation with negative values', () => {
      const rotation = [-90, -45, 90];
      const result = tool.testFormatRotation(rotation);
      expect(result).toBe('[-90, -45, 90]°');
    });

    it('should format zero rotation', () => {
      const rotation = [0, 0, 0];
      const result = tool.testFormatRotation(rotation);
      expect(result).toBe('[0, 0, 0]°');
    });

    it('should return [Unknown] for non-array', () => {
      const result = tool.testFormatRotation('not an array');
      expect(result).toBe('[Unknown]');
    });

    it('should return [Unknown] for null', () => {
      const result = tool.testFormatRotation(null);
      expect(result).toBe('[Unknown]');
    });

    it('should return [Unknown] for undefined', () => {
      const result = tool.testFormatRotation(undefined);
      expect(result).toBe('[Unknown]');
    });

    it('should return [Unknown] for array with wrong length', () => {
      const result = tool.testFormatRotation([90, 180]);
      expect(result).toBe('[Unknown]');
    });

    it('should return [Unknown] for empty array', () => {
      const result = tool.testFormatRotation([]);
      expect(result).toBe('[Unknown]');
    });

    it('should handle large rotation values', () => {
      const rotation = [3600, 720, 1080]; // Multiple full rotations
      const result = tool.testFormatRotation(rotation);
      expect(result).toBe('[3600, 720, 1080]°');
    });
  });

  describe('hasRotation', () => {
    it('should return false for zero rotation', () => {
      const rotation = [0, 0, 0];
      const result = tool.testHasRotation(rotation);
      expect(result).toBe(false);
    });

    it('should return true for non-zero rotation in first element', () => {
      const rotation = [90, 0, 0];
      const result = tool.testHasRotation(rotation);
      expect(result).toBe(true);
    });

    it('should return true for non-zero rotation in second element', () => {
      const rotation = [0, 45, 0];
      const result = tool.testHasRotation(rotation);
      expect(result).toBe(true);
    });

    it('should return true for non-zero rotation in third element', () => {
      const rotation = [0, 0, 180];
      const result = tool.testHasRotation(rotation);
      expect(result).toBe(true);
    });

    it('should return true for multiple non-zero rotations', () => {
      const rotation = [90, 45, 180];
      const result = tool.testHasRotation(rotation);
      expect(result).toBe(true);
    });

    it('should return true for negative rotation', () => {
      const rotation = [-90, 0, 0];
      const result = tool.testHasRotation(rotation);
      expect(result).toBe(true);
    });

    it('should return true for decimal rotation', () => {
      const rotation = [0.5, 0, 0];
      const result = tool.testHasRotation(rotation);
      expect(result).toBe(true);
    });

    it('should return false for non-array', () => {
      const result = tool.testHasRotation('not an array');
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      const result = tool.testHasRotation(null);
      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      const result = tool.testHasRotation(undefined);
      expect(result).toBe(false);
    });

    it('should return false for empty array', () => {
      const result = tool.testHasRotation([]);
      expect(result).toBe(false);
    });

    it('should handle array with non-numeric values', () => {
      const rotation = [0, 'invalid', 0];
      const result = tool.testHasRotation(rotation);
      expect(result).toBe(true); // 'invalid' !== 0, so some() returns true
    });
  });

  describe('hasScale', () => {
    it('should return false for uniform scale of 1', () => {
      const scale = [1, 1, 1];
      const result = tool.testHasScale(scale);
      expect(result).toBe(false);
    });

    it('should return true for non-uniform scale in first element', () => {
      const scale = [2, 1, 1];
      const result = tool.testHasScale(scale);
      expect(result).toBe(true);
    });

    it('should return true for non-uniform scale in second element', () => {
      const scale = [1, 0.5, 1];
      const result = tool.testHasScale(scale);
      expect(result).toBe(true);
    });

    it('should return true for non-uniform scale in third element', () => {
      const scale = [1, 1, 3];
      const result = tool.testHasScale(scale);
      expect(result).toBe(true);
    });

    it('should return true for multiple non-uniform scales', () => {
      const scale = [2, 0.5, 3];
      const result = tool.testHasScale(scale);
      expect(result).toBe(true);
    });

    it('should return true for negative scale', () => {
      const scale = [-1, 1, 1];
      const result = tool.testHasScale(scale);
      expect(result).toBe(true);
    });

    it('should return true for zero scale', () => {
      const scale = [0, 1, 1];
      const result = tool.testHasScale(scale);
      expect(result).toBe(true);
    });

    it('should return true for decimal scale', () => {
      const scale = [1.5, 1, 1];
      const result = tool.testHasScale(scale);
      expect(result).toBe(true);
    });

    it('should return false for non-array', () => {
      const result = tool.testHasScale('not an array');
      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      const result = tool.testHasScale(null);
      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      const result = tool.testHasScale(undefined);
      expect(result).toBe(false);
    });

    it('should return false for empty array', () => {
      const result = tool.testHasScale([]);
      expect(result).toBe(false);
    });

    it('should handle array with non-numeric values', () => {
      const scale = [1, 'invalid', 1];
      const result = tool.testHasScale(scale);
      expect(result).toBe(true); // 'invalid' !== 1, so some() returns true
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers in location', () => {
      const location = [1e6, 1e6, 1e6];
      const result = tool.testFormatLocation(location);
      expect(result).toBe('[1000000, 1000000, 1000000]');
    });

    it('should handle very small numbers in rotation', () => {
      const rotation = [1e-10, 1e-10, 1e-10];
      const result = tool.testFormatRotation(rotation);
      expect(result).toBe('[1e-10, 1e-10, 1e-10]°');
    });

    it('should handle Infinity values', () => {
      const location = [Infinity, -Infinity, 0];
      const result = tool.testFormatLocation(location);
      expect(result).toBe('[Infinity, -Infinity, 0]');
    });

    it('should handle NaN values', () => {
      const rotation = [NaN, 0, 90];
      const result = tool.testFormatRotation(rotation);
      expect(result).toBe('[NaN, 0, 90]°');
    });

    it('should detect rotation with very small non-zero values', () => {
      const rotation = [1e-15, 0, 0];
      const result = tool.testHasRotation(rotation);
      expect(result).toBe(true);
    });

    it('should detect scale with very small differences from 1', () => {
      const scale = [1.0000001, 1, 1];
      const result = tool.testHasScale(scale);
      expect(result).toBe(true);
    });
  });
});