/**
 * Enhanced Tool Registry with Dynamic Loading Support
 * 
 * This registry can work in two modes:
 * 1. Dynamic Mode: Loads tools from Python manifest (preferred)
 * 2. Static Mode: Falls back to hardcoded tools if manifest unavailable
 */

import { logger } from '../utils/logger.js';
import { PythonBridge } from './python-bridge.js';
import { DynamicToolRegistry } from '../tools/dynamic-registry.js';

export interface MCPTool {
  definition: {
    name: string;
    description: string;
    inputSchema: unknown;
  };
  handler: (args: unknown) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

/**
 * Hybrid tool registry that prefers dynamic tools but can fall back to static
 */
export class HybridToolRegistry {
  private dynamicRegistry: DynamicToolRegistry | null = null;
  private isDynamic = false;

  constructor(private pythonBridge?: PythonBridge) {}

  /**
   * Initialize the registry, preferring dynamic if available
   */
  async initialize(): Promise<void> {
    if (this.pythonBridge) {
      try {
        logger.info('Attempting to load tools dynamically from Python manifest...');
        
        this.dynamicRegistry = new DynamicToolRegistry(this.pythonBridge);
        const success = await this.dynamicRegistry.initialize();
        
        if (success) {
          this.isDynamic = true;
          logger.info('✓ Successfully loaded tools from Python manifest');
          
          const manifest = this.dynamicRegistry.getManifest();
          if (manifest) {
            logger.info(`Loaded ${manifest.totalTools} tools across ${Object.keys(manifest.categories).length} categories`);
          }
          return;
        }
      } catch (error) {
        logger.warn('Failed to load dynamic tools, falling back to static:', {
        error: error instanceof Error ? error.message : String(error)
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
   * Get all available tools
   */
  getAllTools(): MCPTool[] {
    if (this.isDynamic && this.dynamicRegistry) {
      // Convert dynamic tools to MCPTool format
      return this.dynamicRegistry.getTools().map(tool => ({
        definition: tool.definition,
        handler: async (args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> => {
          const response = await tool.execute(args);
          // Convert ToolResponse to expected format
          return {
            content: response.content.map(item => ({
              type: item.type,
              text: item.text || ''
            }))
          };
        }
      }));
    }
    return [];
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): MCPTool | undefined {
    if (this.isDynamic && this.dynamicRegistry) {
      const tool = this.dynamicRegistry.getTool(name);
      if (tool) {
        return {
          definition: tool.definition,
          handler: async (args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> => {
            const response = await tool.execute(args);
            // Convert ToolResponse to expected format
            return {
              content: response.content.map(item => ({
                type: item.type,
                text: item.text || ''
              }))
            };
          }
        };
      }
    }
    return undefined;
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    if (this.isDynamic && this.dynamicRegistry) {
      return this.dynamicRegistry.getTools().length;
    }
    return 0;
  }

  /**
   * Get statistics about loaded tools
   */
  getStats(): { total: number; categories: Record<string, number>; mode: string } {
    if (this.isDynamic && this.dynamicRegistry) {
      const manifest = this.dynamicRegistry.getManifest();
      if (manifest) {
        const categoryCounts: Record<string, number> = {};
        for (const [category, tools] of Object.entries(manifest.categories)) {
          categoryCounts[category] = tools.length;
        }
        return {
          total: manifest.totalTools,
          categories: categoryCounts,
          mode: 'dynamic'
        };
      }
    }
    
    return { total: 0, categories: {}, mode: 'none' };
  }

  /**
   * Check if running in dynamic mode
   */
  isDynamicMode(): boolean {
    return this.isDynamic;
  }

  /**
   * Refresh dynamic tools (if in dynamic mode)
   */
  async refresh(): Promise<boolean> {
    if (this.isDynamic && this.dynamicRegistry) {
      return await this.dynamicRegistry.refresh();
    }
    return false;
  }
}