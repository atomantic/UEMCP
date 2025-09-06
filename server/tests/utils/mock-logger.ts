/**
 * DRY utility for creating consistent logger mocks across tests
 */

export const createMockLogger = () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(), // Add debug method that some tools use
});

export const getMockLogger = () => {
  const mockLogger = createMockLogger();
  jest.mock('../../src/utils/logger.js', () => ({ logger: mockLogger }));
  return mockLogger;
};

export const clearLoggerMocks = (logger: ReturnType<typeof createMockLogger>) => {
  Object.values(logger).forEach(mock => mock.mockClear());
};