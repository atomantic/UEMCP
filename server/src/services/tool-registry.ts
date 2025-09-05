/**
 * Tool Registry Service
 * Manages registration and lookup of MCP tools
 */

import { logger } from '../utils/logger.js';

// Import all tools from centralized index
import {
  // Actor tools
  actorSpawnTool,
  actorDeleteTool,
  actorModifyTool,
  actorDuplicateTool,
  actorOrganizeTool,
  batchSpawnTool,
  placementValidateTool,
  actorSnapToSocketTool,
  // Viewport tools
  viewportScreenshotTool,
  viewportCameraTool,
  viewportModeTool,
  viewportFocusTool,
  viewportRenderModeTool,
  viewportBoundsTool,
  viewportFitTool,
  viewportLookAtTool,
  // Asset tools
  assetListTool,
  assetInfoTool,
  assetImportTool,
  // Material tools
  materialListTool,
  materialInfoTool,
  materialCreateTool,
  materialApplyTool,
  // Blueprint tools
  blueprintCreateTool,
  // Level tools
  levelActorsTool,
  levelSaveTool,
  levelOutlinerTool,
  // System tools
  projectInfoTool,
  testConnectionTool,
  helpTool,
  pythonProxyTool,
  restartListenerTool,
  ueLogsTool,
  undoTool,
  redoTool,
  historyListTool,
  checkpointCreateTool,
  checkpointRestoreTool,
  batchOperationsTool,
} from '../tools/index.js';

// Define tool interface
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

// Tool categories for organization
export const TOOL_CATEGORIES = {
  actors: 'Actor Management',
  viewport: 'Viewport Control', 
  assets: 'Asset Management',
  materials: 'Material System',
  blueprints: 'Blueprint Creation',
  level: 'Level Operations',
  system: 'System & Utilities',
} as const;

/**
 * Service for managing MCP tool registration and lookup
 */
export class ToolRegistry {
  private toolHandlers = new Map<string, MCPTool>();
  private toolsByCategory = new Map<string, MCPTool[]>();

  constructor() {
    this.initializeTools();
  }

  /**
   * Initialize and register all available tools
   */
  private initializeTools(): void {
    // Define all available tools
    const allTools = [
      actorSpawnTool,
      actorDeleteTool,
      actorModifyTool,
      actorDuplicateTool,
      actorOrganizeTool,
      batchSpawnTool,
      placementValidateTool,
      actorSnapToSocketTool,
      viewportScreenshotTool,
      viewportCameraTool,
      viewportModeTool,
      viewportFocusTool,
      viewportRenderModeTool,
      viewportBoundsTool,
      viewportFitTool,
      viewportLookAtTool,
      assetListTool,
      assetInfoTool,
      assetImportTool,
      materialListTool,
      materialInfoTool,
      materialCreateTool,
      materialApplyTool,
      blueprintCreateTool,
      levelActorsTool,
      levelSaveTool,
      levelOutlinerTool,
      projectInfoTool,
      testConnectionTool,
      helpTool,
      pythonProxyTool,
      restartListenerTool,
      ueLogsTool,
      undoTool,
      redoTool,
      historyListTool,
      checkpointCreateTool,
      checkpointRestoreTool,
      batchOperationsTool,
    ];

    // Register each tool
    allTools.forEach(tool => {
      this.registerTool(tool as MCPTool);
    });

    logger.info(`Registered ${allTools.length} MCP tools`);
  }

  /**
   * Register a single tool
   */
  public registerTool(tool: MCPTool): void {
    const name = tool.definition.name;
    
    if (this.toolHandlers.has(name)) {
      logger.warn(`Tool ${name} is already registered - overwriting`);
    }

    this.toolHandlers.set(name, tool);

    // Categorize tool by name prefix
    const category = this.categorizeToolByName(name);
    if (!this.toolsByCategory.has(category)) {
      this.toolsByCategory.set(category, []);
    }
    this.toolsByCategory.get(category)!.push(tool);
  }

  /**
   * Get tool by name
   */
  public getTool(name: string): MCPTool | undefined {
    return this.toolHandlers.get(name);
  }

  /**
   * Get all registered tools
   */
  public getAllTools(): MCPTool[] {
    return Array.from(this.toolHandlers.values());
  }

  /**
   * Get tool definitions (for MCP list_tools response)
   */
  public getToolDefinitions(): Array<{ name: string; description: string; inputSchema: unknown }> {
    return this.getAllTools().map(tool => tool.definition);
  }

  /**
   * Get tools by category
   */
  public getToolsByCategory(category: string): MCPTool[] {
    return this.toolsByCategory.get(category) || [];
  }

  /**
   * Get all categories
   */
  public getCategories(): string[] {
    return Array.from(this.toolsByCategory.keys());
  }

  /**
   * Get tool count
   */
  public getToolCount(): number {
    return this.toolHandlers.size;
  }

  /**
   * Check if tool exists
   */
  public hasTool(name: string): boolean {
    return this.toolHandlers.has(name);
  }

  /**
   * Get tool names
   */
  public getToolNames(): string[] {
    return Array.from(this.toolHandlers.keys()).sort();
  }

  /**
   * Categorize tool by name prefix
   */
  private categorizeToolByName(name: string): string {
    if (name.startsWith('actor_')) return 'actors';
    if (name.startsWith('viewport_')) return 'viewport';
    if (name.startsWith('asset_')) return 'assets';
    if (name.startsWith('material_')) return 'materials';
    if (name.startsWith('blueprint_')) return 'blueprints';
    if (name.startsWith('level_')) return 'level';
    return 'system';
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    totalTools: number;
    categories: Record<string, number>;
  } {
    const stats = {
      totalTools: this.getToolCount(),
      categories: {} as Record<string, number>,
    };

    this.toolsByCategory.forEach((tools, category) => {
      stats.categories[category] = tools.length;
    });

    return stats;
  }
}