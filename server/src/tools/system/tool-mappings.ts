/**
 * Centralized mapping of MCP tool names to Python commands
 * Used by undo/redo operations to re-execute commands
 */
export const TOOL_TO_PYTHON_MAPPING: Record<string, string> = {
  'actor_spawn': 'actor.spawn',
  'actor_delete': 'actor.delete',
  'actor_modify': 'actor.modify',
  'actor_duplicate': 'actor.duplicate',
  'actor_organize': 'actor.organize',
  'batch_spawn': 'actor.batch_spawn',
  'placement_validate': 'actor.placement_validate',
  'actor_snap_to_socket': 'actor.snap_to_socket',
  'material_apply': 'material.apply',
  'material_create': 'material.create',
  'material_list': 'material.list',
  'material_info': 'material.info',
  'blueprint_create': 'blueprint.create',
  'blueprint_get_info': 'blueprint.get_info',
  // Add more mappings as new tools are added
};

/**
 * Get the Python command for a given tool name
 */
export function getPythonCommand(toolName: string): string | undefined {
  return TOOL_TO_PYTHON_MAPPING[toolName];
}