/**
 * Dynamic Tool Registry
 * 
 * Fetches tool definitions from Python and creates dynamic tools,
 * eliminating duplicate definitions between Python and Node.js.
 */

import { PythonBridge } from '../services/python-bridge.js';
import { DynamicTool, DynamicToolDefinition } from './dynamic-tool.js';
import { logger } from '../utils/logger.js';
import { getVersion } from '../utils/version.js';

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

      // Validate each tool has required fields and a well-formed inputSchema before storing
      const rawTools = result.tools as unknown[];
      const validTools = rawTools.filter((tool): tool is DynamicToolDefinition => {
        if (typeof tool !== 'object' || tool === null) return false;
        const t = tool as Record<string, unknown>;
        if (typeof t['name'] !== 'string' ||
          typeof t['description'] !== 'string' ||
          typeof t['category'] !== 'string') {
          return false;
        }
        const schema = t['inputSchema'] as Record<string, unknown> | null | undefined;
        if (!schema || typeof schema !== 'object') return false;
        if (schema['type'] !== 'object') return false;
        if (typeof schema['properties'] !== 'object' || schema['properties'] === null) return false;
        if (schema['required'] !== undefined) {
          if (!Array.isArray(schema['required']) ||
            !(schema['required'] as unknown[]).every((v) => typeof v === 'string')) {
            return false;
          }
        }
        if (schema['additionalProperties'] !== undefined &&
          typeof schema['additionalProperties'] !== 'boolean') {
          return false;
        }
        return true;
      });
      if (validTools.length !== rawTools.length) {
        logger.warn(`Manifest contained ${rawTools.length - validTools.length} invalid tool definitions (missing required fields or malformed inputSchema)`);
      }

      // Rebuild categories to only include valid tool names, keeping manifest internally consistent.
      // Validate each entry to avoid runtime errors if the Python manifest is malformed.
      const validNames = new Set(validTools.map(t => t.name));
      const filteredCategories: Record<string, string[]> = {};
      const rawCategories = result.categories;
      if (rawCategories && typeof rawCategories === 'object' && !Array.isArray(rawCategories)) {
        for (const [cat, names] of Object.entries(rawCategories as Record<string, unknown>)) {
          if (!Array.isArray(names) || !(names as unknown[]).every((n) => typeof n === 'string')) {
            logger.warn(`Skipping malformed category "${cat}" in manifest (expected string[])`);
            continue;
          }
          const kept = (names as string[]).filter(n => validNames.has(n));
          if (kept.length > 0) filteredCategories[cat] = kept;
        }
      } else if (rawCategories !== undefined && rawCategories !== null) {
        logger.warn('Manifest categories field is malformed; expected object mapping category names to string[]');
      }

      this.manifest = {
        success: result.success,
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        version: String(result.version || getVersion()),
        totalTools: validTools.length,
        tools: validTools,
        categories: filteredCategories,
        error: result.error ? String(result.error) : undefined
      };
      logger.info(`Received manifest with ${this.manifest.totalTools} tools`);

      // Create dynamic tools from manifest
      for (const toolDef of this.manifest.tools) {
        const tool = new DynamicTool(toolDef, this.bridge);
        this.tools.set(toolDef.name, tool);
        logger.debug(`Registered dynamic tool: ${toolDef.name}`);
      }

      this.initialized = true;
      logger.info(`Successfully initialized ${this.tools.size} dynamic tools`);

      // Log categories for debugging
      for (const [category, tools] of Object.entries(this.manifest.categories)) {
        logger.debug(`Category ${category}: ${tools.length} tools`);
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
   * Refresh the manifest and tools from Python.
   * Builds new state in a temporary registry so the current instance
   * stays fully functional for concurrent requests during the await.
   * Only swaps fields on success.
   */
  async refresh(): Promise<boolean> {
    try {
      // Build new state in a separate registry instance
      const temp = new DynamicToolRegistry(this.bridge);
      const success = await temp.initialize();
      if (success) {
        // Atomic swap — only mutate after new state is fully ready
        this.tools = temp.tools;
        this.manifest = temp.manifest;
        this.initialized = true;
      }
      return success;
    } catch (error) {
      logger.error('Exception during registry refresh, existing state preserved:', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}