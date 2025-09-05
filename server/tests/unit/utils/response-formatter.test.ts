import { ResponseFormatter } from '../../../src/utils/response-formatter.js';

describe('ResponseFormatter Business Logic', () => {
  describe('success', () => {
    it('should create success response with text content', () => {
      const result = ResponseFormatter.success('Test message');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Test message'
          }
        ]
      });
    });

    it('should handle empty text', () => {
      const result = ResponseFormatter.success('');

      expect(result.content[0].text).toBe('');
    });

    it('should handle multiline text', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = ResponseFormatter.success(text);

      expect(result.content[0].text).toBe(text);
    });

    it('should handle special characters', () => {
      const text = 'Special chars: áéíóú ñ ¿¡ €';
      const result = ResponseFormatter.success(text);

      expect(result.content[0].text).toBe(text);
    });
  });

  describe('error', () => {
    it('should throw Error instance with string input', () => {
      expect(() => ResponseFormatter.error('Test error')).toThrow('Test error');
    });

    it('should throw Error instance with Error object input', () => {
      const originalError = new Error('Original error message');
      
      expect(() => ResponseFormatter.error(originalError)).toThrow('Original error message');
    });

    it('should handle TypeError', () => {
      const typeError = new TypeError('Type error message');
      
      expect(() => ResponseFormatter.error(typeError)).toThrow('Type error message');
    });

    it('should handle ReferenceError', () => {
      const refError = new ReferenceError('Reference error message');
      
      expect(() => ResponseFormatter.error(refError)).toThrow('Reference error message');
    });

    it('should handle custom Error subclass', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const customError = new CustomError('Custom error message');
      
      expect(() => ResponseFormatter.error(customError)).toThrow('Custom error message');
    });

    it('should return never type', () => {
      // This test ensures the method signature is correct
      const testFunction = (): string => {
        ResponseFormatter.error('Test');
        // TypeScript should know this line is unreachable
        return 'unreachable';
      };

      expect(() => testFunction()).toThrow('Test');
    });
  });

  describe('withValidation', () => {
    it('should concatenate base text and validation text', () => {
      const result = ResponseFormatter.withValidation('Base: ', 'Validation passed');

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Base: Validation passed'
          }
        ]
      });
    });

    it('should handle empty validation text', () => {
      const result = ResponseFormatter.withValidation('Base text', '');

      expect(result.content[0].text).toBe('Base text');
    });

    it('should handle empty base text', () => {
      const result = ResponseFormatter.withValidation('', 'Validation only');

      expect(result.content[0].text).toBe('Validation only');
    });

    it('should handle multiline validation text', () => {
      const baseText = 'Operation completed.\n';
      const validationText = 'Validation:\n- Check 1: PASS\n- Check 2: PASS';
      const result = ResponseFormatter.withValidation(baseText, validationText);

      expect(result.content[0].text).toBe(baseText + validationText);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Test error message');
      const result = ResponseFormatter.getErrorMessage(error);

      expect(result).toBe('Test error message');
    });

    it('should convert string to string', () => {
      const result = ResponseFormatter.getErrorMessage('String error');

      expect(result).toBe('String error');
    });

    it('should convert number to string', () => {
      const result = ResponseFormatter.getErrorMessage(404);

      expect(result).toBe('404');
    });

    it('should convert boolean to string', () => {
      const result = ResponseFormatter.getErrorMessage(true);

      expect(result).toBe('true');
    });

    it('should convert object to string', () => {
      const obj = { code: 500, message: 'Server error' };
      const result = ResponseFormatter.getErrorMessage(obj);

      expect(result).toBe('[object Object]');
    });

    it('should convert null to string', () => {
      const result = ResponseFormatter.getErrorMessage(null);

      expect(result).toBe('null');
    });

    it('should convert undefined to string', () => {
      const result = ResponseFormatter.getErrorMessage(undefined);

      expect(result).toBe('undefined');
    });

    it('should add prefix when provided', () => {
      const error = new Error('Connection failed');
      const result = ResponseFormatter.getErrorMessage(error, 'Database');

      expect(result).toBe('Database: Connection failed');
    });

    it('should add prefix to string error', () => {
      const result = ResponseFormatter.getErrorMessage('Not found', 'Asset');

      expect(result).toBe('Asset: Not found');
    });

    it('should handle empty error message with prefix', () => {
      const error = new Error('');
      const result = ResponseFormatter.getErrorMessage(error, 'System');

      expect(result).toBe('System: ');
    });

    it('should handle TypeError with prefix', () => {
      const error = new TypeError('Invalid argument type');
      const result = ResponseFormatter.getErrorMessage(error, 'Validation');

      expect(result).toBe('Validation: Invalid argument type');
    });
  });

  describe('edge cases', () => {
    it('should handle extremely long text', () => {
      const longText = 'A'.repeat(10000);
      const result = ResponseFormatter.success(longText);

      expect(result.content[0].text).toBe(longText);
      expect(result.content[0].text?.length).toBe(10000);
    });

    it('should handle text with null characters', () => {
      const textWithNull = 'Before\x00After';
      const result = ResponseFormatter.success(textWithNull);

      expect(result.content[0].text).toBe(textWithNull);
    });

    it('should handle text with control characters', () => {
      const textWithControls = 'Tab\tNewline\nCarriage\rReturn';
      const result = ResponseFormatter.success(textWithControls);

      expect(result.content[0].text).toBe(textWithControls);
    });

    it('should maintain object structure immutability', () => {
      const result1 = ResponseFormatter.success('Test 1');
      const result2 = ResponseFormatter.success('Test 2');

      expect(result1.content[0].text).toBe('Test 1');
      expect(result2.content[0].text).toBe('Test 2');
      
      // Ensure objects are independent
      result1.content[0].text = 'Modified';
      expect(result2.content[0].text).toBe('Test 2');
    });
  });
});