import { BaseTool } from '../base/base-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';
import { OperationHistory } from '../../services/operation-history.js';

interface HistoryListArgs {
  limit?: number;
  showRedo?: boolean;
}

/**
 * Tool for displaying operation history
 */
export class HistoryListTool extends BaseTool<HistoryListArgs> {
  private history: OperationHistory;

  constructor() {
    super();
    this.history = OperationHistory.getInstance();
  }

  get definition(): ToolDefinition {
    return {
      name: 'history_list',
      description: 'Show operation history with timestamps. Example: history_list() or history_list({ limit: 20, showRedo: true })',
      inputSchema: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Maximum number of operations to show (default: 10)',
            default: 10,
            minimum: 1,
            maximum: 50,
          },
          showRedo: {
            type: 'boolean',
            description: 'Include operations available for redo (default: false)',
            default: false,
          },
        },
      },
    };
  }

  protected async execute(args: HistoryListArgs): Promise<ReturnType<typeof ResponseFormatter.success>> {
    const limit = args.limit || 10;
    const showRedo = args.showRedo || false;
    
    const status = this.history.getStatus();
    const undoHistory = this.history.getUndoHistory(limit);
    const redoHistory = showRedo ? this.history.getRedoHistory(limit) : [];
    
    let message = `Operation History (${status.currentIndex + 1}/${status.totalOperations} operations)\n`;
    message += '=' .repeat(60) + '\n\n';
    
    // Show checkpoints if any
    if (status.checkpoints.length > 0) {
      message += 'Checkpoints:\n';
      status.checkpoints.forEach(checkpoint => {
        message += `  📍 ${checkpoint}\n`;
      });
      message += '\n';
    }
    
    // Show undo history (operations that can be undone)
    if (undoHistory.length > 0) {
      message += `Recent Operations (can be undone):\n`;
      message += '-'.repeat(40) + '\n';
      
      undoHistory.forEach((op, index) => {
        const timestamp = new Date(op.timestamp).toLocaleTimeString();
        const marker = index === 0 ? '→ ' : '  ';
        const checkpoint = op.checkpointName ? ` 📍 ${op.checkpointName}` : '';
        
        message += `${marker}[${timestamp}] ${op.description}${checkpoint}\n`;
        message += `   Tool: ${op.toolName}`;
        
        if (op.undoData) {
          message += ` (undoable)`;
        } else {
          message += ` (no undo)`;
        }
        message += '\n';
        
        // Show brief args if they're simple
        if (op.args && typeof op.args === 'object') {
          const args = op.args as Record<string, unknown>;
          const simpleArgs = this.formatSimpleArgs(args);
          if (simpleArgs) {
            message += `   Args: ${simpleArgs}\n`;
          }
        }
        
        if (index < undoHistory.length - 1) {
          message += '\n';
        }
      });
    } else {
      message += 'No operations to undo\n';
    }
    
    // Show redo history if requested
    if (showRedo && redoHistory.length > 0) {
      message += '\n' + '-'.repeat(40) + '\n';
      message += `Operations Available for Redo:\n`;
      message += '-'.repeat(40) + '\n';
      
      redoHistory.forEach((op, index) => {
        const timestamp = new Date(op.timestamp).toLocaleTimeString();
        const checkpoint = op.checkpointName ? ` 📍 ${op.checkpointName}` : '';
        
        message += `  [${timestamp}] ${op.description}${checkpoint}\n`;
        message += `   Tool: ${op.toolName}\n`;
        
        if (index < redoHistory.length - 1) {
          message += '\n';
        }
      });
    }
    
    // Show summary
    message += '\n' + '=' .repeat(60) + '\n';
    message += `Status: ${status.canUndo ? `${status.currentIndex + 1} operations can be undone` : 'Nothing to undo'}`;
    if (status.canRedo) {
      message += `, ${status.totalOperations - status.currentIndex - 1} can be redone`;
    }
    
    return ResponseFormatter.success(message);
  }

  private formatSimpleArgs(args: Record<string, unknown>): string | null {
    const simple: string[] = [];
    
    for (const [key, value] of Object.entries(args)) {
      if (value === null || value === undefined) continue;
      
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        simple.push(`${key}=${JSON.stringify(value)}`);
      } else if (Array.isArray(value) && value.length <= 3) {
        simple.push(`${key}=[${value.join(',')}]`);
      }
      
      if (simple.length >= 3) break; // Limit to 3 args for brevity
    }
    
    return simple.length > 0 ? simple.join(', ') : null;
  }
}

export const historyListTool = new HistoryListTool().toMCPTool();