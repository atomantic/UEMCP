import { HelpTool } from '../../../src/tools/system/help.js';
// Also test the barrel export - using underscore to avoid unused import warning  
import { helpTool as _helpTool } from '../../../src/tools/system/index.js';
import { TOOL_NAMES, TOOL_CATEGORIES } from '../../../src/utils/tool-registry.js';

// Mock tool registry constants
jest.mock('../../../src/utils/tool-registry.js', () => ({
  TOOL_NAMES: [
    'actor_spawn',
    'actor_delete',
    'actor_modify',
    'viewport_screenshot',
    'viewport_camera',
    'level_actors',
    'help',
  ],
  TOOL_CATEGORIES: [
    'project',
    'level', 
    'viewport',
    'advanced',
    'help'
  ],
}));

// Create a test class that exposes the protected methods
class TestHelpTool extends HelpTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testExecutePythonCommand = jest.fn();
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }
}

describe('HelpTool', () => {
  let helpTool: TestHelpTool;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    helpTool = new TestHelpTool();
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = helpTool.definition;
      
      expect(definition.name).toBe('help');
      expect(definition.description).toContain('Get comprehensive help');
      expect(definition.description).toContain('START HERE!');
      expect((definition.inputSchema as any).type).toBe('object');
      expect((definition.inputSchema as any).properties.tool).toBeDefined();
      expect((definition.inputSchema as any).properties.category).toBeDefined();
    });

    it('should include tool names in enum', () => {
      const definition = helpTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.tool.enum).toEqual(TOOL_NAMES);
      expect(properties.tool.enum).toContain('actor_spawn');
      expect(properties.tool.enum).toContain('viewport_screenshot');
    });

    it('should include categories in enum', () => {
      const definition = helpTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.category.enum).toEqual(TOOL_CATEGORIES);
      expect(properties.category.enum).toContain('viewport');
      expect(properties.category.enum).toContain('level');
    });
  });

  describe('execute', () => {
    it('should handle python command failure', async () => {
      helpTool.testExecutePythonCommand.mockResolvedValue({
        success: false,
        error: 'Help system error',
      });

      await expect(helpTool.testExecute({}))
        .rejects.toThrow('Help system error');

      expect(helpTool.testExecutePythonCommand).toHaveBeenCalledWith('system.help', {});
    });

    it('should handle python command failure without error message', async () => {
      helpTool.testExecutePythonCommand.mockResolvedValue({
        success: false,
      });

      await expect(helpTool.testExecute({}))
        .rejects.toThrow('Failed to get help information');
    });

    describe('specific tool help', () => {
      it('should format tool help with description and parameters', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          tool: 'actor_spawn',
          help: {
            description: 'Spawn an actor in the level.',
            parameters: {
              assetPath: 'Path to the asset to spawn',
              location: 'World location [X, Y, Z]',
              rotation: 'Rotation [Roll, Pitch, Yaw]',
            },
            examples: [
              'actor_spawn({ assetPath: "/Game/Meshes/Cube" })',
              'actor_spawn({ assetPath: "/Game/Wall", location: [1000, 500, 0] })',
            ],
          },
        });

        const result = await helpTool.testExecute({ tool: 'actor_spawn' });

        const text = result.content[0].text;
        expect(text).toContain('# actor_spawn');
        expect(text).toContain('Spawn an actor in the level.');
        expect(text).toContain('## Parameters');
        expect(text).toContain('- **assetPath**: Path to the asset to spawn');
        expect(text).toContain('- **location**: World location [X, Y, Z]');
        expect(text).toContain('- **rotation**: Rotation [Roll, Pitch, Yaw]');
        expect(text).toContain('## Examples');
        expect(text).toContain('```javascript');
        expect(text).toContain('actor_spawn({ assetPath: "/Game/Meshes/Cube" })');
        expect(text).toContain('actor_spawn({ assetPath: "/Game/Wall", location: [1000, 500, 0] })');
      });

      it('should handle tool help with minimal data', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          tool: 'test_tool',
          help: {},
        });

        const result = await helpTool.testExecute({ tool: 'test_tool' });

        const text = result.content[0].text;
        expect(text).toContain('# test_tool');
        expect(text).not.toContain('## Parameters');
        expect(text).not.toContain('## Examples');
      });

      it('should handle tool help without examples array', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          tool: 'test_tool',
          help: {
            description: 'Test tool description',
            examples: 'not an array', // Invalid examples
          },
        });

        const result = await helpTool.testExecute({ tool: 'test_tool' });

        const text = result.content[0].text;
        expect(text).toContain('# test_tool');
        expect(text).toContain('Test tool description');
        expect(text).not.toContain('## Examples');
      });

      it('should handle empty parameters object', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          tool: 'simple_tool',
          help: {
            description: 'Simple tool',
            parameters: {},
          },
        });

        const result = await helpTool.testExecute({ tool: 'simple_tool' });

        const text = result.content[0].text;
        expect(text).toContain('# simple_tool');
        expect(text).toContain('Simple tool');
        expect(text).toContain('## Parameters');
        // Should not contain any parameter lines since object is empty
      });
    });

    describe('category help', () => {
      it('should format category help with tool list', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          category: 'viewport',
          tools: [
            'viewport_screenshot',
            'viewport_camera',
            'viewport_bounds',
            'viewport_focus',
          ],
        });

        const result = await helpTool.testExecute({ category: 'viewport' });

        const text = result.content[0].text;
        expect(text).toContain('# viewport Tools');
        expect(text).toContain('- viewport_screenshot');
        expect(text).toContain('- viewport_camera');
        expect(text).toContain('- viewport_bounds');
        expect(text).toContain('- viewport_focus');
      });

      it('should handle category help without tools', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          category: 'empty_category',
        });

        const result = await helpTool.testExecute({ category: 'empty_category' });

        const text = result.content[0].text;
        expect(text).toContain('# empty_category Tools');
        expect(text).not.toContain('- ');
      });

      it('should handle category help with invalid tools array', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          category: 'test_category',
          tools: 'not an array',
        });

        const result = await helpTool.testExecute({ category: 'test_category' });

        const text = result.content[0].text;
        expect(text).toContain('# test_category Tools');
        expect(text).not.toContain('- ');
      });
    });

    describe('general overview help', () => {
      it('should format complete overview with all sections', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          overview: {
            categories: {
              'level': ['level_actors', 'level_save'],
              'viewport': ['viewport_screenshot', 'viewport_camera'],
              'system': ['help', 'undo', 'redo'],
            },
            coordinate_system: true,
            rotation: true,
            stats: {
              total_tools: 25,
              python_version: '3.11.0',
            },
          },
        });

        const result = await helpTool.testExecute({});

        const text = result.content[0].text;
        
        // Should contain main title
        expect(text).toContain('# UEMCP - Unreal Engine Model Context Protocol');
        
        // Should contain categories section
        expect(text).toContain('## Categories');
        expect(text).toContain('• **level**: 2 tools');
        expect(text).toContain('• **viewport**: 2 tools');
        expect(text).toContain('• **system**: 3 tools');
        
        // Should contain workflow sections
        expect(text).toContain('# Common Workflows');
        expect(text).toContain('## Building a Scene');
        expect(text).toContain('asset_list({ path: "/Game/ModularOldTown" })');
        expect(text).toContain('actor_spawn({ assetPath: "/Game/ModularOldTown/Meshes/SM_Wall"');
        expect(text).toContain('actor_duplicate({ sourceName: "Wall_01", offset: { z: 300 } })');
        expect(text).toContain('actor_organize({ actors: ["Wall_*"], folder: "Building/Walls" })');
        expect(text).toContain('level_save({})');
        
        // Should contain debugging section
        expect(text).toContain('## Debugging Actor Placement');
        expect(text).toContain('viewport_screenshot({})');
        expect(text).toContain('viewport_render_mode({ mode: "wireframe" })');
        expect(text).toContain('viewport_mode({ mode: "top" })');
        expect(text).toContain('level_actors({ filter: "Wall" })');
        
        // Should contain camera control
        expect(text).toContain('## Camera Control');
        expect(text).toContain('Top-down: viewport_camera({ rotation: { pitch: -90, yaw: 0, roll: 0 } })');
        expect(text).toContain('Isometric: viewport_camera({ rotation: { pitch: -30, yaw: 45, roll: 0 } })');
        expect(text).toContain('Focus target: viewport_focus({ actorName: "HouseFoundation" })');
        
        // Should contain python proxy section
        expect(text).toContain('## Python Proxy Power');
        expect(text).toContain('When MCP tools aren\'t enough, python_proxy gives full access:');
        expect(text).toContain('- Batch operations on hundreds of actors');
        expect(text).toContain('- Custom asset analysis');
        expect(text).toContain('- Editor automation');
        expect(text).toContain('- Access to ANY Unreal Engine Python API');
        
        // Should contain coordinate system
        expect(text).toContain('# Coordinate System & Rotations');
        expect(text).toContain('## UE Coordinate System (CRITICAL!)');
        expect(text).toContain('NORTH (X-)');
        expect(text).toContain('SOUTH (X+)');
        expect(text).toContain('EAST');
        expect(text).toContain('WEST');
        expect(text).toContain('- **X- = NORTH**, X+ = SOUTH');
        expect(text).toContain('- **Y- = EAST**, Y+ = WEST');
        expect(text).toContain('- **Z+ = UP**');
        
        // Should contain rotation info
        expect(text).toContain('## Rotations [Roll, Pitch, Yaw]');
        expect(text).toContain('- **Roll**: Rotation around forward X axis (tilting sideways)');
        expect(text).toContain('- **Pitch**: Rotation around right Y axis (looking up/down)');
        expect(text).toContain('- **Yaw**: Rotation around up Z axis (turning left/right)');
        
        // Should contain tips section
        expect(text).toContain('## Tips');
        expect(text).toContain('• Use `help({ tool: "actor_spawn" })` for specific tool examples');
        expect(text).toContain('• Use `help({ category: "viewport" })` to list tools in a category');
        expect(text).toContain('• `python_proxy` gives unlimited access to UE Python API');
        expect(text).toContain('• Most operations save 80%+ code compared to raw Python');
      });

      it('should handle overview without categories', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          overview: {
            coordinate_system: false,
            rotation: false,
          },
        });

        const result = await helpTool.testExecute({});

        const text = result.content[0].text;
        expect(text).toContain('# UEMCP - Unreal Engine Model Context Protocol');
        expect(text).not.toContain('## Categories');
        expect(text).not.toContain('# Coordinate System & Rotations');
        expect(text).not.toContain('## Rotations [Roll, Pitch, Yaw]');
        expect(text).toContain('## Tips');
      });

      it('should handle overview with coordinate_system but no rotation', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          overview: {
            coordinate_system: true,
            rotation: false,
          },
        });

        const result = await helpTool.testExecute({});

        const text = result.content[0].text;
        expect(text).toContain('# Coordinate System & Rotations');
        expect(text).toContain('## UE Coordinate System (CRITICAL!)');
        expect(text).toContain('NORTH (X-)');
        expect(text).not.toContain('## Rotations [Roll, Pitch, Yaw]');
      });

      it('should handle overview with rotation but no coordinate_system', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          overview: {
            coordinate_system: false,
            rotation: true,
          },
        });

        const result = await helpTool.testExecute({});

        const text = result.content[0].text;
        expect(text).not.toContain('# Coordinate System & Rotations');
        expect(text).not.toContain('## UE Coordinate System (CRITICAL!)');
        expect(text).toContain('## Rotations [Roll, Pitch, Yaw]');
        expect(text).toContain('- **Roll**: Rotation around forward X axis');
      });

      it('should handle minimal overview', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          overview: {},
        });

        const result = await helpTool.testExecute({});

        const text = result.content[0].text;
        expect(text).toContain('# UEMCP - Unreal Engine Model Context Protocol');
        expect(text).toContain('# Common Workflows');
        expect(text).toContain('## Tips');
        expect(text).not.toContain('## Categories');
        expect(text).not.toContain('# Coordinate System & Rotations');
      });

      it('should handle empty categories object', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          overview: {
            categories: {},
          },
        });

        const result = await helpTool.testExecute({});

        const text = result.content[0].text;
        expect(text).toContain('## Categories');
        // Should not contain any category lines since object is empty
        expect(text).not.toMatch(/• \*\*.*\*\*: \d+ tools/);
      });
    });

    describe('edge cases', () => {
      it('should handle response without recognized format', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          // No tool, category, or overview
        });

        const result = await helpTool.testExecute({});

        const text = result.content[0].text;
        // Should return empty string when no recognized format
        expect(text).toBe('');
      });

      it('should handle complex argument combinations', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          tool: 'test_tool',
          help: {
            description: 'Test tool',
          },
        });

        const result = await helpTool.testExecute({ 
          tool: 'test_tool',
          category: 'viewport' // Both provided, but tool takes precedence
        });

        const text = result.content[0].text;
        expect(text).toContain('# test_tool');
        expect(helpTool.testExecutePythonCommand).toHaveBeenCalledWith('system.help', {
          tool: 'test_tool',
          category: 'viewport',
        });
      });

      it('should handle non-string parameter values in tool help', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          tool: 'test_tool',
          help: {
            parameters: {
              count: 123,
              enabled: true,
              data: { complex: 'object' },
              array: [1, 2, 3],
            },
          },
        });

        const result = await helpTool.testExecute({ tool: 'test_tool' });

        const text = result.content[0].text;
        expect(text).toContain('- **count**: 123');
        expect(text).toContain('- **enabled**: true');
        expect(text).toContain('- **data**: [object Object]');
        expect(text).toContain('- **array**: 1,2,3');
      });

      it('should handle non-string tool and category names', async () => {
        helpTool.testExecutePythonCommand.mockResolvedValue({
          success: true,
          tool: 123, // Non-string tool name
          help: {
            description: 'Numeric tool',
          },
        });

        const result = await helpTool.testExecute({ tool: 'numeric_tool' });

        const text = result.content[0].text;
        expect(text).toContain('# 123');
      });
    });
  });

  describe('barrel export', () => {
    it('should export helpTool from index', () => {
      expect(_helpTool).toBeDefined();
      expect(_helpTool.definition.name).toBe('help');
    });
  });
});