/**
 * Operation History Manager for Undo/Redo functionality
 * Tracks all MCP operations and provides undo/redo capabilities
 */

import { logger } from '../utils/logger.js';

// Type alias for operation IDs to improve API clarity
export type OperationId = string;

export interface OperationRecord {
  id: OperationId;
  timestamp: number;
  toolName: string;
  args: unknown;
  result?: unknown;
  undoData?: UndoData;
  redoData?: unknown;
  checkpointName?: string;
  description: string;
}

export interface UndoData {
  type: 'actor_spawn' | 'actor_delete' | 'actor_modify' | 'material_apply' | 'level_save' | 'custom';
  // For actor_spawn: store actor name to delete
  actorName?: string;
  // For actor_delete: store actor data to restore
  actorData?: {
    assetPath: string;
    location: number[];
    rotation: number[];
    scale: number[];
    name: string;
  };
  // For actor_modify: store previous state
  previousState?: {
    location?: number[];
    rotation?: number[];
    scale?: number[];
    mesh?: string;
    folder?: string;
  };
  // For material_apply: store previous material
  previousMaterial?: string;
  materialSlot?: number;
  // For custom operations
  customData?: unknown;
}

export class OperationHistory {
  private static instance: OperationHistory;
  private history: OperationRecord[] = [];
  private currentIndex: number = -1;
  private maxHistorySize: number = 100;
  private checkpoints: Map<string, number> = new Map();

  private constructor() {
    logger.info('Operation History Manager initialized');
  }

  static getInstance(): OperationHistory {
    if (!OperationHistory.instance) {
      OperationHistory.instance = new OperationHistory();
    }
    return OperationHistory.instance;
  }

  /**
   * Record a new operation
   */
  recordOperation(record: Omit<OperationRecord, 'id' | 'timestamp'>): OperationId {
    const id = this.generateId();
    const timestamp = Date.now();
    
    const operation: OperationRecord = {
      id,
      timestamp,
      ...record,
    };

    // If we're not at the end of history, remove everything after current index
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new operation
    this.history.push(operation);
    this.currentIndex++;

    // Trim history if it exceeds max size
    if (this.history.length > this.maxHistorySize) {
      const trimCount = this.history.length - this.maxHistorySize;
      this.history = this.history.slice(trimCount);
      this.currentIndex -= trimCount;
      
      // Update checkpoint indices
      this.checkpoints.forEach((index, name) => {
        const newIndex = index - trimCount;
        if (newIndex < 0) {
          this.checkpoints.delete(name);
        } else {
          this.checkpoints.set(name, newIndex);
        }
      });
    }

    logger.debug(`Recorded operation: ${operation.toolName} (${id})`);
    return id;
  }

  /**
   * Get the operation that can be undone (current operation)
   */
  getUndoableOperation(): OperationRecord | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex];
    }
    return null;
  }

  /**
   * Get the operation that can be redone
   */
  getRedoableOperation(): OperationRecord | null {
    if (this.currentIndex < this.history.length - 1) {
      return this.history[this.currentIndex + 1];
    }
    return null;
  }

  /**
   * Mark an operation as undone and move the index back
   */
  markUndone(): boolean {
    if (this.currentIndex >= 0) {
      this.currentIndex--;
      return true;
    }
    return false;
  }

  /**
   * Mark an operation as redone and move the index forward
   */
  markRedone(): boolean {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return true;
    }
    return false;
  }

  /**
   * Get last N operations for undo
   */
  getUndoHistory(count: number = 10): OperationRecord[] {
    const start = Math.max(0, this.currentIndex - count + 1);
    const end = this.currentIndex + 1;
    return this.history.slice(start, end).reverse();
  }

  /**
   * Get next N operations for redo
   */
  getRedoHistory(count: number = 10): OperationRecord[] {
    const start = this.currentIndex + 1;
    const end = Math.min(this.history.length, start + count);
    return this.history.slice(start, end);
  }

  /**
   * Get full history
   */
  getFullHistory(): OperationRecord[] {
    return [...this.history];
  }

  /**
   * Create a checkpoint
   */
  createCheckpoint(name: string): void {
    this.checkpoints.set(name, this.currentIndex);
    logger.info(`Checkpoint created: ${name} at index ${this.currentIndex}`);
  }

  /**
   * Restore to a checkpoint
   */
  getCheckpointIndex(name: string): number | null {
    return this.checkpoints.get(name) ?? null;
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = [];
    this.currentIndex = -1;
    this.checkpoints.clear();
    logger.info('Operation history cleared');
  }

  /**
   * Get current state info
   */
  getStatus(): {
    totalOperations: number;
    currentIndex: number;
    canUndo: boolean;
    canRedo: boolean;
    checkpoints: string[];
  } {
    return {
      totalOperations: this.history.length,
      currentIndex: this.currentIndex,
      canUndo: this.currentIndex >= 0,
      canRedo: this.currentIndex < this.history.length - 1,
      checkpoints: Array.from(this.checkpoints.keys()),
    };
  }

  /**
   * Update undo data for an operation
   */
  updateUndoData(operationId: string, undoData: UndoData): boolean {
    const operation = this.history.find(op => op.id === operationId);
    if (operation) {
      operation.undoData = undoData;
      return true;
    }
    return false;
  }

  private generateId(): OperationId {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}