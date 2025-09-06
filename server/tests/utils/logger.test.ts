import { logger, LogContext } from '../../src/utils/logger.js';

// Need to set DEBUG before importing logger due to module-level initialization
const originalDebug = process.env.DEBUG;

describe('Logger', () => {
  let originalConsoleError: typeof console.error;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    originalConsoleError = console.error;
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    process.env.DEBUG = originalDebug;
    jest.restoreAllMocks();
  });

  describe('debug', () => {
    it('should call debug method without throwing errors', () => {
      // Since DEBUG is evaluated at module load time, we can't easily test the conditional logic
      // But we can test that the method exists and doesn't throw
      expect(() => {
        logger.debug('Test debug message');
      }).not.toThrow();
    });

    it('should handle context parameter in debug calls', () => {
      const context: LogContext = { userId: 123, action: 'test' };
      
      expect(() => {
        logger.debug('Test with context', context);
      }).not.toThrow();
    });
  });

  describe('info', () => {
    it('should always log info messages', () => {
      logger.info('Test info message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] uemcp INFO: Test info message/)
      );
    });

    it('should include context in info messages', () => {
      const context: LogContext = { tool: 'actor_spawn' };
      
      logger.info('Tool executed', context);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('{"tool":"actor_spawn"}')
      );
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      logger.warn('Test warning');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] uemcp WARN: Test warning/)
      );
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      logger.error('Test error');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] uemcp ERROR: Test error/)
      );
    });
  });

  describe('special message formatting', () => {
    it('should not add timestamp formatting to banner messages', () => {
      logger.info('===========================');
      
      expect(consoleSpy).toHaveBeenCalledWith('===========================');
    });

    it('should not add timestamp formatting to success messages with checkmarks', () => {
      logger.info('✓ Operation successful');
      
      expect(consoleSpy).toHaveBeenCalledWith('✓ Operation successful');
    });

    it('should not add timestamp formatting to error messages with X marks', () => {
      logger.error('✗ Operation failed');
      
      expect(consoleSpy).toHaveBeenCalledWith('✗ Operation failed');
    });

    it('should not add timestamp formatting to separator lines', () => {
      logger.info('---');
      
      expect(consoleSpy).toHaveBeenCalledWith('---');
    });
  });

  describe('namespace', () => {
    it('should include namespace in formatted messages', () => {
      logger.info('Test message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('uemcp INFO:')
      );
    });
  });
});