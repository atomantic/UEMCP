// Global test setup
// Suppress console.error during error tests to reduce noise

// Store the original console.error
const originalConsoleError = console.error;

// Mock console.error globally but allow tests to restore it
beforeEach(() => {
  // Only suppress errors that contain our tool error patterns
  jest.spyOn(console, 'error').mockImplementation((message: string) => {
    // Suppress UEMCP tool errors during tests
    if (typeof message === 'string' && message.includes('uemcp ERROR: Failed to execute')) {
      return; // Suppress these specific error logs
    }
    // Let other console.error calls through
    originalConsoleError(message);
  });
});

afterEach(() => {
  // Restore console.error after each test
  jest.restoreAllMocks();
});