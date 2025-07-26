import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

interface OutlinerArgs {
  showEmpty?: boolean;
  maxDepth?: number;
}

export const levelOutlinerTool = {
  definition: {
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
      required: [],
    },
  },
  handler: async (args: unknown = {}): Promise<{ content: Array<{ type: string; text: string }> }> => {
    const { showEmpty = false, maxDepth = 10 } = args as OutlinerArgs;
    
    logger.debug('Getting World Outliner structure', { showEmpty, maxDepth });
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'level.outliner',
        params: { showEmpty, maxDepth }
      });
      
      if (result.success && result.outliner) {
        const outliner = result.outliner as any;
        const { folders, unorganized, stats } = outliner;
        
        let text = '📁 World Outliner Structure\n';
        text += '========================\n\n';
        
        // Display folder tree
        if (folders && Object.keys(folders).length > 0) {
          text += '📂 Folder Hierarchy:\n';
          text += formatFolderTree(folders, '', maxDepth);
          text += '\n';
        }
        
        // Display unorganized actors
        if (unorganized && unorganized.length > 0) {
          text += `📄 Unorganized Actors (${unorganized.length}):\n`;
          unorganized.slice(0, 20).forEach((actor: string) => {
            text += `  • ${actor}\n`;
          });
          if (unorganized.length > 20) {
            text += `  ... and ${unorganized.length - 20} more\n`;
          }
          text += '\n';
        }
        
        // Display statistics
        if (stats) {
          text += '📊 Statistics:\n';
          text += `  Total Actors: ${stats.totalActors || 0}\n`;
          text += `  Organized: ${stats.organizedActors || 0}\n`;
          text += `  Unorganized: ${stats.unorganizedActors || 0}\n`;
          text += `  Total Folders: ${stats.totalFolders || 0}\n`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      } else {
        throw new Error(result.error || 'Failed to get outliner structure');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get outliner structure: ${errorMessage}`);
    }
  },
};

function formatFolderTree(folders: any, prefix: string, maxDepth: number, currentDepth: number = 0): string {
  if (currentDepth >= maxDepth) return '';
  
  let result = '';
  const entries = Object.entries(folders);
  
  entries.forEach(([folderName, folderData]: [string, any], index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const extension = isLast ? '    ' : '│   ';
    
    // Format folder name with actor count
    const actorCount = folderData.actors ? folderData.actors.length : 0;
    result += `${prefix}${connector}📁 ${folderName} (${actorCount})\n`;
    
    // Show actors in this folder
    if (folderData.actors && folderData.actors.length > 0) {
      folderData.actors.forEach((actor: string, actorIndex: number) => {
        const actorIsLast = actorIndex === folderData.actors.length - 1;
        const actorConnector = actorIsLast ? '└── ' : '├── ';
        result += `${prefix}${extension}${actorConnector}${actor}\n`;
      });
    }
    
    // Recursively show subfolders
    if (folderData.subfolders && Object.keys(folderData.subfolders).length > 0) {
      result += formatFolderTree(folderData.subfolders, prefix + extension, maxDepth, currentDepth + 1);
    }
  });
  
  return result;
}