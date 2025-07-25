import { logger } from '../utils/logger.js';
import { MockUnrealEngine } from '../mocks/unreal-engine.js';

interface ProjectCreateArgs {
  projectName: string;
  projectPath: string;
  engineVersion?: string;
  template?: string;
}

const mockEngine = new MockUnrealEngine();

export const projectCreateTool = {
  definition: {
    name: 'project_create',
    description: 'Create a new Unreal Engine project',
    inputSchema: {
      type: 'object',
      properties: {
        projectName: {
          type: 'string',
          description: 'Name of the project',
        },
        projectPath: {
          type: 'string',
          description: 'Path where the project will be created',
        },
        engineVersion: {
          type: 'string',
          description: 'Unreal Engine version (default: 5.3)',
          default: '5.3',
        },
        template: {
          type: 'string',
          description: 'Project template to use',
          enum: ['Blank', 'FirstPerson', 'ThirdPerson', 'VR', 'TopDown'],
          default: 'Blank',
        },
      },
      required: ['projectName', 'projectPath'],
    },
  },
  handler: async (args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> => {
    const { projectName, projectPath, engineVersion = '5.3', template = 'Blank' } = args as ProjectCreateArgs;
    
    logger.debug('Creating project', { projectName, projectPath, engineVersion, template });
    
    try {
      const result = mockEngine.createProject({
        projectName,
        projectPath,
        engineVersion,
        template,
      });
      
      return {
        content: [
          {
            type: 'text',
            text: `Successfully created project "${projectName}" at ${result.fullPath}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create project: ${errorMessage}`);
    }
  },
};