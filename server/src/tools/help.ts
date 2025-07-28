import { logger } from '../utils/logger.js';

interface HelpParams {
  tool?: string;
  category?: string;
}

const toolCategories = {
  'project': ['project_info', 'asset_list', 'asset_info'],
  'level': ['actor_spawn', 'actor_duplicate', 'actor_delete', 'actor_modify', 'actor_organize', 'level_actors', 'level_save', 'level_outliner'],
  'viewport': ['viewport_screenshot', 'viewport_camera', 'viewport_mode', 'viewport_focus', 'viewport_render_mode'],
  'advanced': ['python_proxy', 'test_connection', 'restart_listener', 'ue_logs'],
  'help': ['help']
};

const toolExamples: Record<string, string[]> = {
  'project_info': [
    'Get current project information',
    'Shows project name, path, and engine version'
  ],
  'asset_list': [
    'List all assets: asset_list({})',
    'Filter by path: asset_list({ path: "/Game/ModularOldTown" })',
    'Filter by class: asset_list({ class: "StaticMesh" })',
    'Search by name: asset_list({ name: "Wall" })'
  ],
  'asset_info': [
    'Get mesh dimensions: asset_info({ path: "/Game/Meshes/Cube" })',
    'Shows bounding box, materials, and other properties'
  ],
  'actor_spawn': [
    'Spawn at origin: actor_spawn({ assetPath: "/Game/Meshes/Cube" })',
    'Spawn with transform: actor_spawn({ assetPath: "/Game/Meshes/Wall", location: { x: 1000, y: 500, z: 0 }, rotation: { roll: 0, pitch: 0, yaw: 90 } })',
    'Spawn in folder: actor_spawn({ assetPath: "/Game/BP_Door", name: "MainDoor", folder: "Building/Doors" })'
  ],
  'actor_duplicate': [
    'Simple duplicate: actor_duplicate({ sourceName: "Wall_01" })',
    'Duplicate with offset: actor_duplicate({ sourceName: "Floor_01", name: "Floor_02", offset: { x: 0, y: 0, z: 300 } })',
    'Duplicate with new name: actor_duplicate({ sourceName: "Corner_F1", name: "Corner_F2" })'
  ],
  'actor_delete': [
    'Delete single actor: actor_delete({ name: "Cube_01" })',
    'Delete by exact name match'
  ],
  'actor_modify': [
    'Move actor: actor_modify({ name: "Door", location: { x: 100, y: 200, z: 0 } })',
    'Rotate actor: actor_modify({ name: "Wall", rotation: { yaw: 90 } })',
    'Scale actor: actor_modify({ name: "Cube", scale: { x: 2, y: 2, z: 2 } })',
    'Move to folder: actor_modify({ name: "Light", folder: "Lighting/Interior" })'
  ],
  'actor_organize': [
    'Move to folder: actor_organize({ actors: ["Wall_01", "Wall_02"], folder: "Building/Walls" })',
    'Organize multiple actors at once'
  ],
  'level_actors': [
    'List all actors: level_actors({})',
    'Filter by name: level_actors({ filter: "Wall" })',
    'Filter by class: level_actors({ filter: "Light" })',
    'Returns name, class, location, rotation, scale, and asset path'
  ],
  'level_save': [
    'Save current level: level_save({})',
    'Saves all changes to disk'
  ],
  'level_outliner': [
    'Get folder structure: level_outliner({})',
    'Shows World Outliner hierarchy with all folders and actors'
  ],
  'viewport_screenshot': [
    'Quick screenshot: viewport_screenshot({})',
    'High quality: viewport_screenshot({ width: 1920, height: 1080, quality: 90, compress: false })',
    'Small debug shot: viewport_screenshot({ width: 640, height: 360, screenPercentage: 50 })'
  ],
  'viewport_camera': [
    'Set position: viewport_camera({ location: { x: 1000, y: 1000, z: 500 } })',
    'Set view angle: viewport_camera({ rotation: { pitch: -30, yaw: 45, roll: 0 } })',
    'Top-down view: viewport_camera({ location: { x: 0, y: 0, z: 2000 }, rotation: { pitch: -90, yaw: 0, roll: 0 } })'
  ],
  'viewport_mode': [
    'Top view: viewport_mode({ mode: "top" })',
    'Front view: viewport_mode({ mode: "front" })',
    'Perspective: viewport_mode({ mode: "perspective" })',
    'Note: Positions camera for orthographic-style views'
  ],
  'viewport_focus': [
    'Focus on actor: viewport_focus({ actorName: "PlayerStart" })',
    'Focus preserving view: viewport_focus({ actorName: "House", preserveRotation: true })'
  ],
  'viewport_render_mode': [
    'Wireframe: viewport_render_mode({ mode: "wireframe" })',
    'Unlit: viewport_render_mode({ mode: "unlit" })',
    'Lit (default): viewport_render_mode({ mode: "lit" })',
    'Other modes: detail_lighting, lighting_only, light_complexity, shader_complexity'
  ],
  'python_proxy': [
    'Execute any Python: python_proxy({ code: "import unreal\\nprint(unreal.EditorLevelLibrary.get_all_level_actors())" })',
    'Full UE API access: python_proxy({ code: "actors = unreal.EditorLevelLibrary.get_selected_level_actors()" })',
    'Complex automation possible - see python_proxy comparison docs'
  ],
  'test_connection': [
    'Test connection: test_connection({})',
    'Verifies Python listener is running in UE'
  ],
  'restart_listener': [
    'Restart listener: restart_listener({})',
    'Hot reload Python changes without restarting UE'
  ],
  'ue_logs': [
    'Get recent logs: ue_logs({})',
    'Get more lines: ue_logs({ lines: 100 })',
    'Reads from UE console output log file'
  ],
  'help': [
    'List all tools: help({})',
    'Get tool help: help({ tool: "actor_spawn" })',
    'List category: help({ category: "viewport" })',
    'Complete guide with coordinate system, rotations, troubleshooting'
  ]
};

