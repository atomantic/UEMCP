import { ToolRegistry, MCPTool, TOOL_CATEGORIES } from '../../src/services/tool-registry.js';

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock all tools to avoid importing the real ones
jest.mock('../../src/tools/index.js', () => {
  // Create mock tools for each category
  const createMockTool = (name: string): MCPTool => ({
    definition: {
      name,
      description: `Mock ${name} tool`,
      inputSchema: { type: 'object', properties: {} },
    },
    handler: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: `Mock result from ${name}` }],
    }),
  });

  return {
    // Actor tools (6 total - only those starting with actor_)
    actorSpawnTool: createMockTool('actor_spawn'),
    actorDeleteTool: createMockTool('actor_delete'),
    actorModifyTool: createMockTool('actor_modify'),
    actorDuplicateTool: createMockTool('actor_duplicate'),
    actorOrganizeTool: createMockTool('actor_organize'),
    actorSnapToSocketTool: createMockTool('actor_snap_to_socket'),
    // Viewport tools
    viewportScreenshotTool: createMockTool('viewport_screenshot'),
    viewportCameraTool: createMockTool('viewport_camera'),
    viewportModeTool: createMockTool('viewport_mode'),
    viewportFocusTool: createMockTool('viewport_focus'),
    viewportRenderModeTool: createMockTool('viewport_render_mode'),
    viewportBoundsTool: createMockTool('viewport_bounds'),
    viewportFitTool: createMockTool('viewport_fit'),
    viewportLookAtTool: createMockTool('viewport_look_at'),
    // Asset tools
    assetListTool: createMockTool('asset_list'),
    assetInfoTool: createMockTool('asset_info'),
    assetImportTool: createMockTool('asset_import'),
    // Material tools
    materialListTool: createMockTool('material_list'),
    materialInfoTool: createMockTool('material_info'),
    materialCreateTool: createMockTool('material_create'),
    materialApplyTool: createMockTool('material_apply'),
    // Blueprint tools
    blueprintCreateTool: createMockTool('blueprint_create'),
    // Level tools
    levelActorsTool: createMockTool('level_actors'),
    levelSaveTool: createMockTool('level_save'),
    levelOutlinerTool: createMockTool('level_outliner'),
    // System tools (14 total - includes batch_spawn, placement_validate, batch_operations)
    projectInfoTool: createMockTool('project_info'),
    testConnectionTool: createMockTool('test_connection'),
    helpTool: createMockTool('help'),
    pythonProxyTool: createMockTool('python_proxy'),
    restartListenerTool: createMockTool('restart_listener'),
    ueLogsTool: createMockTool('ue_logs'),
    undoTool: createMockTool('undo'),
    redoTool: createMockTool('redo'),
    historyListTool: createMockTool('history_list'),
    checkpointCreateTool: createMockTool('checkpoint_create'),
    checkpointRestoreTool: createMockTool('checkpoint_restore'),
    batchSpawnTool: createMockTool('batch_spawn'),
    placementValidateTool: createMockTool('placement_validate'),
    batchOperationsTool: createMockTool('batch_operations'),
  };
});

