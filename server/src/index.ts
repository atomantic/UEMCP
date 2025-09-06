#!/usr/bin/env node

/**
 * UEMCP Server Entry Point
 * Clean orchestration of server components
 */

import { logger } from './utils/logger.js';
import { PythonBridge } from './services/python-bridge.js';
import { ToolRegistry } from './services/tool-registry.js';
import { ConfigManager } from './services/config-manager.js';
import { ServerManager } from './services/server-manager.js';

/**
 * Main application startup
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

    // Initialize tool registry
    const toolRegistry = new ToolRegistry();
    
    // Initialize server manager
    const serverManager = new ServerManager(toolRegistry, configManager);
    
    // Initialize MCP server before validation to avoid false negatives
    serverManager.initializeServer();
    
    // Validate server setup
    const serverValidation = serverManager.validateSetup();
    if (!serverValidation.valid) {
      logger.error('Server setup validation failed:', { errors: serverValidation.errors });
      process.exit(1);
    }

    // Initialize Python bridge (test connection but don't require it)
    const listenerPort = configManager.getListenerPort();
    logger.info(`Connecting to Python bridge on port ${listenerPort}...`);
    
    const pythonBridge = new PythonBridge();
    try {
      // Test connection by sending a simple command
      await pythonBridge.executeCommand({ type: 'system.ping', params: {} });
      logger.info('✓ Python bridge connection successful');
    } catch (error) {
      logger.warn('Python bridge not available - tools will attempt connection when needed', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Initialize and start the MCP server
    serverManager.setupShutdownHandlers();
    
    logger.info(`Starting MCP server with ${toolRegistry.getToolCount()} tools...`);
    logger.info('Tools organized by category:');
    
    const stats = toolRegistry.getStats();
    Object.entries(stats.categories).forEach(([category, count]) => {
      logger.info(`  ${category}: ${count} tools`);
    });
    
    await serverManager.startServer();
    
    logger.info('='.repeat(60));
    logger.info('✓ UEMCP Server started successfully');
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
