/**
 * Server Manager
 * Handles MCP server setup, request handling, and lifecycle management
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';
import { ToolRegistry } from './tool-registry.js';
import { ConfigManager } from './config-manager.js';
import { ToolResponse } from '../utils/response-formatter.js';

export interface ServerOptions {
  name?: string;
  version?: string;
  capabilities?: {
    tools?: Record<string, never>;
  };
}

/**
 * Service for managing MCP server lifecycle and request handling
 */
export class ServerManager {
  private server: Server | null = null;
  private toolRegistry: ToolRegistry;
  private configManager: ConfigManager;
  private isRunning = false;

  constructor(
    toolRegistry: ToolRegistry,
    configManager: ConfigManager,
    private options: ServerOptions = {}
  ) {
    this.toolRegistry = toolRegistry;
    this.configManager = configManager;
  }

  /**
   * Initialize the MCP server
   */
  public initializeServer(): void {
    if (this.server) {
      logger.warn('Server already initialized');
      return;
    }

    const config = this.configManager.getConfig();
    
    this.server = new Server(
      {
        name: this.options.name || config.name,
        version: this.options.version || config.version,
      },
      {
        capabilities: this.options.capabilities || {
          tools: {},
        },
      }
    );

    this.setupRequestHandlers();
    logger.info('MCP server initialized');
  }

  /**
   * Setup MCP request handlers
   */
  private setupRequestHandlers(): void {
    if (!this.server) {
      throw new Error('Server not initialized');
    }

    // Handle list_tools requests
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      const tools = this.toolRegistry.getToolDefinitions();
      logger.info(`Listed ${tools.length} available tools`);
      return { tools };
    });

    // Handle call_tool requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params as { 
        name: string; 
        arguments: unknown 
      };
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
      return this.handleToolCall(name, args) as any;
    });
  }

  /**
   * Handle individual tool calls with logging and error handling
   */
  private async handleToolCall(name: string, args: unknown): Promise<ToolResponse> {
    logger.info(`Tool called: ${name}`, { arguments: args });
    const startTime = Date.now();

    try {
      const tool = this.toolRegistry.getTool(name);
      if (!tool) {
        const error = `Unknown tool: ${name}`;
        logger.error(error);
        throw new Error(error);
      }
      
      const result = await tool.handler(args);
      const duration = Date.now() - startTime;
      
      logger.info(`Tool ${name} completed successfully`, { 
        duration: `${duration}ms`,
        resultLength: result.content?.[0]?.text?.length || 0
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(`Tool ${name} failed`, { 
        error: errorMessage,
        duration: `${duration}ms`
      });
      
      throw error;
    }
  }

  /**
   * Start the server with stdio transport
   */
  public async startServer(): Promise<void> {
    if (!this.server) {
      throw new Error('Server not initialized. Call initializeServer() first.');
    }

    if (this.isRunning) {
      logger.warn('Server is already running');
      return;
    }

    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      this.isRunning = true;
      const stats = this.toolRegistry.getStats();
      
      logger.info('UEMCP Server started successfully', {
        tools: stats.totalTools,
        categories: Object.keys(stats.categories).length,
        transport: 'stdio'
      });

      // Log tool statistics
      for (const [category, count] of Object.entries(stats.categories)) {
        logger.info(`  ${category}: ${count} tools`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to start server', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Stop the server gracefully
   */
  public async stopServer(): Promise<void> {
    if (!this.server || !this.isRunning) {
      logger.warn('Server is not running');
      return;
    }

    try {
      await this.server.close();
      this.isRunning = false;
      logger.info('UEMCP Server stopped gracefully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error stopping server', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Check if server is running
   */
  public isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get server instance (for advanced usage)
   */
  public getServer(): Server | null {
    return this.server;
  }

  /**
   * Get server statistics
   */
  public getServerStats(): {
    isRunning: boolean;
    tools: number;
    categories: Record<string, number>;
    config: unknown;
  } {
    const toolStats = this.toolRegistry.getStats();
    
    return {
      isRunning: this.isRunning,
      tools: toolStats.totalTools,
      categories: toolStats.categories,
      config: this.configManager.getConfig(),
    };
  }

  /**
   * Setup graceful shutdown handlers
   */
  public setupShutdownHandlers(): void {
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        await this.stopServer();
        logger.info('Shutdown complete');
        process.exit(0);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Error during shutdown', { error: errorMessage });
        process.exit(1);
      }
    };
    
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
  }

  /**
   * Validate server setup
   */
  public validateSetup(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.server) {
      errors.push('Server not initialized');
    }

    if (this.toolRegistry.getToolCount() === 0) {
      errors.push('No tools registered');
    }

    const configValidation = this.configManager.validateConfiguration();
    if (!configValidation.valid) {
      errors.push(...configValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get available tools summary
   */
  public getToolsSummary(): string {
    const stats = this.toolRegistry.getStats();
    const categories = Object.entries(stats.categories)
      .map(([cat, count]) => `${cat}(${count})`)
      .join(', ');
    
    return `${stats.totalTools} tools: ${categories}`;
  }
}