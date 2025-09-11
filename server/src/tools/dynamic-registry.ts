/**
 * Dynamic Tool Registry
 * 
 * Fetches tool definitions from Python and creates dynamic tools,
 * eliminating duplicate definitions between Python and Node.js.
 */

import { PythonBridge } from '../services/python-bridge.js';
import { DynamicTool, DynamicToolDefinition } from './dynamic-tool.js';
import { logger } from '../utils/logger.js';

export interface ToolManifest {
  success: boolean;
  version: string;
  totalTools: number;
  tools: DynamicToolDefinition[];
  categories: Record<string, string[]>;
  error?: string;
}

/**
 * Registry that dynamically loads tools from Python manifest
 */
export class DynamicToolRegistry {
  private tools: Map<string, DynamicTool> = new Map();
  private manifest: ToolManifest | null = null;
  private initialized = false;

  constructor(private bridge: PythonBridge) {}

  /**
   * Initialize by fetching manifest from Python
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      logger.info('Fetching tool manifest from Python...');
      
      // Request manifest from Python
      const result = await this.bridge.executeCommand({
        type: 'get_tool_manifest',
        params: {}
      });

      if (!result.success) {
        logger.error('Failed to fetch tool manifest:', { error: result.error });
        return false;
      }

      // Validate manifest structure
      if (!result.tools || !Array.isArray(result.tools)) {
        logger.error('Invalid manifest structure: missing tools array');
        return false;
      }

      this.manifest = {
        success: result.success,
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        version: String(result.version || '1.1.0'),
        totalTools: Number(result.totalTools || result.tools.length),
        tools: result.tools as DynamicToolDefinition[],
        categories: (result.categories || {}) as Record<string, string[]>,
        error: result.error ? String(result.error) : undefined
      };
      logger.info(`Received manifest with ${this.manifest.totalTools} tools`);

      // Create dynamic tools from manifest
      if (this.manifest && this.manifest.tools) {
        for (const toolDef of this.manifest.tools) {
          const tool = new DynamicTool(toolDef, this.bridge);
          this.tools.set(toolDef.name, tool);
          logger.debug(`Registered dynamic tool: ${toolDef.name}`);
        }
      }

      this.initialized = true;
      logger.info(`Successfully initialized ${this.tools.size} dynamic tools`);
      
      // Log categories for debugging
      if (this.manifest && this.manifest.categories) {
        for (const [category, tools] of Object.entries(this.manifest.categories)) {
          logger.debug(`Category ${category}: ${tools.length} tools`);
        }
      }

      return true;

    } catch (error) {
      logger.error('Failed to initialize dynamic registry:', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get all dynamically loaded tools
   */
  getTools(): DynamicTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): DynamicTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get the manifest
   */
  getManifest(): ToolManifest | null {
    return this.manifest;
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): DynamicTool[] {
    return Array.from(this.tools.values()).filter(
      tool => tool.category === category
    );
  }

  /**
   * Refresh the manifest and tools from Python
   */
  async refresh(): Promise<boolean> {
    this.initialized = false;
    this.tools.clear();
    this.manifest = null;
    return this.initialize();
  }
}