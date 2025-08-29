import { BaseTool, PythonResult } from './base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';
import { OperationHistory, UndoData } from '../../services/operation-history.js';
import { logger } from '../../utils/logger.js';

/**
 * Base class for tools that support undo/redo operations
 */
export abstract class UndoableTool<TArgs = unknown> extends BaseTool<TArgs> {
  protected history: OperationHistory;

  constructor() {
    super();
    this.history = OperationHistory.getInstance();
  }

  /**
   * Execute the tool with undo support
   */
  protected async execute(args: TArgs): Promise<ReturnType<typeof ResponseFormatter.success>> {
    // Record the operation before execution
    const operationId = this.history.recordOperation({
      toolName: this.definition.name,
      args,
      description: this.getOperationDescription(args),
    });

    try {
      // Execute the actual operation
      const result = await this.executeWithUndo(args, operationId);
      
      // Store the result in history
      const operation = this.history.getFullHistory().find(op => op.id === operationId);
      if (operation) {
        operation.result = result;
      }

      return result;
    } catch (error) {
      // Remove the operation from history if it failed
      // Note: In a real implementation, we'd need a way to remove failed operations
      logger.error(`Operation ${operationId} failed: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Execute the operation and collect undo data
   * Must be implemented by subclasses
   */
  protected abstract executeWithUndo(
    args: TArgs,
    operationId: string
  ): Promise<ReturnType<typeof ResponseFormatter.success>>;

  /**
   * Get a human-readable description of the operation
   * Should be implemented by subclasses for better history display
   */
  protected getOperationDescription(_args: TArgs): string {
    return `${this.definition.name} operation`;
  }

  /**
   * Perform the undo operation
   * Must be implemented by subclasses that support undo
   */
  protected abstract performUndo(undoData: UndoData): Promise<PythonResult>;

  /**
   * Perform the redo operation
   * Default implementation re-executes the original operation
   */
  protected async performRedo(_args: TArgs): Promise<PythonResult> {
    // By default, redo just re-executes the original operation
    // Subclasses can override for more efficient redo
    // Note: This is a placeholder - actual redo logic should be implemented
    return { success: true, message: 'Redo operation placeholder' };
  }

  /**
   * Helper to store undo data for an operation
   */
  protected storeUndoData(operationId: string, undoData: UndoData): void {
    this.history.updateUndoData(operationId, undoData);
  }

  /**
   * Helper to get the current state before modification
   * Useful for actor_modify operations
   */
  protected async captureActorState(actorName: string): Promise<{
    location?: number[];
    rotation?: number[];
    scale?: number[];
    mesh?: string;
    folder?: string;
    asset_path?: string;
  }> {
    const result = await this.executePythonCommand('actor.get_actor_state', {
      actor_name: actorName,
    });

    if (result.success) {
      return {
        location: Array.isArray(result.location) ? result.location : undefined,
        rotation: Array.isArray(result.rotation) ? result.rotation : undefined,
        scale: Array.isArray(result.scale) ? result.scale : undefined,
        mesh: result.mesh ? String(result.mesh) : undefined,
        folder: result.folder ? String(result.folder) : undefined,
        asset_path: result.asset_path ? String(result.asset_path) : undefined,
      };
    }

    return {};
  }
}