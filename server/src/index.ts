#!/usr/bin/env node

/**
 * UEMCP Server Entry Point with Dynamic Tool Loading
 * 
 * This version attempts to load tools dynamically from Python,
 * falling back to static definitions if needed.
 */

import { logger } from './utils/logger.js';
import { PythonBridge } from './services/python-bridge.js';
import { HybridToolRegistry } from './services/dynamic-tool-registry.js';
import { ConfigManager } from './services/config-manager.js';
import { ServerManager } from './services/server-manager.js';

/**
 * Main application startup with dynamic tool loading
 */
async function main(): Promise<void> {
  try {
    // Initialize configuration management
    const configManager = new ConfigManager('0.2.0', 'uemcp');
    
    // Validate configuration
    const configValidation = configManager.validateConfiguration();
    if (!configValidation.valid) {
      logger.error('Configuration validation failed:', { errors: configValidation.errors });
      process.exit(1);
    }

    // Log startup banner and configuration
    configManager.logStartupBanner();
    configManager.logConfiguration();

    // Initialize Python bridge first for dynamic loading
    const listenerPort = configManager.getListenerPort();
    logger.info(`Connecting to Python bridge on port ${listenerPort}...`);
    
    const pythonBridge = new PythonBridge();
    let bridgeAvailable = false;
    
    try {
      // Test connection by sending a simple command
      await pythonBridge.executeCommand({ type: 'test_connection', params: {} });
      logger.info('✓ Python bridge connection successful');
      bridgeAvailable = true;
    } catch (error) {
      logger.warn('Python bridge not available - will use static tool definitions', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Initialize hybrid tool registry
    const toolRegistry = new HybridToolRegistry(bridgeAvailable ? pythonBridge : undefined);
    await toolRegistry.initialize();
    
    // Log tool loading mode
    const stats = toolRegistry.getStats();
    logger.info(`Loaded ${stats.total} tools in ${stats.mode} mode`);
    
    if (stats.mode === 'dynamic') {
      logger.info('✨ Using dynamic tool definitions from Python manifest');
    } else {
      logger.info('📦 Using static tool definitions (Python manifest not available)');
    }
    
    // Initialize server manager with the hybrid registry
    const serverManager = new ServerManager(toolRegistry, configManager);
    
    // Initialize MCP server before validation to avoid false negatives
    serverManager.initializeServer();
    
    // Validate server setup
    const serverValidation = serverManager.validateSetup();
    if (!serverValidation.valid) {
      logger.error('Server setup validation failed:', { errors: serverValidation.errors });
      process.exit(1);
    }

    // Initialize and start the MCP server
    serverManager.setupShutdownHandlers();
    
    logger.info(`Starting MCP server with ${toolRegistry.getToolCount()} tools...`);
    logger.info('Tools organized by category:');
    
    Object.entries(stats.categories).forEach(([category, count]) => {
      logger.info(`  ${category}: ${count} tools`);
    });
    
    await serverManager.startServer();
    
    logger.info('='.repeat(60));
    logger.info('✓ UEMCP Server started successfully');
    logger.info(`Mode: ${stats.mode === 'dynamic' ? '🚀 Dynamic (Python-driven)' : '📦 Static (hardcoded)'}`);
    logger.info(`Ready to receive MCP requests...`);
    logger.info(`Summary: ${serverManager.getToolsSummary()}`);
    logger.info('='.repeat(60));
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed during initialization', { error: errorMessage });
    throw error;
  }
}

// Start the server
main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error('Server failed to start', { error: errorMessage });
  process.exit(1);
});