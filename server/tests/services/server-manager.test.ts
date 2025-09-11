import { ServerManager, ServerOptions } from '../../src/services/server-manager.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock MCP SDK
const mockServer = {
  setRequestHandler: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn(() => mockServer),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(),
}));

// Mock process for testing shutdown handlers
const mockProcess = {
  on: jest.fn(),
  exit: jest.fn(),
};

// Mock schemas
jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema: 'list_tools',
  CallToolRequestSchema: 'call_tool',
}));

// Create mock tool registry
const mockToolRegistry = {
  getToolDefinitions: jest.fn(() => [
    {
      name: 'test_tool',
      description: 'Test tool',
      inputSchema: { type: 'object' },
    },
  ]),
  getTool: jest.fn(),
  getStats: jest.fn(() => ({
    total: 1,
    categories: { test: 1 } as Record<string, number>,
    mode: 'dynamic' as const,
  })),
  getToolCount: jest.fn(() => 1),
};

// Create mock config manager
const mockConfigManager = {
  getConfig: jest.fn(() => ({
    name: 'test-server',
    version: '1.0.0',
    processId: 12345,
  })),
  validateConfiguration: jest.fn(() => ({
    valid: true,
    errors: [] as string[],
  })),
};

describe('ServerManager', () => {
  let serverManager: ServerManager;
  let originalProcess: typeof process;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = require('../../src/utils/logger.js').logger;
    
    // Reset mock server behavior
    mockServer.connect.mockResolvedValue(undefined);
    mockServer.close.mockResolvedValue(undefined);
    
    // Reset mock tool registry to default values
    mockToolRegistry.getStats.mockReturnValue({
      total: 1,
      categories: { test: 1 } as Record<string, number>,
      mode: 'dynamic' as const,
    });
    mockToolRegistry.getToolCount.mockReturnValue(1);
    
    // Reset mock config manager to default values
    mockConfigManager.validateConfiguration.mockReturnValue({
      valid: true,
      errors: [] as string[],
    });
    
    // Store and mock process
    originalProcess = global.process;
    global.process = mockProcess as any;
    
    serverManager = new ServerManager(
      mockToolRegistry as any,
      mockConfigManager as any
    );
  });

  afterEach(() => {
    // Restore original process
    global.process = originalProcess;
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      expect(serverManager).toBeInstanceOf(ServerManager);
    });

    it('should initialize with custom options', () => {
      const options: ServerOptions = {
        name: 'custom-server',
        version: '2.0.0',
        capabilities: { tools: { custom: true } as any },
      };

      const customManager = new ServerManager(
        mockToolRegistry as any,
        mockConfigManager as any,
        options
      );

      expect(customManager).toBeInstanceOf(ServerManager);
    });
  });

  describe('server initialization', () => {
    it('should initialize server with default config', () => {
      serverManager.initializeServer();

      expect(Server).toHaveBeenCalledWith(
        { name: 'test-server', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      expect(mockLogger.info).toHaveBeenCalledWith('MCP server initialized');
    });

    it('should initialize server with custom options', () => {
      const options: ServerOptions = {
        name: 'custom-name',
        version: '2.0.0',
        capabilities: { tools: { custom: true } as any },
      };

      const customManager = new ServerManager(
        mockToolRegistry as any,
        mockConfigManager as any,
        options
      );

      customManager.initializeServer();

      expect(Server).toHaveBeenCalledWith(
        { name: 'custom-name', version: '2.0.0' },
        { capabilities: { tools: { custom: true } } }
      );
    });

    it('should warn if server is already initialized', () => {
      serverManager.initializeServer();
      serverManager.initializeServer();

      expect(mockLogger.warn).toHaveBeenCalledWith('Server already initialized');
    });

    it('should setup request handlers after initialization', () => {
      serverManager.initializeServer();

      expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith('list_tools', expect.any(Function));
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith('call_tool', expect.any(Function));
    });
  });

  describe('request handlers', () => {
    beforeEach(() => {
      serverManager.initializeServer();
    });

    it('should handle list_tools requests', () => {
      const listToolsHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'list_tools')[1];

      const result = listToolsHandler();

      expect(mockToolRegistry.getToolDefinitions).toHaveBeenCalled();
      expect(result).toEqual({
        tools: [
          {
            name: 'test_tool',
            description: 'Test tool',
            inputSchema: { type: 'object' },
          },
        ],
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Listed 1 available tools');
    });

    it('should handle call_tool requests successfully', async () => {
      const mockTool = {
        handler: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Success' }],
        }),
      };
      mockToolRegistry.getTool.mockReturnValue(mockTool);

      const callToolHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'call_tool')[1];

      const result = await callToolHandler({
        params: { name: 'test_tool', arguments: { param: 'value' } },
      });

      expect(mockToolRegistry.getTool).toHaveBeenCalledWith('test_tool');
      expect(mockTool.handler).toHaveBeenCalledWith({ param: 'value' });
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Success' }],
      });
    });

    it('should handle call_tool requests with unknown tool', async () => {
      mockToolRegistry.getTool.mockReturnValue(undefined);

      const callToolHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'call_tool')[1];

      await expect(
        callToolHandler({
          params: { name: 'unknown_tool', arguments: {} },
        })
      ).rejects.toThrow('Unknown tool: unknown_tool');

      expect(mockLogger.error).toHaveBeenCalledWith('Unknown tool: unknown_tool');
    });

    it('should handle call_tool requests with tool errors', async () => {
      const mockTool = {
        handler: jest.fn().mockRejectedValue(new Error('Tool failed')),
      };
      mockToolRegistry.getTool.mockReturnValue(mockTool);

      const callToolHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'call_tool')[1];

      await expect(
        callToolHandler({
          params: { name: 'test_tool', arguments: {} },
        })
      ).rejects.toThrow('Tool failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Tool test_tool failed',
        expect.objectContaining({ error: 'Tool failed' })
      );
    });

    it('should log tool execution timing', async () => {
      const mockTool = {
        handler: jest.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Result' }],
        }),
      };
      mockToolRegistry.getTool.mockReturnValue(mockTool);

      const callToolHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'call_tool')[1];

      await callToolHandler({
        params: { name: 'test_tool', arguments: {} },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tool called: test_tool',
        { arguments: {} }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tool test_tool completed successfully',
        expect.objectContaining({
          duration: expect.stringMatching(/\d+ms/),
          resultLength: 6,
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      const mockTool = {
        handler: jest.fn().mockRejectedValue('String error'),
      };
      mockToolRegistry.getTool.mockReturnValue(mockTool);

      const callToolHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'call_tool')[1];

      await expect(
        callToolHandler({
          params: { name: 'test_tool', arguments: {} },
        })
      ).rejects.toBe('String error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Tool test_tool failed',
        expect.objectContaining({ error: 'String error' })
      );
    });
  });

  describe('server lifecycle', () => {
    beforeEach(() => {
      serverManager.initializeServer();
    });

    it('should start server successfully', async () => {
      await serverManager.startServer();

      expect(StdioServerTransport).toHaveBeenCalled();
      expect(mockServer.connect).toHaveBeenCalled();
      expect(serverManager.isServerRunning()).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'UEMCP Server started successfully',
        expect.objectContaining({
          tools: 1,
          categories: 1,
          transport: 'stdio',
        })
      );
    });

    it('should log tool statistics on startup', async () => {
      mockToolRegistry.getStats.mockReturnValue({
        total: 5,
        categories: { actors: 2, viewport: 3 } as Record<string, number>,
        mode: 'dynamic' as const,
      });

      await serverManager.startServer();

      expect(mockLogger.info).toHaveBeenCalledWith('  actors: 2 tools');
      expect(mockLogger.info).toHaveBeenCalledWith('  viewport: 3 tools');
    });

    it('should throw if server not initialized before starting', async () => {
      const uninitializedManager = new ServerManager(
        mockToolRegistry as any,
        mockConfigManager as any
      );

      await expect(uninitializedManager.startServer()).rejects.toThrow(
        'Server not initialized. Call initializeServer() first.'
      );
    });

    it('should warn if server is already running', async () => {
      await serverManager.startServer();
      await serverManager.startServer();

      expect(mockLogger.warn).toHaveBeenCalledWith('Server is already running');
    });

    it('should handle server start errors', async () => {
      mockServer.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(serverManager.startServer()).rejects.toThrow('Connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to start server',
        { error: 'Connection failed' }
      );
      expect(serverManager.isServerRunning()).toBe(false);
    });

    it('should handle non-Error start exceptions', async () => {
      mockServer.connect.mockRejectedValue('Connection string error');

      await expect(serverManager.startServer()).rejects.toBe('Connection string error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to start server',
        { error: 'Connection string error' }
      );
    });

    it('should stop server gracefully', async () => {
      await serverManager.startServer();
      await serverManager.stopServer();

      expect(mockServer.close).toHaveBeenCalled();
      expect(serverManager.isServerRunning()).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('UEMCP Server stopped gracefully');
    });

    it('should warn if stopping server that is not running', async () => {
      await serverManager.stopServer();

      expect(mockLogger.warn).toHaveBeenCalledWith('Server is not running');
      expect(mockServer.close).not.toHaveBeenCalled();
    });

    it('should handle server stop errors', async () => {
      await serverManager.startServer();
      mockServer.close.mockRejectedValue(new Error('Stop failed'));

      await expect(serverManager.stopServer()).rejects.toThrow('Stop failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error stopping server',
        { error: 'Stop failed' }
      );
    });

    it('should handle non-Error stop exceptions', async () => {
      await serverManager.startServer();
      mockServer.close.mockRejectedValue('Stop string error');

      await expect(serverManager.stopServer()).rejects.toBe('Stop string error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error stopping server',
        { error: 'Stop string error' }
      );
    });
  });

  describe('server state', () => {
    beforeEach(() => {
      serverManager.initializeServer();
    });

    it('should return correct running state', () => {
      expect(serverManager.isServerRunning()).toBe(false);
    });

    it('should return server instance', () => {
      expect(serverManager.getServer()).toBe(mockServer);
    });

    it('should return null server instance before initialization', () => {
      const uninitializedManager = new ServerManager(
        mockToolRegistry as any,
        mockConfigManager as any
      );

      expect(uninitializedManager.getServer()).toBeNull();
    });

    it('should return server statistics', () => {
      const stats = serverManager.getServerStats();

      expect(stats).toEqual({
        isRunning: false,
        tools: 1,
        categories: { test: 1 },
        config: {
          name: 'test-server',
          version: '1.0.0',
          processId: 12345,
        },
      });
    });
  });

  describe('shutdown handlers', () => {
    beforeEach(() => {
      serverManager.initializeServer();
      jest.clearAllMocks(); // Clear mocks after initialization
    });

    it('should setup shutdown handlers', () => {
      serverManager.setupShutdownHandlers();

      expect(mockProcess.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(mockProcess.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    });

    it('should handle SIGINT shutdown gracefully', async () => {
      serverManager.setupShutdownHandlers();

      // Get the SIGINT handler
      const sigintHandler = mockProcess.on.mock.calls
        .find(call => call[0] === 'SIGINT')[1];

      // Mock successful shutdown
      await sigintHandler();

      expect(mockLogger.info).toHaveBeenCalledWith('Received SIGINT, shutting down gracefully...');
      expect(mockLogger.info).toHaveBeenCalledWith('Shutdown complete');
      expect(mockProcess.exit).toHaveBeenCalledWith(0);
    });

    it('should handle SIGTERM shutdown gracefully', async () => {
      serverManager.setupShutdownHandlers();

      // Get the SIGTERM handler
      const sigtermHandler = mockProcess.on.mock.calls
        .find(call => call[0] === 'SIGTERM')[1];

      await sigtermHandler();

      expect(mockLogger.info).toHaveBeenCalledWith('Received SIGTERM, shutting down gracefully...');
      expect(mockLogger.info).toHaveBeenCalledWith('Shutdown complete');
      expect(mockProcess.exit).toHaveBeenCalledWith(0);
    });

    it('should handle shutdown errors', async () => {
      serverManager.setupShutdownHandlers();
      
      // Mock server to throw error on close
      await serverManager.startServer();
      mockServer.close.mockRejectedValue(new Error('Shutdown failed'));

      const sigintHandler = mockProcess.on.mock.calls
        .find(call => call[0] === 'SIGINT')[1];

      await sigintHandler();
      
      // Give time for async shutdown to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error stopping server',
        { error: 'Shutdown failed' }
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during shutdown',
        { error: 'Shutdown failed' }
      );
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle non-Error shutdown exceptions', async () => {
      serverManager.setupShutdownHandlers();
      
      await serverManager.startServer();
      mockServer.close.mockRejectedValue('Shutdown string error');

      const sigintHandler = mockProcess.on.mock.calls
        .find(call => call[0] === 'SIGINT')[1];

      await sigintHandler();
      
      // Give time for async shutdown to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error stopping server',
        { error: 'Shutdown string error' }
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during shutdown',
        { error: 'Shutdown string error' }
      );
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('validation', () => {
    it('should validate successful setup', () => {
      serverManager.initializeServer();
      
      const validation = serverManager.validateSetup();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect uninitialized server', () => {
      const uninitializedManager = new ServerManager(
        mockToolRegistry as any,
        mockConfigManager as any
      );

      const validation = uninitializedManager.validateSetup();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Server not initialized');
    });

    it('should detect no tools registered', () => {
      serverManager.initializeServer();
      mockToolRegistry.getToolCount.mockReturnValue(0);

      const validation = serverManager.validateSetup();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No tools registered');
    });

    it('should include config validation errors', () => {
      serverManager.initializeServer();
      mockConfigManager.validateConfiguration.mockReturnValue({
        valid: false,
        errors: ['Invalid port', 'Missing config'] as string[],
      });

      const validation = serverManager.validateSetup();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid port');
      expect(validation.errors).toContain('Missing config');
    });

    it('should handle multiple validation errors', () => {
      mockToolRegistry.getToolCount.mockReturnValue(0);
      mockConfigManager.validateConfiguration.mockReturnValue({
        valid: false,
        errors: ['Config error'] as string[],
      });

      const validation = serverManager.validateSetup();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(3);
      expect(validation.errors).toContain('Server not initialized');
      expect(validation.errors).toContain('No tools registered');
      expect(validation.errors).toContain('Config error');
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      serverManager.initializeServer();
    });

    it('should get tools summary', () => {
      mockToolRegistry.getStats.mockReturnValue({
        total: 5,
        categories: { actors: 2, viewport: 3 } as Record<string, number>,
        mode: 'dynamic' as const,
      });

      const summary = serverManager.getToolsSummary();

      expect(summary).toBe('5 tools: actors(2), viewport(3)');
    });

    it('should handle empty categories in summary', () => {
      mockToolRegistry.getStats.mockReturnValue({
        total: 0,
        categories: {} as Record<string, number>,
        mode: 'dynamic' as const,
      });

      const summary = serverManager.getToolsSummary();

      expect(summary).toBe('0 tools: ');
    });

    it('should handle single category in summary', () => {
      mockToolRegistry.getStats.mockReturnValue({
        total: 3,
        categories: { system: 3 } as Record<string, number>,
        mode: 'dynamic' as const,
      });

      const summary = serverManager.getToolsSummary();

      expect(summary).toBe('3 tools: system(3)');
    });
  });

  describe('edge cases', () => {
    it('should handle request handler setup without server', () => {
      const uninitializedManager = new ServerManager(
        mockToolRegistry as any,
        mockConfigManager as any
      );

      expect(() => {
        // Access private method via any cast for testing
        (uninitializedManager as any).setupRequestHandlers();
      }).toThrow('Server not initialized');
    });

    it('should handle tool result without content array', async () => {
      const mockTool = {
        handler: jest.fn().mockResolvedValue({ other: 'data' }),
      };
      mockToolRegistry.getTool.mockReturnValue(mockTool);

      serverManager.initializeServer();
      const callToolHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'call_tool')[1];

      const result = await callToolHandler({
        params: { name: 'test_tool', arguments: {} },
      });

      expect(result).toEqual({ other: 'data' });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tool test_tool completed successfully',
        expect.objectContaining({ resultLength: 0 })
      );
    });

    it('should handle tool result with empty content', async () => {
      const mockTool = {
        handler: jest.fn().mockResolvedValue({ content: [] }),
      };
      mockToolRegistry.getTool.mockReturnValue(mockTool);

      serverManager.initializeServer();
      const callToolHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'call_tool')[1];

      await callToolHandler({
        params: { name: 'test_tool', arguments: {} },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tool test_tool completed successfully',
        expect.objectContaining({ resultLength: 0 })
      );
    });

    it('should handle tool result with non-text content', async () => {
      const mockTool = {
        handler: jest.fn().mockResolvedValue({ 
          content: [{ type: 'image', data: 'base64data' }] 
        }),
      };
      mockToolRegistry.getTool.mockReturnValue(mockTool);

      serverManager.initializeServer();
      const callToolHandler = mockServer.setRequestHandler.mock.calls
        .find(call => call[0] === 'call_tool')[1];

      await callToolHandler({
        params: { name: 'test_tool', arguments: {} },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tool test_tool completed successfully',
        expect.objectContaining({ resultLength: 0 })
      );
    });
  });
});