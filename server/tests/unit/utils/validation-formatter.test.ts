import { ValidationFormatter } from '../../../src/utils/validation-formatter.js';

describe('ValidationFormatter Business Logic', () => {
  describe('format', () => {
    it('should return empty string when validated is undefined', () => {
      const result = ValidationFormatter.format(undefined);
      expect(result).toBe('');
    });

    it('should format passing validation', () => {
      const result = ValidationFormatter.format(true);
      expect(result).toBe('\nValidation: ✓ Passed');
    });

    it('should format failing validation', () => {
      const result = ValidationFormatter.format(false);
      expect(result).toBe('\nValidation: ✗ Failed');
    });

    it('should format passing validation with empty errors array', () => {
      const result = ValidationFormatter.format(true, []);
      expect(result).toBe('\nValidation: ✓ Passed');
    });

    it('should format passing validation with empty warnings array', () => {
      const result = ValidationFormatter.format(true, undefined, []);
      expect(result).toBe('\nValidation: ✓ Passed');
    });

    it('should format failing validation with single error', () => {
      const result = ValidationFormatter.format(false, ['Asset not found']);
      const expected = '\nValidation: ✗ Failed\nValidation Errors:\n  - Asset not found';
      expect(result).toBe(expected);
    });

    it('should format failing validation with multiple errors', () => {
      const errors = ['Asset not found', 'Invalid location coordinates'];
      const result = ValidationFormatter.format(false, errors);
      const expected = '\nValidation: ✗ Failed\nValidation Errors:\n  - Asset not found\n  - Invalid location coordinates';
      expect(result).toBe(expected);
    });

    it('should format passing validation with single warning', () => {
      const result = ValidationFormatter.format(true, undefined, ['Actor placed outside level bounds']);
      const expected = '\nValidation: ✓ Passed\nValidation Warnings:\n  - Actor placed outside level bounds';
      expect(result).toBe(expected);
    });

    it('should format passing validation with multiple warnings', () => {
      const warnings = ['Actor placed outside level bounds', 'Asset has no collision'];
      const result = ValidationFormatter.format(true, undefined, warnings);
      const expected = '\nValidation: ✓ Passed\nValidation Warnings:\n  - Actor placed outside level bounds\n  - Asset has no collision';
      expect(result).toBe(expected);
    });

    it('should format failing validation with both errors and warnings', () => {
      const errors = ['Asset not found'];
      const warnings = ['Location might cause overlap'];
      const result = ValidationFormatter.format(false, errors, warnings);
      const expected = '\nValidation: ✗ Failed\nValidation Errors:\n  - Asset not found\nValidation Warnings:\n  - Location might cause overlap';
      expect(result).toBe(expected);
    });

    it('should handle non-array errors gracefully', () => {
      const result = ValidationFormatter.format(false, 'not an array' as any);
      expect(result).toBe('\nValidation: ✗ Failed');
    });

    it('should handle non-array warnings gracefully', () => {
      const result = ValidationFormatter.format(true, undefined, 'not an array' as any);
      expect(result).toBe('\nValidation: ✓ Passed');
    });

    it('should handle null errors array', () => {
      const result = ValidationFormatter.format(false, null as any);
      expect(result).toBe('\nValidation: ✗ Failed');
    });

    it('should handle null warnings array', () => {
      const result = ValidationFormatter.format(true, undefined, null as any);
      expect(result).toBe('\nValidation: ✓ Passed');
    });

    it('should handle empty string errors', () => {
      const errors = ['', 'Valid error', ''];
      const result = ValidationFormatter.format(false, errors);
      const expected = '\nValidation: ✗ Failed\nValidation Errors:\n  - \n  - Valid error\n  - ';
      expect(result).toBe(expected);
    });

    it('should handle empty string warnings', () => {
      const warnings = ['', 'Valid warning'];
      const result = ValidationFormatter.format(true, undefined, warnings);
      const expected = '\nValidation: ✓ Passed\nValidation Warnings:\n  - \n  - Valid warning';
      expect(result).toBe(expected);
    });

    it('should handle special characters in errors', () => {
      const errors = ['Error with "quotes"', 'Error with \n newline', 'Error with \t tab'];
      const result = ValidationFormatter.format(false, errors);
      
      expect(result).toContain('Error with "quotes"');
      expect(result).toContain('Error with \n newline');
      expect(result).toContain('Error with \t tab');
    });

    it('should handle special characters in warnings', () => {
      const warnings = ['Warning with áccénts', 'Warning with 中文'];
      const result = ValidationFormatter.format(true, undefined, warnings);
      
      expect(result).toContain('Warning with áccénts');
      expect(result).toContain('Warning with 中文');
    });
  });

  describe('appendToText', () => {
    it('should return original text when validated is undefined', () => {
      const originalText = 'Original text';
      const result = ValidationFormatter.appendToText(originalText, {});
      expect(result).toBe(originalText);
    });

    it('should append validation to text when validated is true', () => {
      const originalText = 'Actor spawned successfully';
      const validationData = { validated: true };
      const result = ValidationFormatter.appendToText(originalText, validationData);
      expect(result).toBe('Actor spawned successfully\nValidation: ✓ Passed');
    });

    it('should append validation to text when validated is false', () => {
      const originalText = 'Operation completed';
      const validationData = { validated: false };
      const result = ValidationFormatter.appendToText(originalText, validationData);
      expect(result).toBe('Operation completed\nValidation: ✗ Failed');
    });

    it('should append validation with errors', () => {
      const originalText = 'Operation attempted';
      const validationData = {
        validated: false,
        validation_errors: ['Asset not found', 'Invalid parameters']
      };
      const result = ValidationFormatter.appendToText(originalText, validationData);
      const expected = 'Operation attempted\nValidation: ✗ Failed\nValidation Errors:\n  - Asset not found\n  - Invalid parameters';
      expect(result).toBe(expected);
    });

    it('should append validation with warnings', () => {
      const originalText = 'Actor spawned';
      const validationData = {
        validated: true,
        validation_warnings: ['Location might cause overlap']
      };
      const result = ValidationFormatter.appendToText(originalText, validationData);
      const expected = 'Actor spawned\nValidation: ✓ Passed\nValidation Warnings:\n  - Location might cause overlap';
      expect(result).toBe(expected);
    });

    it('should append validation with both errors and warnings', () => {
      const originalText = 'Operation completed';
      const validationData = {
        validated: false,
        validation_errors: ['Critical error'],
        validation_warnings: ['Minor warning']
      };
      const result = ValidationFormatter.appendToText(originalText, validationData);
      const expected = 'Operation completed\nValidation: ✗ Failed\nValidation Errors:\n  - Critical error\nValidation Warnings:\n  - Minor warning';
      expect(result).toBe(expected);
    });

    it('should handle empty original text', () => {
      const validationData = { validated: true };
      const result = ValidationFormatter.appendToText('', validationData);
      expect(result).toBe('\nValidation: ✓ Passed');
    });

    it('should handle multiline original text', () => {
      const originalText = 'Line 1\nLine 2\nLine 3';
      const validationData = { validated: true };
      const result = ValidationFormatter.appendToText(originalText, validationData);
      expect(result).toBe('Line 1\nLine 2\nLine 3\nValidation: ✓ Passed');
    });

    it('should handle original text ending with newline', () => {
      const originalText = 'Text with newline\n';
      const validationData = { validated: true };
      const result = ValidationFormatter.appendToText(originalText, validationData);
      expect(result).toBe('Text with newline\n\nValidation: ✓ Passed');
    });

    it('should preserve original text exactly when no validation', () => {
      const originalText = 'Exact text with special chars: áéíóú!@#$%^&*()';
      const result = ValidationFormatter.appendToText(originalText, {});
      expect(result).toBe(originalText);
      expect(result).toBe(originalText); // Double check it's exactly the same
    });
  });

  describe('edge cases', () => {
    it('should handle extremely long error messages', () => {
      const longError = 'A'.repeat(1000);
      const result = ValidationFormatter.format(false, [longError]);
      
      expect(result).toContain('Validation: ✗ Failed');
      expect(result).toContain(longError);
    });

    it('should handle many errors', () => {
      const manyErrors = Array.from({ length: 100 }, (_, i) => `Error ${i}`);
      const result = ValidationFormatter.format(false, manyErrors);
      
      expect(result).toContain('Validation: ✗ Failed');
      expect(result).toContain('Error 0');
      expect(result).toContain('Error 99');
    });

    it('should handle many warnings', () => {
      const manyWarnings = Array.from({ length: 50 }, (_, i) => `Warning ${i}`);
      const result = ValidationFormatter.format(true, undefined, manyWarnings);
      
      expect(result).toContain('Validation: ✓ Passed');
      expect(result).toContain('Warning 0');
      expect(result).toContain('Warning 49');
    });

    it('should handle object with extra properties', () => {
      const validationData = {
        validated: true,
        validation_errors: ['Error'],
        validation_warnings: ['Warning'],
        extraProperty: 'should be ignored'
      };
      
      const result = ValidationFormatter.appendToText('Test', validationData);
      const expected = 'Test\nValidation: ✓ Passed\nValidation Errors:\n  - Error\nValidation Warnings:\n  - Warning';
      expect(result).toBe(expected);
    });
  });
});