import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

interface UeLogsArgs {
  lines?: number;
  project?: string;
}

export const ueLogsTool = {
  definition: {
    name: 'ue_logs',
    description: 'Fetch recent lines from the Unreal Engine console log file. Useful for debugging issues when MCP commands report failure but may have succeeded.',
    inputSchema: {
      type: 'object',
      properties: {
        lines: {
          type: 'number',
          description: 'Number of lines to read from the end of the log (default: 100)',
          default: 100
        },
        project: {
          type: 'string',
          description: 'Project name (default: Home)',
          default: 'Home'
        }
      },
      required: []
    }
  },
  handler: async ({ lines = 100, project = 'Home' }: UeLogsArgs): Promise<{ content: Array<{ type: string; text: string }> }> => {
    try {
      const homeDir = os.homedir();
      const logPath = path.join(homeDir, 'Library', 'Logs', 'Unreal Engine', `${project}Editor`, `${project}.log`);
      
      // Check if file exists
      try {
        await fs.access(logPath);
      } catch {
        return {
          content: [{
            type: 'text',
            text: `Log file not found at: ${logPath}`
          }]
        };
      }
      
      // Read the file
      const content = await fs.readFile(logPath, 'utf-8');
      const allLines = content.split('\n');
      
      // Get the last N lines
      const recentLines = allLines.slice(-lines).join('\n');
      
      return {
        content: [{
          type: 'text',
          text: `📜 UE Console Log (last ${lines} lines from ${project}.log):\n\n${recentLines}`
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error reading UE log: ${error instanceof Error ? error.message : String(error)}`
        }]
      };
    }
  }
};