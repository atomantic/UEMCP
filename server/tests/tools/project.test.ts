import { projectCreateTool } from '../../src/tools/project';
import { MockUnrealEngine } from '../../src/mocks/unreal-engine';

describe('project.create tool', () => {
  let mockEngine: MockUnrealEngine;

  beforeEach(() => {
    mockEngine = new MockUnrealEngine();
  });

  afterEach(() => {
    mockEngine.clearProjects();
  });

  it('should have correct definition', () => {
    expect(projectCreateTool.definition.name).toBe('project.create');
    expect(projectCreateTool.definition.description).toBe('Create a new Unreal Engine project');
    expect(projectCreateTool.definition.inputSchema.required).toContain('projectName');
    expect(projectCreateTool.definition.inputSchema.required).toContain('projectPath');
  });

  it('should create a project with default values', async () => {
    const args = {
      projectName: 'TestProject',
      projectPath: '/tmp/projects',
    };

    const result = await projectCreateTool.handler(args);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Successfully created project "TestProject"');
    expect(result.content[0].text).toContain('/tmp/projects/TestProject');
  });

  it('should create a project with custom template and version', async () => {
    const args = {
      projectName: 'VRProject',
      projectPath: '/tmp/projects',
      engineVersion: '5.4',
      template: 'VR',
    };

    const result = await projectCreateTool.handler(args);

    expect(result.content[0].text).toContain('Successfully created project "VRProject"');
  });

  it('should handle invalid project names', async () => {
    const args = {
      projectName: '123Invalid',
      projectPath: '/tmp/projects',
    };

    await expect(projectCreateTool.handler(args)).rejects.toThrow(
      'Project name must start with a letter'
    );
  });

  it('should handle special characters in project names', async () => {
    const args = {
      projectName: 'Project-Name',
      projectPath: '/tmp/projects',
    };

    await expect(projectCreateTool.handler(args)).rejects.toThrow(
      'Project name must start with a letter'
    );
  });
});