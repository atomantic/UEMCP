import { TOOL_NAMES, TOOL_CATEGORIES, ToolName, ToolCategory } from '../../src/utils/tool-registry.js';

describe('tool-registry', () => {
  describe('TOOL_NAMES', () => {
    it('should contain all expected actor tools', () => {
      const actorTools = [
        'actor_spawn',
        'actor_duplicate', 
        'actor_delete',
        'actor_modify',
        'actor_organize',
        'actor_snap_to_socket',
        'batch_spawn',
        'placement_validate'
      ];
      
      actorTools.forEach(tool => {
        expect(TOOL_NAMES).toContain(tool);
      });
    });

    it('should contain all expected asset tools', () => {
      const assetTools = [
        'asset_list',
        'asset_info', 
        'asset_import'
      ];
      
      assetTools.forEach(tool => {
        expect(TOOL_NAMES).toContain(tool);
      });
    });

    it('should contain all expected material tools', () => {
      const materialTools = [
        'material_list',
        'material_info',
        'material_create',
        'material_apply'
      ];
      
      materialTools.forEach(tool => {
        expect(TOOL_NAMES).toContain(tool);
      });
    });

    it('should contain all expected level tools', () => {
      const levelTools = [
        'level_actors',
        'level_save',
        'level_outliner'
      ];
      
      levelTools.forEach(tool => {
        expect(TOOL_NAMES).toContain(tool);
      });
    });

    it('should contain all expected viewport tools', () => {
      const viewportTools = [
        'viewport_screenshot',
        'viewport_camera',
        'viewport_mode',
        'viewport_focus',
        'viewport_render_mode',
        'viewport_bounds',
        'viewport_fit',
        'viewport_look_at'
      ];
      
      viewportTools.forEach(tool => {
        expect(TOOL_NAMES).toContain(tool);
      });
    });

    it('should contain all expected system tools', () => {
      const systemTools = [
        'project_info',
        'test_connection',
        'restart_listener',
        'ue_logs',
        'python_proxy',
        'help'
      ];
      
      systemTools.forEach(tool => {
        expect(TOOL_NAMES).toContain(tool);
      });
    });

    it('should have the expected total number of tools', () => {
      // This test ensures we're tracking the complete set of tools
      expect(TOOL_NAMES).toHaveLength(32);
    });

    it('should contain only unique tool names', () => {
      const uniqueTools = new Set(TOOL_NAMES);
      expect(uniqueTools.size).toBe(TOOL_NAMES.length);
    });

    it('should use consistent naming conventions', () => {
      TOOL_NAMES.forEach(toolName => {
        // All tool names should use snake_case
        expect(toolName).toMatch(/^[a-z]+(_[a-z]+)*$/);
        
        // No tool names should contain uppercase letters
        expect(toolName).toBe(toolName.toLowerCase());
      });
    });
  });

  describe('TOOL_CATEGORIES', () => {
    it('should contain all expected categories', () => {
      const expectedCategories = [
        'project',
        'level',
        'viewport', 
        'advanced',
        'help'
      ];
      
      expect(TOOL_CATEGORIES).toHaveLength(expectedCategories.length);
      expectedCategories.forEach(category => {
        expect(TOOL_CATEGORIES).toContain(category);
      });
    });

    it('should contain only unique categories', () => {
      const uniqueCategories = new Set(TOOL_CATEGORIES);
      expect(uniqueCategories.size).toBe(TOOL_CATEGORIES.length);
    });

    it('should use consistent naming conventions', () => {
      TOOL_CATEGORIES.forEach(category => {
        // All categories should be lowercase
        expect(category).toBe(category.toLowerCase());
        
        // Categories should not contain underscores (different from tool names)
        expect(category).not.toContain('_');
      });
    });
  });

  describe('TypeScript type definitions', () => {
    it('should provide ToolName type that includes all tools', () => {
      // This test ensures the type system is working correctly
      const testTool: ToolName = 'actor_spawn';
      expect(TOOL_NAMES).toContain(testTool);
      
      const anotherTool: ToolName = 'viewport_screenshot';
      expect(TOOL_NAMES).toContain(anotherTool);
    });

    it('should provide ToolCategory type that includes all categories', () => {
      const testCategory: ToolCategory = 'project';
      expect(TOOL_CATEGORIES).toContain(testCategory);
      
      const anotherCategory: ToolCategory = 'viewport';
      expect(TOOL_CATEGORIES).toContain(anotherCategory);
    });
  });

  describe('registry completeness', () => {
    it('should include tools for all major UEMCP functionality areas', () => {
      // Verify we have tools for each major functional area
      const functionalAreas = {
        'actor management': ['actor_spawn', 'actor_modify', 'actor_delete'],
        'level management': ['level_actors', 'level_save'],
        'viewport control': ['viewport_screenshot', 'viewport_camera'],
        'asset management': ['asset_list', 'asset_info'],
        'material management': ['material_list', 'material_create'],
        'system integration': ['test_connection', 'python_proxy', 'help']
      };
      
      Object.entries(functionalAreas).forEach(([, tools]) => {
        tools.forEach(tool => {
          expect(TOOL_NAMES).toContain(tool as ToolName);
        });
      });
    });

    it('should maintain consistency with expected MCP tool count', () => {
      // According to our current implementation, we should have 32 tools
      // This test helps ensure we don't accidentally miss tools when updating the registry
      expect(TOOL_NAMES).toHaveLength(32);
    });
  });

  describe('const assertions', () => {
    it('should maintain readonly arrays', () => {
      // Test that the arrays are properly typed as readonly tuples
      const toolCount = TOOL_NAMES.length;
      const categoryCount = TOOL_CATEGORIES.length;
      
      // These should be stable numbers
      expect(toolCount).toBe(32);
      expect(categoryCount).toBe(5);
    });
  });
});