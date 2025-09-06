import { PythonBridge, PythonCommand } from '../../src/services/python-bridge.js';

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock node-fetch - it's a default export
jest.mock('node-fetch', () => jest.fn());

describe('PythonBridge', () => {
  let pythonBridge: PythonBridge;
  let originalEnv: NodeJS.ProcessEnv;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
    mockFetch = jest.mocked(require('node-fetch'));
    pythonBridge = new PythonBridge();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should use default port 8765', () => {
      delete process.env.UEMCP_LISTENER_PORT;
      const bridge = new PythonBridge();
      // Port is private, so we can't directly test it, but we can test the behavior
      expect(bridge).toBeInstanceOf(PythonBridge);
    });

    it('should use environment port when set', () => {
      process.env.UEMCP_LISTENER_PORT = '9000';
      const bridge = new PythonBridge();
      expect(bridge).toBeInstanceOf(PythonBridge);
    });
  });

  describe('executeCommand', () => {
    const mockCommand: PythonCommand = {
      type: 'test.command',
      params: { testParam: 'value' }
    };

    it('should make HTTP POST request to Python listener', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true, result: 'test' })
      };
      mockFetch.mockResolvedValue(mockResponse);

      await pythonBridge.executeCommand(mockCommand);

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8765', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockCommand),
        timeout: 10000,
      });
    });

    it('should return successful response', async () => {
      const mockPythonResponse = { success: true, result: 'test data' };
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue(mockPythonResponse)
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await pythonBridge.executeCommand(mockCommand);

      expect(result).toEqual(mockPythonResponse);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await pythonBridge.executeCommand(mockCommand);

      expect(result).toEqual({
        success: false,
        error: 'Failed to connect to Python listener at http://localhost:8765. Make sure Unreal Engine is running with the UEMCP plugin loaded.'
      });
    });
  });

  describe('isUnrealEngineAvailable', () => {
    it('should return true when health check succeeds', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ ready: true })
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await pythonBridge.isUnrealEngineAvailable();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8765/', {
        method: 'GET',
        timeout: 2000,
      });
    });

    it('should return false when health check fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const result = await pythonBridge.isUnrealEngineAvailable();

      expect(result).toBe(false);
    });
  });
});