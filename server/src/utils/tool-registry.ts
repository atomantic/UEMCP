/**
 * Tool registry for maintaining tool metadata
 * Used to avoid hardcoded tool lists in help.ts
 */

/**
 * All available tool names - kept in sync with actual tool implementations
 * This is the single source of truth for tool names
 */
export const TOOL_NAMES = [
  // Actor tools
  'actor_spawn',
  'actor_duplicate',
  'actor_delete',
  'actor_modify', 
  'actor_organize',
  'actor_snap_to_socket',
  'batch_spawn',
  'placement_validate',
  // Asset tools
  'asset_list',
  'asset_info',
  'asset_import',
  // Material tools
  'material_list',
  'material_info',
  'material_create',
  'material_apply',
  // Level tools
  'level_actors',
  'level_save',
  'level_outliner',
  // Viewport tools
  'viewport_screenshot',
  'viewport_camera',
  'viewport_mode',
  'viewport_focus',
  'viewport_render_mode',
  'viewport_bounds',
  'viewport_fit',
  'viewport_look_at',
  // System tools
  'project_info',
  'test_connection',
  'restart_listener',
  'ue_logs',
  'python_proxy',
  'help',
] as const;

/**
 * Tool categories - used for help categorization
 */
export const TOOL_CATEGORIES = [
  'project',
  'level', 
  'viewport',
  'advanced',
  'help',
] as const;

/**
 * Type definitions for tool names and categories
 */
export type ToolName = typeof TOOL_NAMES[number];
export type ToolCategory = typeof TOOL_CATEGORIES[number];