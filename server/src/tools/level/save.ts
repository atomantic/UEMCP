import { LevelTool } from '../base/level-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

/**
 * Tool for saving the current level
 */
export class LevelSaveTool extends LevelTool {
  get definition(): ToolDefinition {
    return {
      name: 'level_save',
      description: 'Save the current level',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    };
  }

  protected async execute() {
    const result = await this.executePythonCommand(this.levelCommands.save, {});
    
    const levelName = result.levelName as string || 'current level';
    const saveTime = result.timestamp as string || new Date().toISOString();
    
    let text = `✓ Saved ${levelName}`;
    if (saveTime) {
      text += `\n  Time: ${saveTime}`;
    }
    
    return ResponseFormatter.success(text);
  }
}

export const levelSaveTool = new LevelSaveTool().toMCPTool();
