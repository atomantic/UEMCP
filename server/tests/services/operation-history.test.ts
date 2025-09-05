import { createMockLogger } from '../utils/mock-logger.js';

// Mock logger
const mockLogger = createMockLogger();
jest.mock('../../src/utils/logger.js', () => ({ logger: mockLogger }));

import { OperationHistory, UndoData } from '../../src/services/operation-history.js';

describe('OperationHistory', () => {
  let history: OperationHistory;

  beforeEach(() => {
    // Reset the singleton instance before each test
    (OperationHistory as any).instance = undefined;
    history = OperationHistory.getInstance();
    history.clearHistory();
    jest.clearAllMocks();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = OperationHistory.getInstance();
      const instance2 = OperationHistory.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize correctly', () => {
      expect(history).toBeDefined();
      expect(history.getStatus().totalOperations).toBe(0);
    });
  });

  describe('recordOperation', () => {
    it('should record a new operation', () => {
      const record = {
        toolName: 'actor_spawn',
        args: { assetPath: '/Game/Wall' },
        description: 'Spawn wall actor'
      };

      const id = history.recordOperation(record);

      expect(id).toMatch(/^op_/);
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Recorded operation: actor_spawn'));
      
      const status = history.getStatus();
      expect(status.totalOperations).toBe(1);
      expect(status.currentIndex).toBe(0);
    });

    it('should assign unique IDs and timestamps', () => {
      const record1 = { toolName: 'test1', args: {}, description: 'Test 1' };
      const record2 = { toolName: 'test2', args: {}, description: 'Test 2' };

      const id1 = history.recordOperation(record1);
      const id2 = history.recordOperation(record2);

      expect(id1).not.toBe(id2);
      
      const fullHistory = history.getFullHistory();
      expect(fullHistory[0].timestamp).toBeLessThanOrEqual(fullHistory[1].timestamp);
    });

    it('should include optional fields when provided', () => {
      const undoData: UndoData = {
        type: 'actor_spawn',
        actorName: 'TestActor'
      };

      const record = {
        toolName: 'actor_spawn',
        args: { assetPath: '/Game/Wall' },
        result: { success: true },
        undoData,
        redoData: { redo: true },
        checkpointName: 'TestCheckpoint',
        description: 'Test operation'
      };

      const id = history.recordOperation(record);
      const fullHistory = history.getFullHistory();
      const recorded = fullHistory[0];

      expect(recorded.id).toBe(id);
      expect(recorded.result).toEqual({ success: true });
      expect(recorded.undoData).toEqual(undoData);
      expect(recorded.redoData).toEqual({ redo: true });
      expect(recorded.checkpointName).toBe('TestCheckpoint');
    });

    it('should remove future operations when recording from middle of history', () => {
      // Record 3 operations
      history.recordOperation({ toolName: 'op1', args: {}, description: 'Op 1' });
      history.recordOperation({ toolName: 'op2', args: {}, description: 'Op 2' });
      history.recordOperation({ toolName: 'op3', args: {}, description: 'Op 3' });

      // Undo 2 operations (go back to index 0)
      history.markUndone();
      history.markUndone();

      // Record new operation - should remove op2 and op3
      history.recordOperation({ toolName: 'new_op', args: {}, description: 'New Op' });

      const fullHistory = history.getFullHistory();
      expect(fullHistory).toHaveLength(2);
      expect(fullHistory[0].toolName).toBe('op1');
      expect(fullHistory[1].toolName).toBe('new_op');
    });

    it('should trim history when max size exceeded', () => {
      // Set a small max history size for testing
      (history as any).maxHistorySize = 3;

      // Record 5 operations
      for (let i = 1; i <= 5; i++) {
        history.recordOperation({
          toolName: `op${i}`,
          args: {},
          description: `Operation ${i}`
        });
      }

      const fullHistory = history.getFullHistory();
      expect(fullHistory).toHaveLength(3);
      expect(fullHistory[0].toolName).toBe('op3');
      expect(fullHistory[1].toolName).toBe('op4');
      expect(fullHistory[2].toolName).toBe('op5');

      const status = history.getStatus();
      expect(status.currentIndex).toBe(2);
    });

    it('should update checkpoint indices when history is trimmed', () => {
      (history as any).maxHistorySize = 3;

      // Record operations and create checkpoints
      history.recordOperation({ toolName: 'op1', args: {}, description: 'Op 1' });
      history.createCheckpoint('early'); // Should be removed

      history.recordOperation({ toolName: 'op2', args: {}, description: 'Op 2' });
      history.recordOperation({ toolName: 'op3', args: {}, description: 'Op 3' });
      history.createCheckpoint('middle'); // Index 2, should become 0 after trim

      history.recordOperation({ toolName: 'op4', args: {}, description: 'Op 4' });
      history.recordOperation({ toolName: 'op5', args: {}, description: 'Op 5' });

      expect(history.getCheckpointIndex('early')).toBeNull();
      expect(history.getCheckpointIndex('middle')).toBe(0);
    });
  });

  describe('undo operations', () => {
    beforeEach(() => {
      // Setup some operations
      history.recordOperation({ toolName: 'op1', args: {}, description: 'Op 1' });
      history.recordOperation({ toolName: 'op2', args: {}, description: 'Op 2' });
      history.recordOperation({ toolName: 'op3', args: {}, description: 'Op 3' });
    });

    it('should get undoable operation', () => {
      const undoable = history.getUndoableOperation();
      expect(undoable).not.toBeNull();
      expect(undoable!.toolName).toBe('op3');
    });

    it('should mark operation as undone', () => {
      const success = history.markUndone();
      expect(success).toBe(true);
      
      const status = history.getStatus();
      expect(status.currentIndex).toBe(1);
      expect(status.canUndo).toBe(true);
      expect(status.canRedo).toBe(true);

      const undoable = history.getUndoableOperation();
      expect(undoable!.toolName).toBe('op2');
    });

    it('should handle multiple undos', () => {
      history.markUndone();
      history.markUndone();
      history.markUndone();

      const status = history.getStatus();
      expect(status.currentIndex).toBe(-1);
      expect(status.canUndo).toBe(false);
      expect(status.canRedo).toBe(true);

      const undoable = history.getUndoableOperation();
      expect(undoable).toBeNull();
    });

    it('should fail to undo when no operations available', () => {
      history.clearHistory();
      const success = history.markUndone();
      expect(success).toBe(false);
    });

    it('should get undo history', () => {
      const undoHistory = history.getUndoHistory(2);
      expect(undoHistory).toHaveLength(2);
      expect(undoHistory[0].toolName).toBe('op3'); // Most recent first
      expect(undoHistory[1].toolName).toBe('op2');
    });

    it('should limit undo history to available operations', () => {
      const undoHistory = history.getUndoHistory(10);
      expect(undoHistory).toHaveLength(3);
    });

    it('should get undo history from middle of operations', () => {
      history.markUndone(); // currentIndex = 1
      const undoHistory = history.getUndoHistory(2);
      expect(undoHistory).toHaveLength(2);
      expect(undoHistory[0].toolName).toBe('op2');
      expect(undoHistory[1].toolName).toBe('op1');
    });
  });

  describe('redo operations', () => {
    beforeEach(() => {
      history.recordOperation({ toolName: 'op1', args: {}, description: 'Op 1' });
      history.recordOperation({ toolName: 'op2', args: {}, description: 'Op 2' });
      history.recordOperation({ toolName: 'op3', args: {}, description: 'Op 3' });
      
      // Undo 2 operations to enable redo
      history.markUndone();
      history.markUndone();
    });

    it('should get redoable operation', () => {
      const redoable = history.getRedoableOperation();
      expect(redoable).not.toBeNull();
      expect(redoable!.toolName).toBe('op2');
    });

    it('should mark operation as redone', () => {
      const success = history.markRedone();
      expect(success).toBe(true);
      
      const status = history.getStatus();
      expect(status.currentIndex).toBe(1);
      expect(status.canUndo).toBe(true);
      expect(status.canRedo).toBe(true);

      const redoable = history.getRedoableOperation();
      expect(redoable!.toolName).toBe('op3');
    });

    it('should handle multiple redos', () => {
      history.markRedone();
      history.markRedone();

      const status = history.getStatus();
      expect(status.currentIndex).toBe(2);
      expect(status.canUndo).toBe(true);
      expect(status.canRedo).toBe(false);

      const redoable = history.getRedoableOperation();
      expect(redoable).toBeNull();
    });

    it('should fail to redo when no operations available', () => {
      history.markRedone();
      history.markRedone();
      const success = history.markRedone();
      expect(success).toBe(false);
    });

    it('should get redo history', () => {
      const redoHistory = history.getRedoHistory(2);
      expect(redoHistory).toHaveLength(2);
      expect(redoHistory[0].toolName).toBe('op2'); // Next operation first
      expect(redoHistory[1].toolName).toBe('op3');
    });

    it('should limit redo history to available operations', () => {
      const redoHistory = history.getRedoHistory(10);
      expect(redoHistory).toHaveLength(2);
    });
  });

  describe('checkpoints', () => {
    beforeEach(() => {
      history.recordOperation({ toolName: 'op1', args: {}, description: 'Op 1' });
      history.recordOperation({ toolName: 'op2', args: {}, description: 'Op 2' });
    });

    it('should create checkpoint', () => {
      history.createCheckpoint('test_checkpoint');
      
      expect(mockLogger.info).toHaveBeenCalledWith('Checkpoint created: test_checkpoint at index 1');
      
      const index = history.getCheckpointIndex('test_checkpoint');
      expect(index).toBe(1);
    });

    it('should get checkpoint index', () => {
      history.createCheckpoint('checkpoint1');
      history.recordOperation({ toolName: 'op3', args: {}, description: 'Op 3' });
      history.createCheckpoint('checkpoint2');

      expect(history.getCheckpointIndex('checkpoint1')).toBe(1);
      expect(history.getCheckpointIndex('checkpoint2')).toBe(2);
      expect(history.getCheckpointIndex('nonexistent')).toBeNull();
    });

    it('should list checkpoints in status', () => {
      history.createCheckpoint('alpha');
      history.createCheckpoint('beta');

      const status = history.getStatus();
      expect(status.checkpoints).toEqual(expect.arrayContaining(['alpha', 'beta']));
    });

    it('should remove checkpoints when cleared', () => {
      history.createCheckpoint('test');
      history.clearHistory();

      const status = history.getStatus();
      expect(status.checkpoints).toEqual([]);
      expect(history.getCheckpointIndex('test')).toBeNull();
    });
  });

  describe('status and utilities', () => {
    it('should provide correct status for empty history', () => {
      const status = history.getStatus();
      expect(status).toEqual({
        totalOperations: 0,
        currentIndex: -1,
        canUndo: false,
        canRedo: false,
        checkpoints: []
      });
    });

    it('should provide correct status with operations', () => {
      history.recordOperation({ toolName: 'op1', args: {}, description: 'Op 1' });
      history.recordOperation({ toolName: 'op2', args: {}, description: 'Op 2' });

      const status = history.getStatus();
      expect(status).toEqual({
        totalOperations: 2,
        currentIndex: 1,
        canUndo: true,
        canRedo: false,
        checkpoints: []
      });
    });

    it('should get full history copy', () => {
      history.recordOperation({ toolName: 'op1', args: {}, description: 'Op 1' });
      history.recordOperation({ toolName: 'op2', args: {}, description: 'Op 2' });

      const fullHistory = history.getFullHistory();
      expect(fullHistory).toHaveLength(2);
      expect(fullHistory[0].toolName).toBe('op1');
      expect(fullHistory[1].toolName).toBe('op2');

      // Verify it's a copy, not reference
      fullHistory.push({
        id: 'fake',
        timestamp: Date.now(),
        toolName: 'fake',
        args: {},
        description: 'Fake'
      });
      
      expect(history.getFullHistory()).toHaveLength(2);
    });

    it('should clear history', () => {
      history.recordOperation({ toolName: 'op1', args: {}, description: 'Op 1' });
      history.createCheckpoint('test');
      
      history.clearHistory();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Operation history cleared');
      
      const status = history.getStatus();
      expect(status.totalOperations).toBe(0);
      expect(status.currentIndex).toBe(-1);
      expect(status.checkpoints).toEqual([]);
    });
  });

  describe('updateUndoData', () => {
    it('should update undo data for existing operation', () => {
      const id = history.recordOperation({
        toolName: 'actor_spawn',
        args: { assetPath: '/Game/Wall' },
        description: 'Spawn wall'
      });

      const undoData: UndoData = {
        type: 'actor_spawn',
        actorName: 'Wall_1'
      };

      const success = history.updateUndoData(id, undoData);
      expect(success).toBe(true);

      const operation = history.getUndoableOperation();
      expect(operation!.undoData).toEqual(undoData);
    });

    it('should fail to update undo data for non-existent operation', () => {
      const success = history.updateUndoData('fake_id', {
        type: 'custom',
        customData: {}
      });
      expect(success).toBe(false);
    });

    it('should update undo data with different types', () => {
      const id = history.recordOperation({
        toolName: 'actor_modify',
        args: {},
        description: 'Modify actor'
      });

      const undoData: UndoData = {
        type: 'actor_modify',
        previousState: {
          location: [100, 200, 300],
          rotation: [0, 45, 0],
          scale: [1, 1, 1],
          mesh: '/Game/OldMesh',
          folder: 'OldFolder'
        }
      };

      const success = history.updateUndoData(id, undoData);
      expect(success).toBe(true);

      const operation = history.getUndoableOperation();
      expect(operation!.undoData).toEqual(undoData);
    });
  });

  describe('ID generation', () => {
    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        const id = history.recordOperation({
          toolName: 'test',
          args: {},
          description: `Test ${i}`
        });
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      }
    });

    it('should use crypto.randomUUID when available', () => {
      const mockUUID = jest.fn(() => 'test-uuid-123');
      const originalCrypto = globalThis.crypto;
      
      // Mock crypto.randomUUID
      globalThis.crypto = {
        randomUUID: mockUUID
      } as any;

      try {
        const id = history.recordOperation({
          toolName: 'test',
          args: {},
          description: 'Test'
        });
        
        expect(mockUUID).toHaveBeenCalled();
        expect(id).toBe('op_test-uuid-123');
      } finally {
        // Restore original crypto
        globalThis.crypto = originalCrypto;
      }
    });

    it('should fall back to timestamp-based ID when crypto unavailable', () => {
      const originalCrypto = globalThis.crypto;
      
      // Remove crypto to test fallback
      globalThis.crypto = undefined as any;

      try {
        const id = history.recordOperation({
          toolName: 'test',
          args: {},
          description: 'Test'
        });
        
        expect(id).toMatch(/^op_\d+_\d+_[a-z0-9]+$/);
      } finally {
        // Restore original crypto
        globalThis.crypto = originalCrypto;
      }
    });
  });

  describe('complex undo data scenarios', () => {
    it('should handle actor_delete undo data', () => {
      const undoData: UndoData = {
        type: 'actor_delete',
        actorData: {
          assetPath: '/Game/Wall',
          location: [100, 200, 300],
          rotation: [0, 90, 0],
          scale: [1, 1, 1],
          name: 'Wall_1'
        }
      };

      history.recordOperation({
        toolName: 'actor_delete',
        args: { actorName: 'Wall_1' },
        undoData,
        description: 'Delete wall actor'
      });

      const operation = history.getUndoableOperation();
      expect(operation!.undoData).toEqual(undoData);
    });

    it('should handle material_apply undo data', () => {
      const undoData: UndoData = {
        type: 'material_apply',
        previousMaterial: '/Game/Materials/OldMaterial',
        materialSlot: 0
      };

      history.recordOperation({
        toolName: 'material_apply',
        args: {
          actorName: 'Wall_1',
          materialPath: '/Game/Materials/NewMaterial'
        },
        undoData,
        description: 'Apply new material'
      });

      const operation = history.getUndoableOperation();
      expect(operation!.undoData!.previousMaterial).toBe('/Game/Materials/OldMaterial');
      expect(operation!.undoData!.materialSlot).toBe(0);
    });

    it('should handle custom undo data', () => {
      const customData = {
        type: 'viewport_change',
        previousCamera: {
          location: [1000, 1000, 1000],
          rotation: [0, -45, 0]
        }
      };

      const undoData: UndoData = {
        type: 'custom',
        customData
      };

      history.recordOperation({
        toolName: 'viewport_camera',
        args: {
          location: [2000, 2000, 500],
          rotation: [0, -90, 0]
        },
        undoData,
        description: 'Change camera position'
      });

      const operation = history.getUndoableOperation();
      expect(operation!.undoData!.customData).toEqual(customData);
    });
  });
});