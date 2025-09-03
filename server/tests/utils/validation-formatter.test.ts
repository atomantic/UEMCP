import { ValidationFormatter } from '../../src/utils/validation-formatter.js';

describe('ValidationFormatter', () => {
  describe('format', () => {
    it('should return empty string when validation is undefined', () => {
      const result = ValidationFormatter.format(undefined);
      
      expect(result).toBe('');
    });

    it('should format successful validation', () => {
      const result = ValidationFormatter.format(true);
      
      expect(result).toBe('\nValidation: ✓ Passed');
    });

    it('should format failed validation', () => {
      const result = ValidationFormatter.format(false);
      
      expect(result).toBe('\nValidation: ✗ Failed');
    });

    it('should format validation with errors', () => {
      const errors = ['Invalid position', 'Asset not found'];
      const result = ValidationFormatter.format(false, errors);
      
      expect(result).toContain('Validation: ✗ Failed');
      expect(result).toContain('Validation Errors:');
      expect(result).toContain('  - Invalid position');
      expect(result).toContain('  - Asset not found');
    });

    it('should format validation with warnings', () => {
      const warnings = ['Actor placed outside visible area', 'Performance impact detected'];
      const result = ValidationFormatter.format(true, undefined, warnings);
      
      expect(result).toContain('Validation: ✓ Passed');
      expect(result).toContain('Validation Warnings:');
      expect(result).toContain('  - Actor placed outside visible area');
      expect(result).toContain('  - Performance impact detected');
    });

    it('should format validation with both errors and warnings', () => {
      const errors = ['Critical error'];
      const warnings = ['Minor warning'];
      const result = ValidationFormatter.format(false, errors, warnings);
      
      expect(result).toContain('Validation: ✗ Failed');
      expect(result).toContain('Validation Errors:');
      expect(result).toContain('  - Critical error');
      expect(result).toContain('Validation Warnings:');
      expect(result).toContain('  - Minor warning');
    });

    it('should handle empty errors array', () => {
      const result = ValidationFormatter.format(true, []);
      
      expect(result).toBe('\nValidation: ✓ Passed');
      expect(result).not.toContain('Validation Errors:');
    });

    it('should handle empty warnings array', () => {
      const result = ValidationFormatter.format(true, undefined, []);
      
      expect(result).toBe('\nValidation: ✓ Passed');
      expect(result).not.toContain('Validation Warnings:');
    });

    it('should handle null/undefined arrays gracefully', () => {
      const result = ValidationFormatter.format(true, null as any, null as any);
      
      expect(result).toBe('\nValidation: ✓ Passed');
    });

    it('should handle non-array errors gracefully', () => {
      const result = ValidationFormatter.format(false, 'not an array' as any);
      
      expect(result).toBe('\nValidation: ✗ Failed');
      expect(result).not.toContain('Validation Errors:');
    });
  });

  describe('appendToText', () => {
    it('should return original text when validation is undefined', () => {
      const originalText = '✓ Operation completed';
      const result = ValidationFormatter.appendToText(originalText, {});
      
      expect(result).toBe(originalText);
    });

    it('should append validation results to text', () => {
      const originalText = '✓ Actor spawned successfully';
      const validationResult = {
        validated: true,
        validation_errors: [],
        validation_warnings: []
      };
      
      const result = ValidationFormatter.appendToText(originalText, validationResult);
      
      expect(result).toBe('✓ Actor spawned successfully\nValidation: ✓ Passed');
    });

    it('should append validation with errors to text', () => {
      const originalText = '✗ Actor spawn failed';
      const validationResult = {
        validated: false,
        validation_errors: ['Invalid asset path', 'Position out of bounds'],
        validation_warnings: undefined
      };
      
      const result = ValidationFormatter.appendToText(originalText, validationResult);
      
      expect(result).toContain('✗ Actor spawn failed');
      expect(result).toContain('Validation: ✗ Failed');
      expect(result).toContain('Validation Errors:');
      expect(result).toContain('  - Invalid asset path');
      expect(result).toContain('  - Position out of bounds');
    });

    it('should append validation with warnings to text', () => {
      const originalText = '✓ Actor modified';
      const validationResult = {
        validated: true,
        validation_errors: [],
        validation_warnings: ['Actor may be occluded']
      };
      
      const result = ValidationFormatter.appendToText(originalText, validationResult);
      
      expect(result).toContain('✓ Actor modified');
      expect(result).toContain('Validation: ✓ Passed');
      expect(result).toContain('Validation Warnings:');
      expect(result).toContain('  - Actor may be occluded');
    });

    it('should handle complex validation result object', () => {
      const originalText = '✓ Batch operation completed';
      const validationResult = {
        validated: false,
        validation_errors: ['Network timeout', 'Asset corruption'],
        validation_warnings: ['Slower than expected', 'High memory usage'],
        other_property: 'should be ignored'
      };
      
      const result = ValidationFormatter.appendToText(originalText, validationResult);
      
      expect(result).toContain('✓ Batch operation completed');
      expect(result).toContain('Validation: ✗ Failed');
      expect(result).toContain('Network timeout');
      expect(result).toContain('Asset corruption');
      expect(result).toContain('Slower than expected');
      expect(result).toContain('High memory usage');
    });

    it('should handle validation result with missing properties', () => {
      const originalText = '✓ Test completed';
      const validationResult = { validated: true };
      
      const result = ValidationFormatter.appendToText(originalText, validationResult);
      
      expect(result).toBe('✓ Test completed\nValidation: ✓ Passed');
    });
  });

  describe('integration with real validation scenarios', () => {
    it('should format typical actor spawn validation', () => {
      const baseText = '✓ Spawned actor: TestWall_01\n  Asset: /Game/Walls/SM_Wall\n  Location: [100, 200, 0]\n  Rotation: [0, 0, 90]';
      const validationData = {
        validated: true,
        validation_errors: [],
        validation_warnings: ['Actor placed near level boundary']
      };
      
      const result = ValidationFormatter.appendToText(baseText, validationData);
      
      expect(result).toContain('Spawned actor: TestWall_01');
      expect(result).toContain('Location: [100, 200, 0]');
      expect(result).toContain('Validation: ✓ Passed');
      expect(result).toContain('Actor placed near level boundary');
    });

    it('should format typical actor modification failure', () => {
      const baseText = '✗ Failed to modify actor: TestWall_01';
      const validationData = {
        validated: false,
        validation_errors: ['Actor is locked', 'Invalid mesh reference'],
        validation_warnings: []
      };
      
      const result = ValidationFormatter.appendToText(baseText, validationData);
      
      expect(result).toContain('Failed to modify actor');
      expect(result).toContain('Validation: ✗ Failed');
      expect(result).toContain('Actor is locked');
      expect(result).toContain('Invalid mesh reference');
    });
  });
});