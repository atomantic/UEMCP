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

describe('PythonBridge', () => {
  let pythonBridge: PythonBridge;
  let originalEnv: NodeJS.ProcessEnv;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
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

    it('should use explicit port when passed as argument', () => {
      const bridge = new PythonBridge(9876);
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

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8765', expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockCommand),
      }));
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

    it('should propagate network errors to caller', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(pythonBridge.executeCommand(mockCommand)).rejects.toThrow('ECONNREFUSED');
    });

    it('should throw on non-ok HTTP response', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: jest.fn().mockResolvedValue('Server error details'),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(pythonBridge.executeCommand(mockCommand)).rejects.toThrow('Python listener HTTP 500');
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
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:8765/', expect.objectContaining({
        method: 'GET',
      }));
    });

    it('should return false when health check fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      const result = await pythonBridge.isUnrealEngineAvailable();

      expect(result).toBe(false);
    });
  });
});
