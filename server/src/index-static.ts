#!/usr/bin/env node

/**
 * DEPRECATED: Static Tool Loading Version
 * This file is kept for reference only. Use index.ts for dynamic loading.
 * 
 * The project now loads all tool definitions dynamically from Python,
 * eliminating ~2,000 lines of duplicate code.
 */

import { logger } from './utils/logger.js';

/**
 * Main application startup
 */
async function main(): Promise<void> {
  logger.error('='.repeat(60));
  logger.error('DEPRECATED: Static tool loading is no longer supported');
  logger.error('The project now uses dynamic tool loading from Python');
  logger.error('Please use the main index.ts file instead');
  logger.error('='.repeat(60));
  
  throw new Error('Static tool loading is deprecated. Use index.ts for dynamic loading.');
}

// Start the server
main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error('Server failed to start', { error: errorMessage });
  process.exit(1);
});