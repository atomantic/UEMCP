import { formatFileSize } from '../../../src/utils/file-utils.js';

describe('file-utils', () => {
  describe('formatFileSize', () => {
    it('should format zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('should format bytes under 1KB', () => {
      expect(formatFileSize(512)).toBe('512 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
      expect(formatFileSize(1048575)).toBe('1024 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
      expect(formatFileSize(2097152)).toBe('2 MB');
      expect(formatFileSize(1073741823)).toBe('1024 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(1610612736)).toBe('1.5 GB');
      expect(formatFileSize(2147483648)).toBe('2 GB');
      expect(formatFileSize(5368709120)).toBe('5 GB');
    });

    it('should handle decimal precision correctly', () => {
      expect(formatFileSize(1234)).toBe('1.21 KB');
      expect(formatFileSize(1234567)).toBe('1.18 MB');
      expect(formatFileSize(1234567890)).toBe('1.15 GB');
    });

    it('should handle edge cases', () => {
      expect(formatFileSize(1)).toBe('1 Bytes');
      expect(formatFileSize(1025)).toBe('1 KB');
      expect(formatFileSize(1048577)).toBe('1 MB');
    });

    it('should handle very small decimal values', () => {
      // Values that would result in 0.00 should be rounded up
      expect(formatFileSize(1100)).toBe('1.07 KB');
      expect(formatFileSize(1048576)).toBe('1 MB'); // Exact 1 MB
    });

    it('should handle large file sizes', () => {
      expect(formatFileSize(10737418240)).toBe('10 GB');
      expect(formatFileSize(107374182400)).toBe('100 GB');
      expect(formatFileSize(1073741824000)).toBe('1000 GB');
    });

    it('should maintain consistent formatting', () => {
      // Test that we get consistent decimal places
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1638400)).toBe('1.56 MB');
      expect(formatFileSize(1677721600)).toBe('1.56 GB');
    });
  });

  describe('real-world file size examples', () => {
    it('should format typical image file sizes', () => {
      expect(formatFileSize(85432)).toBe('83.43 KB');  // Compressed screenshot
      expect(formatFileSize(2847392)).toBe('2.72 MB'); // High-quality screenshot
    });

    it('should format typical document sizes', () => {
      expect(formatFileSize(4096)).toBe('4 KB');       // Small text file
      expect(formatFileSize(1048576)).toBe('1 MB');    // Medium document
    });

    it('should format typical asset sizes', () => {
      expect(formatFileSize(524288)).toBe('512 KB');   // Texture
      expect(formatFileSize(10485760)).toBe('10 MB');  // 3D model
      expect(formatFileSize(104857600)).toBe('100 MB'); // Large asset pack
    });
  });
});