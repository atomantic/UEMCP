// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { ProjectInfoTool } from '../../../src/tools/system/project-info.js';

describe('ProjectInfoTool', () => {
  let tool: ProjectInfoTool;

  beforeEach(() => {
    tool = new ProjectInfoTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('project_info');
      expect(definition.description).toContain('Get information about the current Unreal Engine project');
    });

    it('should have empty input schema', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      expect(schema.properties).toEqual({});
    });
  });

  describe('execute', () => {
    it('should get project information successfully', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        projectName: 'MyAwesomeGame',
        projectDirectory: '/Users/dev/Projects/MyAwesomeGame',
        engineVersion: '5.4.0',
        currentLevel: '/Game/Maps/MainMenu',
      });

      const result = await tool.toMCPTool().handler({});

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'project.info',
        params: {}
      });
      expect(result.content[0].text).toContain('Unreal Engine Project Information');
      expect(result.content[0].text).toContain('Project: MyAwesomeGame');
      expect(result.content[0].text).toContain('Directory: /Users/dev/Projects/MyAwesomeGame');
      expect(result.content[0].text).toContain('Engine Version: 5.4.0');
      expect(result.content[0].text).toContain('Current Level: /Game/Maps/MainMenu');
    });

    it('should handle unknown project information', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        projectName: null,
        projectDirectory: null,
        engineVersion: null,
        currentLevel: null,
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('Project: Unknown');
      expect(result.content[0].text).toContain('Directory: Unknown');
      expect(result.content[0].text).toContain('Engine Version: Unknown');
      expect(result.content[0].text).toContain('Current Level: Unknown');
    });

    it('should handle partial project information', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: true,
        projectName: 'TestProject',
        projectDirectory: '/path/to/project',
        engineVersion: undefined,
        currentLevel: '',
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('Project: TestProject');
      expect(result.content[0].text).toContain('Directory: /path/to/project');
      expect(result.content[0].text).toContain('Engine Version: Unknown');
      expect(result.content[0].text).toContain('Current Level: Unknown');
    });

    it('should throw error when project info retrieval fails', async () => {
      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Failed to access project information',
      });

      await expect(tool.toMCPTool().handler({})).rejects.toThrow(
        'Failed to access project information'
      );
    });

    it('should handle long project paths gracefully', async () => {
      const longPath = '/very/long/path/to/project/with/many/nested/directories/MyProject';
      
      mockExecuteCommand.mockResolvedValue({
        success: true,
        projectName: 'ComplexProject',
        projectDirectory: longPath,
        engineVersion: '5.4.1-hotfix',
        currentLevel: '/Game/Maps/Level_With_Very_Long_Name_That_Describes_The_Entire_Purpose',
      });

      const result = await tool.toMCPTool().handler({});

      expect(result.content[0].text).toContain('Project: ComplexProject');
      expect(result.content[0].text).toContain(longPath);
      expect(result.content[0].text).toContain('Engine Version: 5.4.1-hotfix');
    });
  });
});