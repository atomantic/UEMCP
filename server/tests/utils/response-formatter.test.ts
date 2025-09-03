import { ResponseFormatter, ToolResponse } from '../../src/utils/response-formatter.js';

describe('ResponseFormatter', () => {
  describe('success', () => {
    it('should create a success response with text content', () => {
      const result = ResponseFormatter.success('Operation completed successfully');
      
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Operation completed successfully',
          }
        ]
      });
    });

    it('should handle empty string', () => {
      const result = ResponseFormatter.success('');
      
      expect(result.content[0].text).toBe('');
      expect(result.content[0].type).toBe('text');
    });

    it('should handle multiline text', () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      const result = ResponseFormatter.success(multilineText);
      
      expect(result.content[0].text).toBe(multilineText);
    });
  });

  describe('error', () => {
    it('should throw error with string message', () => {
      expect(() => {
        ResponseFormatter.error('Something went wrong');
      }).toThrow('Something went wrong');
    });

    it('should throw error with Error object message', () => {
      const error = new Error('Test error');
      
      expect(() => {
        ResponseFormatter.error(error);
      }).toThrow('Test error');
    });

    it('should handle error with complex message', () => {
      const complexError = new Error('Failed to connect to server: ECONNREFUSED');
      
      expect(() => {
        ResponseFormatter.error(complexError);
      }).toThrow('Failed to connect to server: ECONNREFUSED');
    });
  });

  describe('withValidation', () => {
    it('should combine base text with validation text', () => {
      const baseText = '✓ Actor spawned successfully';
      const validationText = '\nValidation: ✓ Passed';
      
      const result = ResponseFormatter.withValidation(baseText, validationText);
      
      expect(result.content[0].text).toBe(baseText + validationText);
    });

    it('should handle empty validation text', () => {
      const baseText = '✓ Operation completed';
      const result = ResponseFormatter.withValidation(baseText, '');
      
      expect(result.content[0].text).toBe(baseText);
    });

    it('should handle validation with errors and warnings', () => {
      const baseText = '✓ Actor modified';
      const validationText = '\nValidation: ✗ Failed\nErrors:\n  - Invalid position';
      
      const result = ResponseFormatter.withValidation(baseText, validationText);
      
      expect(result.content[0].text).toContain('✓ Actor modified');
      expect(result.content[0].text).toContain('Validation: ✗ Failed');
      expect(result.content[0].text).toContain('Invalid position');
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Connection timeout');
      const message = ResponseFormatter.getErrorMessage(error);
      
      expect(message).toBe('Connection timeout');
    });

    it('should convert string to message', () => {
      const message = ResponseFormatter.getErrorMessage('Simple error');
      
      expect(message).toBe('Simple error');
    });

    it('should convert number to string message', () => {
      const message = ResponseFormatter.getErrorMessage(404);
      
      expect(message).toBe('404');
    });

    it('should convert null/undefined to string', () => {
      expect(ResponseFormatter.getErrorMessage(null)).toBe('null');
      expect(ResponseFormatter.getErrorMessage(undefined)).toBe('undefined');
    });

    it('should add prefix when provided', () => {
      const error = new Error('File not found');
      const message = ResponseFormatter.getErrorMessage(error, 'Asset loading failed');
      
      expect(message).toBe('Asset loading failed: File not found');
    });

    it('should add prefix to string errors', () => {
      const message = ResponseFormatter.getErrorMessage('Invalid parameter', 'Validation error');
      
      expect(message).toBe('Validation error: Invalid parameter');
    });

    it('should handle complex error objects', () => {
      const complexError = {
        name: 'ValidationError',
        message: 'Invalid input data',
        code: 'INVALID_INPUT'
      };
      
      const message = ResponseFormatter.getErrorMessage(complexError);
      
      expect(message).toBe('[object Object]');
    });
  });

  describe('ToolResponse interface', () => {
    it('should accept ToolResponse with data property', () => {
      const response: ToolResponse = {
        content: [
          {
            type: 'text',
            text: 'Success',
            data: { actorCount: 5, duration: 120 }
          }
        ]
      };
      
      expect(response.content[0].data).toEqual({ actorCount: 5, duration: 120 });
    });

    it('should accept ToolResponse with multiple content items', () => {
      const response: ToolResponse = {
        content: [
          { type: 'text', text: 'Header' },
          { type: 'data', data: [1, 2, 3] },
          { type: 'text', text: 'Footer' }
        ]
      };
      
      expect(response.content).toHaveLength(3);
      expect(response.content[1].data).toEqual([1, 2, 3]);
    });
  });
});