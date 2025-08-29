import { BaseTool } from '../base/base-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';
import { OperationHistory, OperationRecord } from '../../services/operation-history.js';
import { logger } from '../../utils/logger.js';

interface UndoArgs {
  count?: number;
}

/**
 * Tool for undoing operations
 */
export class UndoTool extends BaseTool<UndoArgs> {
  private history: OperationHistory;

  constructor() {
    super();
    this.history = OperationHistory.getInstance();
  }

  get definition(): ToolDefinition {
    return {
      name: 'undo',
      description: 'Undo the last operation or N operations. Example: undo() or undo({ count: 3 })',
      inputSchema: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Number of operations to undo (default: 1)',
            default: 1,
            minimum: 1,
          },
        },
      },
    };
  }

  protected async execute(args: UndoArgs): Promise<ReturnType<typeof ResponseFormatter.success>> {
    const count = args.count || 1;
    const undoneOperations: string[] = [];
    const failedOperations: string[] = [];

    for (let i = 0; i < count; i++) {
      const operation = this.history.getUndoableOperation();
      
      if (!operation) {
        if (i === 0) {
          return ResponseFormatter.success('No operations to undo');
        }
        break;
      }

      try {
        // Perform the undo based on operation type
        if (operation.undoData) {
          await this.performUndo(operation);
          undoneOperations.push(`${operation.description} (${operation.toolName})`);
          this.history.markUndone();
          logger.info(`Undone operation: ${operation.id}`);
        } else {
          // Operation doesn't support undo
          failedOperations.push(`${operation.description} (no undo data)`);
          logger.warn(`Cannot undo operation ${operation.id}: No undo data`);
          break; // Stop trying to undo more if we hit one that can't be undone
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        failedOperations.push(`${operation.description} (${errorMsg})`);
        logger.error(`Failed to undo operation ${operation.id}: ${String(error)}`);
        break; // Stop on error
      }
    }

    // Build result message
    let message = '';
    
    if (undoneOperations.length > 0) {
      message += `Successfully undone ${undoneOperations.length} operation${undoneOperations.length !== 1 ? 's' : ''}:\n`;
      undoneOperations.forEach(op => {
        message += `  ✓ ${op}\n`;
      });
    }
    
    if (failedOperations.length > 0) {
      if (message) message += '\n';
      message += `Failed to undo ${failedOperations.length} operation${failedOperations.length !== 1 ? 's' : ''}:\n`;
      failedOperations.forEach(op => {
        message += `  ✗ ${op}\n`;
      });
    }

    const status = this.history.getStatus();
    message += `\nHistory: ${status.currentIndex + 1}/${status.totalOperations} operations`;
    if (status.canRedo) {
      message += ` (${status.totalOperations - status.currentIndex - 1} available for redo)`;
    }

    return ResponseFormatter.success(message.trim());
  }

  private async performUndo(operation: OperationRecord): Promise<void> {
    const undoData = operation.undoData;
    
    if (!undoData) {
      throw new Error('No undo data available');
    }
    
    switch (undoData.type) {
      case 'actor_spawn':
        // Undo spawn by deleting the actor
        if (undoData.actorName) {
          await this.executePythonCommand('actor.delete', {
            actor_name: undoData.actorName,
          });
        }
        break;

      case 'actor_delete':
        // Undo delete by respawning the actor
        if (undoData.actorData) {
          await this.executePythonCommand('actor.spawn', {
            asset_path: undoData.actorData.assetPath,
            location: undoData.actorData.location,
            rotation: undoData.actorData.rotation,
            scale: undoData.actorData.scale,
            name: undoData.actorData.name,
          });
        }
        break;

      case 'actor_modify':
        // Undo modify by restoring previous state
        if (undoData.actorName && undoData.previousState) {
          const params: Record<string, unknown> = {
            actor_name: undoData.actorName,
          };
          
          if (undoData.previousState.location) {
            params.location = undoData.previousState.location;
          }
          if (undoData.previousState.rotation) {
            params.rotation = undoData.previousState.rotation;
          }
          if (undoData.previousState.scale) {
            params.scale = undoData.previousState.scale;
          }
          if (undoData.previousState.mesh) {
            params.mesh = undoData.previousState.mesh;
          }
          if (undoData.previousState.folder) {
            params.folder = undoData.previousState.folder;
          }
          
          await this.executePythonCommand('actor.modify', params);
        }
        break;

      case 'material_apply':
        // Undo material application by restoring previous material
        if (undoData.actorName && undoData.previousMaterial !== undefined) {
          await this.executePythonCommand('material.apply', {
            actor_name: undoData.actorName,
            material_path: undoData.previousMaterial,
            slot_index: undoData.materialSlot || 0,
          });
        }
        break;

      case 'level_save':
        // Level save cannot be undone
        logger.warn('Level save operations cannot be undone');
        throw new Error('Level save cannot be undone');

      case 'custom':
        // Custom undo logic would go here
        if (undoData.customData) {
          logger.warn('Custom undo not implemented');
          throw new Error('Custom undo not implemented');
        }
        break;

      default:
        throw new Error(`Unknown undo type: ${String(undoData.type)}`);
    }
  }
}

export const undoTool = new UndoTool().toMCPTool();