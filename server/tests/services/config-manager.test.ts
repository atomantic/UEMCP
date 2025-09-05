import { ConfigManager } from '../../src/services/config-manager.js';

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock os module for consistent testing
jest.mock('os', () => ({
  platform: jest.fn(() => 'darwin'),
  release: jest.fn(() => '21.6.0'),
  arch: jest.fn(() => 'x64'),
  totalmem: jest.fn(() => 17179869184),
  freemem: jest.fn(() => 8589934592),
}));

describe('ConfigManager', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let configManager: ConfigManager;
  let mockLogger: any;

  beforeEach(() => {
    // Store original env
    originalEnv = { ...process.env };
    
    // Clear all mocks
    jest.clearAllMocks();
    mockLogger = require('../../src/utils/logger.js').logger;
    
    // Reset environment
    delete process.env.UE_PROJECT_PATH;
    delete process.env.UEMCP_LISTENER_PORT;
    delete process.env.DEBUG;
    
    configManager = new ConfigManager();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const config = configManager.getConfig();
      
      expect(config.version).toBe('0.2.0');
      expect(config.name).toBe('uemcp');
      expect(config.listenerPort).toBe('8765'); // default
      expect(config.processId).toBe(process.pid);
      expect(config.workingDirectory).toBe(process.cwd());
      expect(config.nodeVersion).toBe(process.version);
    });

    it('should initialize with custom version and name', () => {
      const customConfig = new ConfigManager('1.0.0', 'custom-server');
      const config = customConfig.getConfig();
      
      expect(config.version).toBe('1.0.0');
      expect(config.name).toBe('custom-server');
    });

    it('should load environment variables', () => {
      process.env.UE_PROJECT_PATH = '/path/to/project';
      process.env.UEMCP_LISTENER_PORT = '9000';
      process.env.DEBUG = 'true';
      
      const envConfig = new ConfigManager();
      const config = envConfig.getConfig();
      
      expect(config.ueProjectPath).toBe('/path/to/project');
      expect(config.listenerPort).toBe('9000');
      expect(config.debugMode).toBe('true');
    });
  });

  describe('configuration getters', () => {
    it('should get server name', () => {
      expect(configManager.getServerName()).toBe('uemcp');
    });

    it('should get server version', () => {
      expect(configManager.getServerVersion()).toBe('0.2.0');
    });

    it('should get UE project path', () => {
      expect(configManager.getUEProjectPath()).toBeUndefined();
      
      process.env.UE_PROJECT_PATH = '/test/path';
      const envConfig = new ConfigManager();
      expect(envConfig.getUEProjectPath()).toBe('/test/path');
    });

    it('should get listener port', () => {
      expect(configManager.getListenerPort()).toBe('8765');
      
      process.env.UEMCP_LISTENER_PORT = '9001';
      const envConfig = new ConfigManager();
      expect(envConfig.getListenerPort()).toBe('9001');
    });

    it('should check debug mode', () => {
      expect(configManager.isDebugMode()).toBe(false);
      
      process.env.DEBUG = 'true';
      const debugConfig = new ConfigManager();
      expect(debugConfig.isDebugMode()).toBe(true);
    });

    it('should get debug mode value', () => {
      expect(configManager.getDebugMode()).toBeUndefined();
      
      process.env.DEBUG = 'uemcp:*';
      const debugConfig = new ConfigManager();
      expect(debugConfig.getDebugMode()).toBe('uemcp:*');
    });
  });

  describe('logging', () => {
    it('should log startup banner', () => {
      configManager.logStartupBanner();
      
      expect(mockLogger.info).toHaveBeenCalledWith('='.repeat(60));
      expect(mockLogger.info).toHaveBeenCalledWith('UEMCP Server Starting...');
      expect(mockLogger.info).toHaveBeenCalledWith(`Version: 0.2.0`);
      expect(mockLogger.info).toHaveBeenCalledWith(`Node.js: ${process.version}`);
      expect(mockLogger.info).toHaveBeenCalledWith(`Process ID: ${process.pid}`);
    });

    it('should log configuration with UE project path', () => {
      process.env.UE_PROJECT_PATH = '/test/project';
      const envConfig = new ConfigManager();
      
      envConfig.logConfiguration();
      
      expect(mockLogger.info).toHaveBeenCalledWith('UE Project Path: /test/project');
      expect(mockLogger.info).toHaveBeenCalledWith('Python Listener Port: 8765');
    });

    it('should warn when UE project path is not set', () => {
      configManager.logConfiguration();
      
      expect(mockLogger.warn).toHaveBeenCalledWith('UE_PROJECT_PATH not set - some features may be limited');
    });

    it('should log debug mode when enabled', () => {
      process.env.DEBUG = 'uemcp:*';
      const debugConfig = new ConfigManager();
      
      debugConfig.logConfiguration();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Debug Mode: uemcp:*');
    });
  });

  describe('validation', () => {
    it('should validate valid configuration', () => {
      const validation = configManager.validateConfiguration();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid port numbers', () => {
      process.env.UEMCP_LISTENER_PORT = 'invalid';
      const invalidConfig = new ConfigManager();
      
      const validation = invalidConfig.validateConfiguration();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid listener port: invalid');
    });

    it('should detect out-of-range ports', () => {
      const testCases = ['-1', '0', '65536', '99999'];
      
      for (const port of testCases) {
        process.env.UEMCP_LISTENER_PORT = port;
        const invalidConfig = new ConfigManager();
        const validation = invalidConfig.validateConfiguration();
        
        expect(validation.valid).toBe(false);
        expect(validation.errors).toContain(`Invalid listener port: ${port}`);
      }
    });

    it('should accept valid ports', () => {
      const validPorts = ['1', '8765', '65535'];
      
      for (const port of validPorts) {
        process.env.UEMCP_LISTENER_PORT = port;
        const validConfig = new ConfigManager();
        const validation = validConfig.validateConfiguration();
        
        expect(validation.valid).toBe(true);
      }
    });

    it('should validate Node.js version', () => {
      // Mock process.version for testing
      const originalVersion = process.version;
      
      // Test old Node version
      Object.defineProperty(process, 'version', { value: 'v16.0.0', configurable: true });
      const validation = configManager.validateConfiguration();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Node.js 18+ required, current: v16.0.0');
      
      // Restore original version
      Object.defineProperty(process, 'version', { value: originalVersion, configurable: true });
    });
  });

  describe('configuration updates', () => {
    it('should update configuration values', () => {
      configManager.updateConfig('listenerPort', '9999');
      expect(configManager.getListenerPort()).toBe('9999');
      expect(mockLogger.info).toHaveBeenCalledWith('Configuration updated: listenerPort = 9999');
    });

    it('should update version', () => {
      configManager.updateConfig('version', '2.0.0');
      expect(configManager.getServerVersion()).toBe('2.0.0');
    });
  });

  describe('utility methods', () => {
    it('should check if UE project path is configured', () => {
      expect(configManager.hasUEProjectPath()).toBe(false);
      
      process.env.UE_PROJECT_PATH = '/test/path';
      const envConfig = new ConfigManager();
      expect(envConfig.hasUEProjectPath()).toBe(true);
    });

    it('should get environment summary', () => {
      const summary = configManager.getEnvironmentSummary();
      
      expect(summary).toContain('UEMCP Server 0.2.0');
      expect(summary).toContain(`Node.js ${process.version}`);
      expect(summary).toContain('darwin 21.6.0');
      expect(summary).toContain(`PID: ${process.pid}`);
      expect(summary).toContain('Port: 8765');
    });

    it('should get system information', () => {
      const sysInfo = configManager.getSystemInfo();
      
      expect(sysInfo.nodeVersion).toBe(process.version);
      expect(sysInfo.platform).toBe('darwin');
      expect(sysInfo.osRelease).toBe('21.6.0');
      expect(sysInfo.processId).toBe(process.pid);
      expect(sysInfo.workingDirectory).toBe(process.cwd());
      expect(sysInfo.arch).toBe('x64');
      expect(sysInfo.totalMemory).toBe(17179869184);
      expect(sysInfo.freeMemory).toBe(8589934592);
    });
  });

  describe('edge cases', () => {
    it('should handle missing environment variables gracefully', () => {
      // Clear all env vars
      delete process.env.UE_PROJECT_PATH;
      delete process.env.UEMCP_LISTENER_PORT;
      delete process.env.DEBUG;
      
      const config = new ConfigManager();
      const configData = config.getConfig();
      
      expect(configData.ueProjectPath).toBeUndefined();
      expect(configData.listenerPort).toBe('8765'); // default
      expect(configData.debugMode).toBeUndefined();
    });

    it('should handle empty environment variables', () => {
      process.env.UE_PROJECT_PATH = '';
      process.env.UEMCP_LISTENER_PORT = '';
      process.env.DEBUG = '';
      
      const config = new ConfigManager();
      const configData = config.getConfig();
      
      expect(configData.ueProjectPath).toBe('');
      expect(configData.listenerPort).toBe('8765'); // falls back to default
      expect(configData.debugMode).toBe('');
    });

    it('should handle configuration with special characters', () => {
      process.env.UE_PROJECT_PATH = '/path/with spaces/and-special!chars@#$';
      process.env.DEBUG = 'uemcp:*,other:verbose';
      
      const config = new ConfigManager();
      const configData = config.getConfig();
      
      expect(configData.ueProjectPath).toBe('/path/with spaces/and-special!chars@#$');
      expect(configData.debugMode).toBe('uemcp:*,other:verbose');
    });

    it('should validate configuration with extreme values', () => {
      // Test edge case port values
      process.env.UEMCP_LISTENER_PORT = '1';
      const minConfig = new ConfigManager();
      expect(minConfig.validateConfiguration().valid).toBe(true);
      
      process.env.UEMCP_LISTENER_PORT = '65535';
      const maxConfig = new ConfigManager();
      expect(maxConfig.validateConfiguration().valid).toBe(true);
    });
  });
});