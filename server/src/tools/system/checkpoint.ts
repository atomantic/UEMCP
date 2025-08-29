import { BaseTool } from '../base/base-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';
import { OperationHistory } from '../../services/operation-history.js';
import { logger } from '../../utils/logger.js';

interface CheckpointCreateArgs {
  name: string;
  description?: string;
}

interface CheckpointRestoreArgs {
  name: string;
}

/**
 * Tool for creating checkpoints in operation history
 */
export class CheckpointCreateTool extends BaseTool<CheckpointCreateArgs> {
  private history: OperationHistory;

  constructor() {
    super();
    this.history = OperationHistory.getInstance();
  }

  get definition(): ToolDefinition {
    return {
      name: 'checkpoint_create',
      description: 'Create a named save point for batch operations. Example: checkpoint_create({ name: "before_building" })',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name for the checkpoint',
          },
          description: {
            type: 'string',
            description: 'Optional description of the checkpoint',
          },
        },
        required: ['name'],
      },
    };
  }

  protected async execute(args: CheckpointCreateArgs): Promise<ReturnType<typeof ResponseFormatter.success>> {
    if (!args.name) {
      return ResponseFormatter.success('Error: Checkpoint name is required');
    }

    // Create the checkpoint
    this.history.createCheckpoint(args.name);
    
    // If description provided, record it as an operation
    if (args.description) {
      this.history.recordOperation({
        toolName: 'checkpoint_create',
        args,
        description: `Checkpoint: ${args.name} - ${args.description}`,
        checkpointName: args.name,
      });
    } else {
      this.history.recordOperation({
        toolName: 'checkpoint_create',
        args,
        description: `Checkpoint: ${args.name}`,
        checkpointName: args.name,
      });
    }

    const status = this.history.getStatus();
    
    let message = `✅ Checkpoint created: "${args.name}"\n`;
    if (args.description) {
      message += `   Description: ${args.description}\n`;
    }
    message += `\nCurrent position: Operation ${status.currentIndex + 1} of ${status.totalOperations}\n`;
    message += `Total checkpoints: ${status.checkpoints.length}`;

    logger.info(`Checkpoint created: ${args.name}`);
    
    return ResponseFormatter.success(message);
  }
}

/**
 * Tool for restoring to a checkpoint
 */
export class CheckpointRestoreTool extends BaseTool<CheckpointRestoreArgs> {
  private history: OperationHistory;

  constructor() {
    super();
    this.history = OperationHistory.getInstance();
  }

  get definition(): ToolDefinition {
    return {
      name: 'checkpoint_restore',
      description: 'Restore to a named checkpoint by undoing all operations after it. Example: checkpoint_restore({ name: "before_building" })',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the checkpoint to restore to',
          },
        },
        required: ['name'],
      },
    };
  }

  protected async execute(args: CheckpointRestoreArgs): Promise<ReturnType<typeof ResponseFormatter.success>> {
    if (!args.name) {
      return ResponseFormatter.success('Error: Checkpoint name is required');
    }

    const checkpointIndex = this.history.getCheckpointIndex(args.name);
    
    if (checkpointIndex === null) {
      const status = this.history.getStatus();
      let message = `Error: Checkpoint "${args.name}" not found\n\n`;
      if (status.checkpoints.length > 0) {
        message += 'Available checkpoints:\n';
        status.checkpoints.forEach(cp => {
          message += `  • ${cp}\n`;
        });
      } else {
        message += 'No checkpoints available';
      }
      return ResponseFormatter.success(message);
    }

    const status = this.history.getStatus();
    const currentIndex = status.currentIndex;
    
    if (checkpointIndex === currentIndex) {
      return ResponseFormatter.success(`Already at checkpoint "${args.name}"`);
    }

    let operationsToUndo = 0;
    let operationsToRedo = 0;
    
    if (checkpointIndex < currentIndex) {
      // Need to undo operations
      operationsToUndo = currentIndex - checkpointIndex;
    } else {
      // Need to redo operations
      operationsToRedo = checkpointIndex - currentIndex;
    }

    const undoneOps: string[] = [];
    const redoneOps: string[] = [];
    const errors: string[] = [];

    // Perform undo operations
    for (let i = 0; i < operationsToUndo; i++) {
      const operation = this.history.getUndoableOperation();
      if (operation) {
        try {
          // Use the undo tool's logic
          const undoTool = new (await import('./undo.js')).UndoTool();
          await undoTool['performUndo'](operation);
          undoneOps.push(operation.description);
          this.history.markUndone();
        } catch (error) {
          errors.push(`Failed to undo: ${operation.description}`);
          logger.error(`Failed to undo during checkpoint restore: ${error}`);
          break;
        }
      }
    }

    // Perform redo operations
    for (let i = 0; i < operationsToRedo; i++) {
      const operation = this.history.getRedoableOperation();
      if (operation) {
        try {
          // Use the redo tool's logic
          const redoTool = new (await import('./redo.js')).RedoTool();
          await redoTool['performRedo'](operation);
          redoneOps.push(operation.description);
          this.history.markRedone();
        } catch (error) {
          errors.push(`Failed to redo: ${operation.description}`);
          logger.error(`Failed to redo during checkpoint restore: ${error}`);
          break;
        }
      }
    }

    let message = `Restored to checkpoint "${args.name}"\n\n`;
    
    if (undoneOps.length > 0) {
      message += `Undone ${undoneOps.length} operation${undoneOps.length !== 1 ? 's' : ''}:\n`;
      undoneOps.forEach(op => {
        message += `  ↶ ${op}\n`;
      });
      message += '\n';
    }
    
    if (redoneOps.length > 0) {
      message += `Redone ${redoneOps.length} operation${redoneOps.length !== 1 ? 's' : ''}:\n`;
      redoneOps.forEach(op => {
        message += `  ↷ ${op}\n`;
      });
      message += '\n';
    }
    
    if (errors.length > 0) {
      message += `⚠️  ${errors.length} error${errors.length !== 1 ? 's' : ''} occurred:\n`;
      errors.forEach(err => {
        message += `  ✗ ${err}\n`;
      });
      message += '\n';
    }

    const newStatus = this.history.getStatus();
    message += `Current position: Operation ${newStatus.currentIndex + 1} of ${newStatus.totalOperations}`;

    logger.info(`Restored to checkpoint: ${args.name}`);
    
    return ResponseFormatter.success(message);
  }
}

export const checkpointCreateTool = new CheckpointCreateTool().toMCPTool();
export const checkpointRestoreTool = new CheckpointRestoreTool().toMCPTool();