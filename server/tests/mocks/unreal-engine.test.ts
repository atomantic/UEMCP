import { MockUnrealEngine } from '../../src/mocks/unreal-engine';

describe('MockUnrealEngine', () => {
  let mockEngine: MockUnrealEngine;

  beforeEach(() => {
    mockEngine = new MockUnrealEngine();
  });

  afterEach(() => {
    mockEngine.clearProjects();
  });

  describe('createProject', () => {
    it('should create a project with valid configuration', async () => {
      const config = {
        projectName: 'TestProject',
        projectPath: '/tmp/projects',
        engineVersion: '5.3',
        template: 'Blank',
      };

      const result = await mockEngine.createProject(config);

      expect(result.projectName).toBe('TestProject');
      expect(result.fullPath).toBe('/tmp/projects/TestProject');
      expect(result.projectFile).toBe('/tmp/projects/TestProject/TestProject.uproject');
      expect(result.engineVersion).toBe('5.3');
    });

    it('should reject invalid project names starting with number', async () => {
      const config = {
        projectName: '123Project',
        projectPath: '/tmp/projects',
        engineVersion: '5.3',
        template: 'Blank',
      };

      await expect(mockEngine.createProject(config)).rejects.toThrow(
        'Project name must start with a letter'
      );
    });

    it('should reject project names with special characters', async () => {
      const config = {
        projectName: 'Project-Name',
        projectPath: '/tmp/projects',
        engineVersion: '5.3',
        template: 'Blank',
      };

      await expect(mockEngine.createProject(config)).rejects.toThrow(
        'Project name must start with a letter'
      );
    });

    it('should store created projects', async () => {
      const config = {
        projectName: 'StoredProject',
        projectPath: '/tmp/projects',
        engineVersion: '5.3',
        template: 'Blank',
      };

      await mockEngine.createProject(config);
      const stored = mockEngine.getProject('StoredProject');

      expect(stored).toBeDefined();
      expect(stored?.projectName).toBe('StoredProject');
    });
  });

  describe('listProjects', () => {
    it('should return empty array initially', async () => {
      const projects = await mockEngine.listProjects();
      expect(projects).toHaveLength(0);
    });

    it('should return all created projects', async () => {
      await mockEngine.createProject({
        projectName: 'Project1',
        projectPath: '/tmp',
        engineVersion: '5.3',
        template: 'Blank',
      });

      await mockEngine.createProject({
        projectName: 'Project2',
        projectPath: '/tmp',
        engineVersion: '5.4',
        template: 'VR',
      });

      const projects = await mockEngine.listProjects();
      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.projectName)).toContain('Project1');
      expect(projects.map(p => p.projectName)).toContain('Project2');
    });
  });

  describe('openProject', () => {
    it('should not throw when opening a project', async () => {
      await expect(mockEngine.openProject('/tmp/project')).resolves.not.toThrow();
    });
  });
});