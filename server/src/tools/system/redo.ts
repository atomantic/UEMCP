import { BaseTool } from '../base/base-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';
import { OperationHistory } from '../../services/operation-history.js';
import { logger } from '../../utils/logger.js';

interface RedoArgs {
  count?: number;
}

/**
 * Tool for redoing operations
 */
export class RedoTool extends BaseTool<RedoArgs> {
  private history: OperationHistory;

  constructor() {
    super();
    this.history = OperationHistory.getInstance();
  }

  get definition(): ToolDefinition {
    return {
      name: 'redo',
      description: 'Redo previously undone operations. Example: redo() or redo({ count: 3 })',
      inputSchema: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Number of operations to redo (default: 1)',
            default: 1,
            minimum: 1,
          },
        },
      },
    };
  }

  protected async execute(args: RedoArgs): Promise<ReturnType<typeof ResponseFormatter.success>> {
    const count = args.count || 1;
    const redoneOperations: string[] = [];
    const failedOperations: string[] = [];

    for (let i = 0; i < count; i++) {
      const operation = this.history.getRedoableOperation();
      
      if (!operation) {
        if (i === 0) {
          return ResponseFormatter.success('No operations to redo');
        }
        break;
      }

      try {
        // Re-execute the operation
        await this.performRedo(operation);
        redoneOperations.push(`${operation.description} (${operation.toolName})`);
        this.history.markRedone();
        logger.info(`Redone operation: ${operation.id}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        failedOperations.push(`${operation.description} (${errorMsg})`);
        logger.error(`Failed to redo operation ${operation.id}: ${error}`);
        break; // Stop on error
      }
    }

    // Build result message
    let message = '';
    
    if (redoneOperations.length > 0) {
      message += `Successfully redone ${redoneOperations.length} operation${redoneOperations.length !== 1 ? 's' : ''}:\n`;
      redoneOperations.forEach(op => {
        message += `  ✓ ${op}\n`;
      });
    }
    
    if (failedOperations.length > 0) {
      if (message) message += '\n';
      message += `Failed to redo ${failedOperations.length} operation${failedOperations.length !== 1 ? 's' : ''}:\n`;
      failedOperations.forEach(op => {
        message += `  ✗ ${op}\n`;
      });
    }

    const status = this.history.getStatus();
    message += `\nHistory: ${status.currentIndex + 1}/${status.totalOperations} operations`;
    if (status.canUndo) {
      message += ` (${status.currentIndex + 1} available for undo)`;
    }

    return ResponseFormatter.success(message.trim());
  }

  private async performRedo(operation: any): Promise<void> {
    // Re-execute the original operation based on its type
    const toolName = operation.toolName;
    const args = operation.args;

    // Map tool names to their Python commands
    const toolMapping: Record<string, string> = {
      'actor_spawn': 'actor.spawn',
      'actor_delete': 'actor.delete',
      'actor_modify': 'actor.modify',
      'actor_duplicate': 'actor.duplicate',
      'material_apply': 'material.apply',
      'material_create': 'material.create',
      // Add more mappings as needed
    };

    const pythonCommand = toolMapping[toolName];
    
    if (pythonCommand) {
      const result = await this.executePythonCommand(pythonCommand, args);
      if (!result.success) {
        throw new Error(result.error || `Failed to redo ${toolName}`);
      }
    } else {
      // For tools without specific redo logic, we might need to
      // re-invoke them through the MCP system
      logger.warn(`Redo not fully implemented for tool: ${toolName}`);
      throw new Error(`Redo not available for ${toolName}`);
    }
  }
}

export const redoTool = new RedoTool().toMCPTool();