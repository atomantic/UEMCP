/**
 * Enhanced Tool Registry with Dynamic Loading Support
 * 
 * This registry can work in two modes:
 * 1. Dynamic Mode: Loads tools from Python manifest (preferred)
 * 2. Static Mode: Falls back to hardcoded tools if manifest unavailable
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';
import { ResponseFormatter } from '../utils/response-formatter.js';
import { PythonBridge } from './python-bridge.js';
import { DynamicToolRegistry } from '../tools/dynamic-registry.js';
import { DynamicTool } from '../tools/dynamic-tool.js';

export interface MCPTool {
  definition: {
    name: string;
    description: string;
    inputSchema: unknown;
  };
  handler: (args: unknown) => Promise<CallToolResult>;
}

/**
 * Hybrid tool registry that prefers dynamic tools but can fall back to static
 */
export class HybridToolRegistry {
  private dynamicRegistry: DynamicToolRegistry | null = null;

  constructor(private pythonBridge?: PythonBridge) {}

  private get registry(): DynamicToolRegistry {
    if (!this.dynamicRegistry) throw new Error('Registry not initialized — call initialize() first');
    return this.dynamicRegistry;
  }

  /**
   * Initialize the registry, preferring dynamic if available
   */
  async initialize(): Promise<void> {
    if (this.pythonBridge) {
      try {
        logger.info('Attempting to load tools dynamically from Python manifest...');

        const candidate = new DynamicToolRegistry(this.pythonBridge);
        const success = await candidate.initialize();

        if (success) {
          // Only assign after successful initialization so isDynamicMode() is never true
          // for a partially-initialized registry.
          this.dynamicRegistry = candidate;
          logger.info('✓ Successfully loaded tools from Python manifest');

          const manifest = this.dynamicRegistry.getManifest();
          if (manifest) {
            logger.info(`Loaded ${manifest.totalTools} tools across ${Object.keys(manifest.categories).length} categories`);
          }
          return;
        }
      } catch (error) {
        logger.warn('Failed to load dynamic tools, falling back to static:', {
          error: ResponseFormatter.getErrorMessage(error)
        });
      }
    }

    throw new Error('Unable to load tools from Python manifest. Ensure Python listener is running.');
  }

  /**
   * Get tool definitions for MCP server
   */
  getToolDefinitions(): Array<{ name: string; description: string; inputSchema: unknown }> {
    const tools = this.getAllTools();
    return tools.map(tool => tool.definition);
  }

  /**
   * Create an MCPTool handler for a dynamic tool
   */
  private createToolHandler(tool: DynamicTool): MCPTool {
    return {
      definition: tool.definition,
      handler: async (args: unknown): Promise<CallToolResult> => {
        const typedArgs = (args as Record<string, unknown> | undefined) ?? {};
        const response = await tool.handler(typedArgs);
        return {
          content: response.content.map(item => ({
            type: 'text' as const,
            text: ('text' in item && typeof item.text === 'string') ? item.text : ''
          }))
        };
      }
    };
  }

  /**
   * Get all available tools
   */
  getAllTools(): MCPTool[] {
    return this.registry.getTools().map(tool => this.createToolHandler(tool));
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): MCPTool | undefined {
    const tool = this.registry.getTool(name);
    if (tool) return this.createToolHandler(tool);
    return undefined;
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.registry.getTools().length;
  }

  /**
   * Get statistics about loaded tools
   */
  getStats(): { total: number; categories: Record<string, number>; mode: string } {
    const manifest = this.registry.getManifest();
    if (manifest) {
      const categoryCounts: Record<string, number> = {};
      for (const [category, tools] of Object.entries(manifest.categories)) {
        categoryCounts[category] = tools.length;
      }
      return { total: manifest.totalTools, categories: categoryCounts, mode: 'dynamic' };
    }
    return { total: 0, categories: {}, mode: 'none' };
  }

  /**
   * Check if running in dynamic mode
   */
  isDynamicMode(): boolean {
    return this.dynamicRegistry !== null;
  }

  /**
   * Refresh dynamic tools (if in dynamic mode)
   */
  async refresh(): Promise<boolean> {
    return await this.registry.refresh();
  }
}