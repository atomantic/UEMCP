import { BaseTool } from '../base/base-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter, ToolResponse } from '../../utils/response-formatter.js';

/**
 * Tool for getting project information
 */
export class ProjectInfoTool extends BaseTool {
  get definition(): ToolDefinition {
    return {
      name: 'project_info',
      description: 'Get information about the current Unreal Engine project',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };
  }

  protected async execute(): Promise<ToolResponse> {
    const result = await this.executePythonCommand('project.info', {});
    
    let text = 'Unreal Engine Project Information\n\n';
    text += `Project: ${(result.projectName as string) || 'Unknown'}\n`;
    text += `Directory: ${(result.projectDirectory as string) || 'Unknown'}\n`;
    text += `Engine Version: ${(result.engineVersion as string) || 'Unknown'}\n`;
    text += `Current Level: ${(result.currentLevel as string) || 'Unknown'}`;
    
    return ResponseFormatter.success(text);
  }
}

export const projectInfoTool = new ProjectInfoTool().toMCPTool();