describe('ToolRegistry', () => {
  let toolRegistry: ToolRegistry;

  beforeEach(() => {
    jest.clearAllMocks();
    toolRegistry = new ToolRegistry();
  });

  describe('initialization', () => {
    it('should initialize with all tools registered', () => {
      expect(toolRegistry.getToolCount()).toBe(39); // Total number of mock tools
    });

    it('should categorize tools correctly', () => {
      const stats = toolRegistry.getStats();
      
      expect(stats.categories.actors).toBe(6); // 6 actor tools (only actor_* prefixed)
      expect(stats.categories.viewport).toBe(8); // 8 viewport tools
      expect(stats.categories.assets).toBe(3); // 3 asset tools
      expect(stats.categories.materials).toBe(4); // 4 material tools
      expect(stats.categories.blueprints).toBe(1); // 1 blueprint tool
      expect(stats.categories.level).toBe(3); // 3 level tools
      expect(stats.categories.system).toBe(14); // 14 system tools (including batch_spawn, placement_validate, batch_operations)
    });

    it('should have TOOL_CATEGORIES constants', () => {
      expect(TOOL_CATEGORIES.actors).toBe('Actor Management');
      expect(TOOL_CATEGORIES.viewport).toBe('Viewport Control');
      expect(TOOL_CATEGORIES.assets).toBe('Asset Management');
      expect(TOOL_CATEGORIES.materials).toBe('Material System');
      expect(TOOL_CATEGORIES.blueprints).toBe('Blueprint Creation');
      expect(TOOL_CATEGORIES.level).toBe('Level Operations');
      expect(TOOL_CATEGORIES.system).toBe('System & Utilities');
    });
  });

  describe('tool registration', () => {
    it('should register a new tool', () => {
      const mockTool: MCPTool = {
        definition: {
          name: 'test_tool',
          description: 'Test tool',
          inputSchema: { type: 'object' },
        },
        handler: jest.fn(),
      };

      const initialCount = toolRegistry.getToolCount();
      toolRegistry.registerTool(mockTool);
      
      expect(toolRegistry.getToolCount()).toBe(initialCount + 1);
      expect(toolRegistry.hasTool('test_tool')).toBe(true);
    });

    it('should warn when overwriting existing tool', () => {
      const mockTool: MCPTool = {
        definition: {
          name: 'actor_spawn', // Already exists
          description: 'Duplicate tool',
          inputSchema: { type: 'object' },
        },
        handler: jest.fn(),
      };

      const initialCount = toolRegistry.getToolCount();
      toolRegistry.registerTool(mockTool);
      
      // Should not increase count (overwrite)
      expect(toolRegistry.getToolCount()).toBe(initialCount);
      
      // Should have logged a warning (check mock)
      const { logger } = require('../../src/utils/logger.js');
      expect(logger.warn).toHaveBeenCalledWith('Tool actor_spawn is already registered - overwriting');
    });
  });

  describe('tool retrieval', () => {
    it('should get tool by name', () => {
      const tool = toolRegistry.getTool('actor_spawn');
      
      expect(tool).toBeDefined();
      expect(tool!.definition.name).toBe('actor_spawn');
    });

    it('should return undefined for non-existent tool', () => {
      const tool = toolRegistry.getTool('non_existent_tool');
      expect(tool).toBeUndefined();
    });

    it('should get all tools', () => {
      const allTools = toolRegistry.getAllTools();
      expect(allTools).toHaveLength(39);
    });

    it('should get tool definitions for MCP', () => {
      const definitions = toolRegistry.getToolDefinitions();
      
      expect(definitions).toHaveLength(39);
      expect(definitions[0]).toHaveProperty('name');
      expect(definitions[0]).toHaveProperty('description');
      expect(definitions[0]).toHaveProperty('inputSchema');
    });

    it('should get tools by category', () => {
      const actorTools = toolRegistry.getToolsByCategory('actors');
      expect(actorTools).toHaveLength(6);

      const viewportTools = toolRegistry.getToolsByCategory('viewport');
      expect(viewportTools).toHaveLength(8);

      const nonExistentTools = toolRegistry.getToolsByCategory('non_existent');
      expect(nonExistentTools).toHaveLength(0);
    });

    it('should get all categories', () => {
      const categories = toolRegistry.getCategories();
      expect(categories).toContain('actors');
      expect(categories).toContain('viewport');
      expect(categories).toContain('assets');
      expect(categories).toContain('materials');
      expect(categories).toContain('blueprints');
      expect(categories).toContain('level');
      expect(categories).toContain('system');
    });

    it('should get tool names sorted', () => {
      const names = toolRegistry.getToolNames();
      expect(names).toHaveLength(39);
      
      // Should be sorted alphabetically
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
      
      expect(names).toContain('actor_spawn');
      expect(names).toContain('viewport_screenshot');
      expect(names).toContain('help');
    });

    it('should check if tool exists', () => {
      expect(toolRegistry.hasTool('actor_spawn')).toBe(true);
      expect(toolRegistry.hasTool('non_existent')).toBe(false);
    });
  });

  describe('categorization', () => {
    it('should categorize tools by name prefix correctly', () => {
      const actorTool: MCPTool = {
        definition: { name: 'actor_test', description: 'Test', inputSchema: {} },
        handler: jest.fn(),
      };
      
      toolRegistry.registerTool(actorTool);
      expect(toolRegistry.getToolsByCategory('actors')).toContain(actorTool);
    });

    it('should categorize unknown prefixes as system', () => {
      const unknownTool: MCPTool = {
        definition: { name: 'unknown_prefix_tool', description: 'Test', inputSchema: {} },
        handler: jest.fn(),
      };
      
      toolRegistry.registerTool(unknownTool);
      expect(toolRegistry.getToolsByCategory('system')).toContain(unknownTool);
    });

    it('should categorize tools without underscores as system', () => {
      const noUnderscoreTool: MCPTool = {
        definition: { name: 'notool', description: 'Test', inputSchema: {} },
        handler: jest.fn(),
      };
      
      toolRegistry.registerTool(noUnderscoreTool);
      expect(toolRegistry.getToolsByCategory('system')).toContain(noUnderscoreTool);
    });
  });

  describe('statistics', () => {
    it('should get registry statistics', () => {
      const stats = toolRegistry.getStats();
      
      expect(stats.totalTools).toBe(39);
      expect(stats.categories).toBeInstanceOf(Object);
      expect(Object.keys(stats.categories)).toHaveLength(7); // 7 categories
    });

    it('should get tool count', () => {
      expect(toolRegistry.getToolCount()).toBe(39);
    });

    it('should update stats when tools are added', () => {
      const newTool: MCPTool = {
        definition: { name: 'actor_new_tool', description: 'Test', inputSchema: {} },
        handler: jest.fn(),
      };
      
      const initialStats = toolRegistry.getStats();
      toolRegistry.registerTool(newTool);
      const newStats = toolRegistry.getStats();
      
      expect(newStats.totalTools).toBe(initialStats.totalTools + 1);
      expect(newStats.categories.actors).toBe(initialStats.categories.actors + 1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty category requests gracefully', () => {
      const emptyTools = toolRegistry.getToolsByCategory('');
      expect(emptyTools).toHaveLength(0);
    });

    it('should handle null/undefined tool names', () => {
      expect(toolRegistry.hasTool('')).toBe(false);
      expect(toolRegistry.getTool('')).toBeUndefined();
    });

    it('should handle tools with complex names', () => {
      const complexTool: MCPTool = {
        definition: { 
          name: 'complex_tool_with_many_underscores_and_numbers_123', 
          description: 'Complex tool', 
          inputSchema: {} 
        },
        handler: jest.fn(),
      };
      
      toolRegistry.registerTool(complexTool);
      expect(toolRegistry.hasTool('complex_tool_with_many_underscores_and_numbers_123')).toBe(true);
    });

    it('should maintain category integrity after multiple operations', () => {
      // Add tools to different categories
      const tools = [
        { name: 'actor_test1', category: 'actors' },
        { name: 'viewport_test1', category: 'viewport' },
        { name: 'custom_test1', category: 'system' },
      ];

      tools.forEach(({ name }) => {
        toolRegistry.registerTool({
          definition: { name, description: 'Test', inputSchema: {} },
          handler: jest.fn(),
        });
      });

      const stats = toolRegistry.getStats();
      expect(stats.totalTools).toBe(39 + 3); // Original 39 + 3 new
      expect(stats.categories.actors).toBe(6 + 1); // Original 6 + 1 new
      expect(stats.categories.viewport).toBe(8 + 1); // Original 8 + 1 new
      expect(stats.categories.system).toBe(14 + 1); // Original 14 + 1 new
    });
  });
});