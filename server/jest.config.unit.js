module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests/unit', '<rootDir>/tests/services'],
  testMatch: ['**/tests/unit/**/*.test.ts', '**/tests/services/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        skipLibCheck: true
      }
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.ts', // Main entry point, minimal logic
  ],
  coverageDirectory: 'coverage/unit',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 2,  // Current: 2.41% - set minimum baseline
      functions: 2, // Current: 2.45% - set minimum baseline  
      lines: 2,     // Current: 2.92% - set minimum baseline
      statements: 2 // Current: 2.74% - set minimum baseline
    },
    'src/utils/': {
      branches: 80, // Current: 84.61% - allow some regression
      functions: 75, // Current: 80% - allow some regression
      lines: 70,    // Current: 72.72% - allow some regression
      statements: 70 // Current: 71.11% - allow some regression
    },
    'src/tools/base/': {
      branches: 35, // Current: 42.28% - allow some regression
      functions: 35, // Current: 37.28% - allow some regression
      lines: 35,    // Current: 40.45% - allow some regression
      statements: 35 // Current: 40.46% - allow some regression
    }
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  silent: false,
  verbose: true,
  displayName: 'Unit Tests'
};