const commonWorkflows = `
# Common Workflows

## Building a Scene
1. List available assets: asset_list({ path: "/Game/ModularOldTown" })
2. Spawn walls: actor_spawn({ assetPath: "/Game/ModularOldTown/Meshes/SM_Wall", ... })
3. Duplicate for second floor: actor_duplicate({ sourceName: "Wall_01", offset: { z: 300 } })
4. Organize: actor_organize({ actors: ["Wall_*"], folder: "Building/Walls" })
5. Save: level_save({})

## Debugging Actor Placement
1. Take perspective shot: viewport_screenshot({})
2. Switch to wireframe: viewport_render_mode({ mode: "wireframe" })
3. Get top view: viewport_mode({ mode: "top" })
4. Take another shot: viewport_screenshot({})
5. Check positions: level_actors({ filter: "Wall" })

## Camera Control
- Top-down: viewport_camera({ rotation: { pitch: -90, yaw: 0, roll: 0 } })
- Isometric: viewport_camera({ rotation: { pitch: -30, yaw: 45, roll: 0 } })
- Focus target: viewport_focus({ actorName: "HouseFoundation" })

## Python Proxy Power
When MCP tools aren't enough, python_proxy gives full access:
- Batch operations on hundreds of actors
- Custom asset analysis
- Editor automation
- Access to ANY Unreal Engine Python API

# Coordinate System & Rotations

## UE Coordinate System (CRITICAL!)
\`\`\`
        NORTH (X-)
           ↑
EAST ←─────┼─────→ WEST  
(Y-)       │      (Y+)
           ↓
        SOUTH (X+)
\`\`\`

- **X- = NORTH**, X+ = SOUTH
- **Y- = EAST**, Y+ = WEST
- **Z+ = UP**

## Cardinal Directions
- **NW**: X- Y+ (Northwest)
- **NE**: X- Y- (Northeast)  
- **SE**: X+ Y- (Southeast)
- **SW**: X+ Y+ (Southwest)

## Rotations [Roll, Pitch, Yaw]
- **Roll**: Rotation around forward X axis (tilting sideways)
- **Pitch**: Rotation around right Y axis (looking up/down)
- **Yaw**: Rotation around up Z axis (turning left/right)

## Corner Piece Rotations (Sharp Angle Out)
- **NW**: Yaw = 180°
- **NE**: Yaw = -90°
- **SE**: Yaw = 0°
- **SW**: Yaw = 90°

## Common Asset Sizes
- Corner: 100×100×282
- Wall 3m: 300×100×282
- Wall 2m: 200×100×282
- Floor: 100×100×7

# Python Console Helpers

\`\`\`python
# Import helpers
from uemcp_helpers import *

# Restart listener (hot reload)
restart_listener()

# Check status
status()

# Save level
import unreal
unreal.EditorLevelLibrary.save_current_level()
\`\`\`

# Troubleshooting

## Connection Issues
1. Check if listener is running: status()
2. Restart if needed: restart_listener()
3. Verify port 8765 is not blocked

## Placement Issues
- **Gaps**: Check center pivots and exact grid alignment
- **Wrong rotations**: Verify corner sharp angles point outward
- **Missing actors**: Use level_actors() to list all

## Visual Verification
1. Use wireframe mode to see gaps clearly
2. Take screenshots from multiple angles
3. Focus viewport on specific actors to inspect

# Tips
- Assets use CENTER pivots (not corner)
- Use wireframe for debugging alignment
- Keep Roll at 0 (no horizon tilt)
- Save level frequently
- Name actors descriptively (e.g., Corner_F1_NW)
`;

