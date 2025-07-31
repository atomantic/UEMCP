import { LevelTool, OutlinerNode } from '../base/level-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter, ToolResponse } from '../../utils/response-formatter.js';

interface LevelOutlinerArgs {
  showEmpty?: boolean;
  maxDepth?: number;
}

/**
 * Tool for getting World Outliner structure
 */
export class LevelOutlinerTool extends LevelTool<LevelOutlinerArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'level_outliner',
      description: 'Get the World Outliner folder structure and actor organization',
      inputSchema: {
        type: 'object',
        properties: {
          showEmpty: {
            type: 'boolean',
            description: 'Show empty folders',
            default: false,
          },
          maxDepth: {
            type: 'number',
            description: 'Maximum folder depth to display',
            default: 10,
          },
        },
      },
    };
  }

  protected async execute(args: LevelOutlinerArgs): Promise<ToolResponse> {
    const result = await this.executePythonCommand(this.levelCommands.outliner, args);
    
    const text = this.formatOutlinerStructure({
      root: result.root as { children?: OutlinerNode[] },
      totalFolders: result.totalFolders as number,
      totalActors: result.totalActors as number,
    });
    return ResponseFormatter.success(text);
  }
}

export const levelOutlinerTool = new LevelOutlinerTool().toMCPTool();
