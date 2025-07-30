import { BaseTool } from '../base/base-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter, ToolResponse } from '../../utils/response-formatter.js';

interface HelpArgs {
  tool?: string;
  category?: string;
}

/**
 * Tool for getting help information
 */
export class HelpTool extends BaseTool<HelpArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'help',
      description: 'Get comprehensive help, examples, coordinate system, workflows. START HERE! help({}) shows everything. help({ tool: "actor_spawn" }) for specific tools. help({ category: "viewport" }) for tool groups.',
      inputSchema: {
        type: 'object',
        properties: {
          tool: {
            type: 'string',
            description: 'Get detailed help for a specific tool',
            enum: [
              'project_info', 'asset_list', 'asset_info', 'actor_spawn', 'actor_duplicate',
              'actor_delete', 'actor_modify', 'actor_organize', 'level_actors', 'level_save',
              'level_outliner', 'viewport_screenshot', 'viewport_camera', 'viewport_mode',
              'viewport_focus', 'viewport_render_mode', 'viewport_bounds', 'viewport_fit',
              'viewport_look_at', 'python_proxy', 'test_connection', 'restart_listener',
              'ue_logs', 'help'
            ],
          },
          category: {
            type: 'string',
            description: 'List tools in a category',
            enum: ['project', 'level', 'viewport', 'advanced', 'help'],
          },
        },
      },
    };
  }

  protected async execute(args: HelpArgs): Promise<ToolResponse> {
    const result = await this.executePythonCommand('system.help', args);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get help information');
    }
    
    // Format the help response based on what was returned
    let text = '';
    
    if (result.tool) {
      // Specific tool help
      const help = result.help as { description?: string; parameters?: Record<string, unknown>; examples?: string[] };
      text = `# ${String(result.tool)}\n\n`;
      text += `${help.description || ''}\n\n`;
      
      if (help.parameters) {
        text += '## Parameters\n';
        Object.entries(help.parameters).forEach(([param, desc]) => {
          text += `- **${param}**: ${String(desc)}\n`;
        });
      }
      
      if (help.examples && Array.isArray(help.examples)) {
        text += '\n## Examples\n```javascript\n';
        text += help.examples.join('\n');
        text += '\n```';
      }
    } else if (result.category) {
      // Category listing
      text = `# ${String(result.category)} Tools\n\n`;
      if (result.tools && Array.isArray(result.tools)) {
        result.tools.forEach((tool: string) => {
          text += `- ${tool}\n`;
        });
      }
    } else if (result.overview) {
      // General help
      const overview = result.overview as {
        categories?: Record<string, string[]>;
        coordinate_system?: boolean;
        rotation?: boolean;
        stats?: { total_tools?: number; python_version?: string; };
      };
      text = '# UEMCP - Unreal Engine Model Context Protocol\n\n';
      
      if (overview.categories) {
        text += '## Categories\n';
        Object.entries(overview.categories).forEach(([cat, tools]) => {
          text += `• **${cat}**: ${tools.length} tools\n`;
        });
      }
      
      text += '\n\n# Common Workflows\n\n';
      text += '## Building a Scene\n';
      text += '1. List available assets: asset_list({ path: "/Game/ModularOldTown" })\n';
      text += '2. Spawn walls: actor_spawn({ assetPath: "/Game/ModularOldTown/Meshes/SM_Wall", ... })\n';
      text += '3. Duplicate for second floor: actor_duplicate({ sourceName: "Wall_01", offset: { z: 300 } })\n';
      text += '4. Organize: actor_organize({ actors: ["Wall_*"], folder: "Building/Walls" })\n';
      text += '5. Save: level_save({})\n';
      
      text += '\n## Debugging Actor Placement\n';
      text += '1. Take perspective shot: viewport_screenshot({})\n';
      text += '2. Switch to wireframe: viewport_render_mode({ mode: "wireframe" })\n';
      text += '3. Get top view: viewport_mode({ mode: "top" })\n';
      text += '4. Take another shot: viewport_screenshot({})\n';
      text += '5. Check positions: level_actors({ filter: "Wall" })\n';
      
      text += '\n## Camera Control\n';
      text += '- Top-down: viewport_camera({ rotation: { pitch: -90, yaw: 0, roll: 0 } })\n';
      text += '- Isometric: viewport_camera({ rotation: { pitch: -30, yaw: 45, roll: 0 } })\n';
      text += '- Focus target: viewport_focus({ actorName: "HouseFoundation" })\n';
      
      text += '\n## Python Proxy Power\n';
      text += 'When MCP tools aren\'t enough, python_proxy gives full access:\n';
      text += '- Batch operations on hundreds of actors\n';
      text += '- Custom asset analysis\n';
      text += '- Editor automation\n';
      text += '- Access to ANY Unreal Engine Python API\n';
      
      if (overview.coordinate_system) {
        text += '\n# Coordinate System & Rotations\n\n';
        text += '## UE Coordinate System (CRITICAL!)\n';
        text += '```\n';
        text += '        NORTH (X-)\n';
        text += '           ↑\n';
        text += 'EAST ←─────┼─────→ WEST  \n';
        text += '(Y-)       │      (Y+)\n';
        text += '           ↓\n';
        text += '        SOUTH (X+)\n';
        text += '```\n\n';
        
        text += '- **X- = NORTH**, X+ = SOUTH\n';
        text += '- **Y- = EAST**, Y+ = WEST\n';
        text += '- **Z+ = UP**\n';
      }
      
      if (overview.rotation) {
        text += '\n## Rotations [Roll, Pitch, Yaw]\n';
        text += '- **Roll**: Rotation around forward X axis (tilting sideways)\n';
        text += '- **Pitch**: Rotation around right Y axis (looking up/down)\n';
        text += '- **Yaw**: Rotation around up Z axis (turning left/right)\n';
      }
      
      text += '\n\n## Tips\n';
      text += '• Use `help({ tool: "actor_spawn" })` for specific tool examples\n';
      text += '• Use `help({ category: "viewport" })` to list tools in a category\n';
      text += '• `python_proxy` gives unlimited access to UE Python API\n';
      text += '• Most operations save 80%+ code compared to raw Python';
    }
    
    return ResponseFormatter.success(text);
  }
}

export const helpTool = new HelpTool().toMCPTool();