export const helpTool = {
  definition: {
    name: 'help',
    description: 'Get comprehensive help, examples, coordinate system, workflows. START HERE! help({}) shows everything. help({ tool: "actor_spawn" }) for specific tools. help({ category: "viewport" }) for tool groups.',
    inputSchema: {
      type: 'object',
      properties: {
        tool: {
          type: 'string',
          description: 'Get detailed help for a specific tool',
          enum: Object.keys(toolExamples)
        },
        category: {
          type: 'string',
          description: 'List tools in a category',
          enum: Object.keys(toolCategories)
        }
      }
    }
  },
  handler: async (params: unknown) => {
    const { tool, category } = params as HelpParams;
    
    try {
      // Specific tool help
      if (tool) {
        const examples = toolExamples[tool];
        if (!examples) {
          return {
            content: [{
              type: 'text',
              text: `Unknown tool: ${tool}`
            }],
            isError: true
          };
        }
        
        // Find category
        let toolCategory = 'unknown';
        for (const [cat, tools] of Object.entries(toolCategories)) {
          if (tools.includes(tool)) {
            toolCategory = cat;
            break;
          }
        }
        
        const helpText = [
          `**Tool**: ${tool}`,
          `**Category**: ${toolCategory}`,
          '',
          '**Examples**:',
          examples.join('\n'),
          '',
          tool === 'python_proxy' 
            ? '💡 **Tip**: python_proxy can do EVERYTHING - it has full access to unreal module and UE Python API'
            : `💡 **Tip**: Use help({}) to see all tools or help({ category: "${toolCategory}" }) for related tools`
        ].join('\n');
        
        return {
          content: [{
            type: 'text',
            text: helpText
          }]
        };
      }
      
      // Category listing
      if (category) {
        const tools = toolCategories[category as keyof typeof toolCategories];
        if (!tools) {
          return {
            content: [{
              type: 'text',
              text: `Unknown category: ${category}`
            }],
            isError: true
          };
        }
        
        const toolDescriptions = tools.map(t => {
          const examples = toolExamples[t];
          return `• **${t}**: ${examples ? examples[0] : 'No description'}`;
        });
        
        const helpText = [
          `**Category**: ${category}`,
          '',
          '**Tools**:',
          toolDescriptions.join('\n'),
          '',
          '💡 **Tip**: Use help({ tool: "toolname" }) for detailed examples'
        ].join('\n');
        
        return {
          content: [{
            type: 'text',
            text: helpText
          }]
        };
      }
      
      // Default: show all categories and workflows
      const categoryList = Object.entries(toolCategories).map(([cat, tools]) => 
        `• **${cat}**: ${tools.length} tools`
      ).join('\n');
      
      const helpText = [
        '# UEMCP - Unreal Engine Model Context Protocol',
        '',
        '## Categories',
        categoryList,
        '',
        commonWorkflows,
        '',
        '## Tips',
        '• Use `help({ tool: "actor_spawn" })` for specific tool examples',
        '• Use `help({ category: "viewport" })` to list tools in a category',
        '• `python_proxy` gives unlimited access to UE Python API',
        '• Most operations save 80%+ code compared to raw Python'
      ].join('\n');
      
      return {
        content: [{
          type: 'text',
          text: helpText
        }]
      };
      
    } catch (error) {
      logger.error('Help tool error', { error });
      return {
        content: [{
          type: 'text',
          text: error instanceof Error ? error.message : 'Unknown error'
        }],
        isError: true
      };
    }
  }
};