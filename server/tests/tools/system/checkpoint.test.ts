import { createMockLogger } from '../../utils/mock-logger.js';

// Mock dependencies
const mockLogger = createMockLogger();

const mockOperationHistory = {
  createCheckpoint: jest.fn(),
  recordOperation: jest.fn(),
  getStatus: jest.fn(),
  getCheckpointIndex: jest.fn(),
  getUndoableOperation: jest.fn(),
  getRedoableOperation: jest.fn(),
  markUndone: jest.fn(),
  markRedone: jest.fn(),
  getInstance: jest.fn(),
};

const mockUndoTool = {
  undoOperation: jest.fn(),
};

const mockRedoTool = {
  redoOperation: jest.fn(),
};

jest.mock('../../../src/utils/logger.js', () => ({
  logger: mockLogger
}));

jest.mock('../../../src/services/operation-history.js', () => ({
  OperationHistory: {
    getInstance: () => mockOperationHistory
  }
}));

jest.mock('../../../src/tools/system/undo.js', () => ({
  UndoTool: jest.fn(() => mockUndoTool)
}));

jest.mock('../../../src/tools/system/redo.js', () => ({
  RedoTool: jest.fn(() => mockRedoTool)
}));

import { CheckpointCreateTool, CheckpointRestoreTool } from '../../../src/tools/system/checkpoint.js';

describe('CheckpointCreateTool', () => {
  let tool: CheckpointCreateTool;

  beforeEach(() => {
    tool = new CheckpointCreateTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('checkpoint_create');
      expect(definition.description).toContain('Create a named save point for batch operations');
      expect(definition.description).toContain('checkpoint_create({');
    });

    it('should have proper input schema', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      expect(schema.required).toEqual(['name']);
      
      expect(schema.properties.name.type).toBe('string');
      expect(schema.properties.name.description).toContain('Name for the checkpoint');
      
      expect(schema.properties.description.type).toBe('string');
      expect(schema.properties.description.description).toContain('Optional description of the checkpoint');
    });
  });

  describe('execute', () => {
    it('should create checkpoint with name only', async () => {
      const args = { name: 'test_checkpoint' };
      
      mockOperationHistory.getStatus.mockReturnValue({
        currentIndex: 2,
        totalOperations: 5,
        checkpoints: ['test_checkpoint']
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockOperationHistory.createCheckpoint).toHaveBeenCalledWith('test_checkpoint');
      expect(mockOperationHistory.recordOperation).toHaveBeenCalledWith({
        toolName: 'checkpoint_create',
        args,
        description: 'Checkpoint: test_checkpoint',
        checkpointName: 'test_checkpoint'
      });

      expect(result.content[0].text).toContain('✅ Checkpoint created: "test_checkpoint"');
      expect(result.content[0].text).toContain('Current position: Operation 3 of 5');
      expect(result.content[0].text).toContain('Total checkpoints: 1');
      expect(result.content[0].text).not.toContain('Description:');

      expect(mockLogger.info).toHaveBeenCalledWith('Checkpoint created: test_checkpoint');
    });

    it('should create checkpoint with name and description', async () => {
      const args = { 
        name: 'before_building',
        description: 'State before starting building construction'
      };
      
      mockOperationHistory.getStatus.mockReturnValue({
        currentIndex: 5,
        totalOperations: 10,
        checkpoints: ['before_building', 'after_walls']
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockOperationHistory.createCheckpoint).toHaveBeenCalledWith('before_building');
      expect(mockOperationHistory.recordOperation).toHaveBeenCalledWith({
        toolName: 'checkpoint_create',
        args,
        description: 'Checkpoint: before_building - State before starting building construction',
        checkpointName: 'before_building'
      });

      expect(result.content[0].text).toContain('✅ Checkpoint created: "before_building"');
      expect(result.content[0].text).toContain('Description: State before starting building construction');
      expect(result.content[0].text).toContain('Current position: Operation 6 of 10');
      expect(result.content[0].text).toContain('Total checkpoints: 2');

      expect(mockLogger.info).toHaveBeenCalledWith('Checkpoint created: before_building');
    });

    it('should handle empty name', async () => {
      const args = { name: '' };

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow('Checkpoint name is required');
      
      expect(mockOperationHistory.createCheckpoint).not.toHaveBeenCalled();
      expect(mockOperationHistory.recordOperation).not.toHaveBeenCalled();
    });

    it('should handle zero operations and checkpoints', async () => {
      const args = { name: 'first_checkpoint' };
      
      mockOperationHistory.getStatus.mockReturnValue({
        currentIndex: -1,
        totalOperations: 0,
        checkpoints: []
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Current position: Operation 0 of 0');
      expect(result.content[0].text).toContain('Total checkpoints: 0');
    });
  });
});

describe('CheckpointRestoreTool', () => {
  let tool: CheckpointRestoreTool;

  beforeEach(() => {
    tool = new CheckpointRestoreTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('checkpoint_restore');
      expect(definition.description).toContain('Restore to a named checkpoint by undoing all operations after it');
      expect(definition.description).toContain('checkpoint_restore({');
    });

    it('should have proper input schema', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      expect(schema.required).toEqual(['name']);
      
      expect(schema.properties.name.type).toBe('string');
      expect(schema.properties.name.description).toContain('Name of the checkpoint to restore to');
    });
  });

  describe('execute', () => {
    it('should handle checkpoint not found with available checkpoints', async () => {
      const args = { name: 'nonexistent' };
      
      mockOperationHistory.getCheckpointIndex.mockReturnValue(null);
      mockOperationHistory.getStatus.mockReturnValue({
        checkpoints: ['checkpoint1', 'checkpoint2', 'checkpoint3']
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow();
    });

    it('should handle checkpoint not found with no available checkpoints', async () => {
      const args = { name: 'nonexistent' };
      
      mockOperationHistory.getCheckpointIndex.mockReturnValue(null);
      mockOperationHistory.getStatus.mockReturnValue({
        checkpoints: []
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow();
    });

    it('should handle already at checkpoint', async () => {
      const args = { name: 'current_checkpoint' };
      
      mockOperationHistory.getCheckpointIndex.mockReturnValue(5);
      mockOperationHistory.getStatus.mockReturnValue({
        currentIndex: 5
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toBe('Already at checkpoint "current_checkpoint"');
      expect(mockUndoTool.undoOperation).not.toHaveBeenCalled();
      expect(mockRedoTool.redoOperation).not.toHaveBeenCalled();
    });

    it('should restore by undoing operations', async () => {
      const args = { name: 'earlier_checkpoint' };
      
      mockOperationHistory.getCheckpointIndex.mockReturnValue(2);
      mockOperationHistory.getStatus
        .mockReturnValueOnce({ currentIndex: 5 }) // Initial call
        .mockReturnValueOnce({ currentIndex: 2, totalOperations: 6 }); // Final call
      
      // Mock operations to be undone
      mockOperationHistory.getUndoableOperation
        .mockReturnValueOnce({ description: 'Operation 5' })
        .mockReturnValueOnce({ description: 'Operation 4' })
        .mockReturnValueOnce({ description: 'Operation 3' });

      mockUndoTool.undoOperation.mockResolvedValue(undefined);

      const result = await tool.toMCPTool().handler(args);

      expect(mockUndoTool.undoOperation).toHaveBeenCalledTimes(3);
      expect(mockOperationHistory.markUndone).toHaveBeenCalledTimes(3);
      expect(mockRedoTool.redoOperation).not.toHaveBeenCalled();

      expect(result.content[0].text).toContain('Restored to checkpoint "earlier_checkpoint"');
      expect(result.content[0].text).toContain('Undone 3 operations:');
      expect(result.content[0].text).toContain('↶ Operation 5');
      expect(result.content[0].text).toContain('↶ Operation 4');
      expect(result.content[0].text).toContain('↶ Operation 3');
      expect(result.content[0].text).toContain('Current position: Operation 3 of 6');

      expect(mockLogger.info).toHaveBeenCalledWith('Restored to checkpoint: earlier_checkpoint');
    });

    it('should restore by redoing operations', async () => {
      const args = { name: 'later_checkpoint' };
      
      mockOperationHistory.getCheckpointIndex.mockReturnValue(7);
      mockOperationHistory.getStatus
        .mockReturnValueOnce({ currentIndex: 4 }) // Initial call
        .mockReturnValueOnce({ currentIndex: 7, totalOperations: 10 }); // Final call
      
      // Mock operations to be redone
      mockOperationHistory.getRedoableOperation
        .mockReturnValueOnce({ description: 'Operation 6' })
        .mockReturnValueOnce({ description: 'Operation 7' })
        .mockReturnValueOnce({ description: 'Operation 8' });

      mockRedoTool.redoOperation.mockResolvedValue(undefined);

      const result = await tool.toMCPTool().handler(args);

      expect(mockRedoTool.redoOperation).toHaveBeenCalledTimes(3);
      expect(mockOperationHistory.markRedone).toHaveBeenCalledTimes(3);
      expect(mockUndoTool.undoOperation).not.toHaveBeenCalled();

      expect(result.content[0].text).toContain('Restored to checkpoint "later_checkpoint"');
      expect(result.content[0].text).toContain('Redone 3 operations:');
      expect(result.content[0].text).toContain('↷ Operation 6');
      expect(result.content[0].text).toContain('↷ Operation 7');
      expect(result.content[0].text).toContain('↷ Operation 8');
      expect(result.content[0].text).toContain('Current position: Operation 8 of 10');
    });

    it('should handle undo errors gracefully', async () => {
      const args = { name: 'checkpoint_with_errors' };
      
      mockOperationHistory.getCheckpointIndex.mockReturnValue(1);
      mockOperationHistory.getStatus
        .mockReturnValueOnce({ currentIndex: 3 })
        .mockReturnValueOnce({ currentIndex: 2, totalOperations: 5 });
      
      mockOperationHistory.getUndoableOperation
        .mockReturnValueOnce({ description: 'Operation 3' })
        .mockReturnValueOnce({ description: 'Operation 2' });

      mockUndoTool.undoOperation
        .mockResolvedValueOnce(undefined) // First undo succeeds
        .mockRejectedValueOnce(new Error('Undo failed')); // Second undo fails

      const result = await tool.toMCPTool().handler(args);

      expect(mockUndoTool.undoOperation).toHaveBeenCalledTimes(2);
      expect(mockOperationHistory.markUndone).toHaveBeenCalledTimes(1); // Only one succeeded

      expect(result.content[0].text).toContain('Restored to checkpoint "checkpoint_with_errors"');
      expect(result.content[0].text).toContain('Undone 1 operation:');
      expect(result.content[0].text).toContain('↶ Operation 3');
      expect(result.content[0].text).toContain('⚠️  1 error occurred:');
      expect(result.content[0].text).toContain('✗ Failed to undo: Operation 2');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to undo during checkpoint restore: Error: Undo failed'
      );
    });

    it('should handle redo errors gracefully', async () => {
      const args = { name: 'checkpoint_with_redo_errors' };
      
      mockOperationHistory.getCheckpointIndex.mockReturnValue(5);
      mockOperationHistory.getStatus
        .mockReturnValueOnce({ currentIndex: 2 })
        .mockReturnValueOnce({ currentIndex: 4, totalOperations: 8 });
      
      mockOperationHistory.getRedoableOperation
        .mockReturnValueOnce({ description: 'Operation 4' })
        .mockReturnValueOnce({ description: 'Operation 5' })
        .mockReturnValueOnce({ description: 'Operation 6' });

      mockRedoTool.redoOperation
        .mockResolvedValueOnce(undefined) // First redo succeeds
        .mockResolvedValueOnce(undefined) // Second redo succeeds
        .mockRejectedValueOnce(new Error('Redo failed')); // Third redo fails

      const result = await tool.toMCPTool().handler(args);

      expect(mockRedoTool.redoOperation).toHaveBeenCalledTimes(3);
      expect(mockOperationHistory.markRedone).toHaveBeenCalledTimes(2); // Two succeeded

      expect(result.content[0].text).toContain('Redone 2 operations:');
      expect(result.content[0].text).toContain('↷ Operation 4');
      expect(result.content[0].text).toContain('↷ Operation 5');
      expect(result.content[0].text).toContain('⚠️  1 error occurred:');
      expect(result.content[0].text).toContain('✗ Failed to redo: Operation 6');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to redo during checkpoint restore: Error: Redo failed'
      );
    });

    it('should handle mixed operations and multiple errors', async () => {
      const args = { name: 'complex_checkpoint' };
      
      // This would be a complex scenario but the tool doesn't mix undo/redo in one restore
      // Let's test a scenario with multiple undo errors
      mockOperationHistory.getCheckpointIndex.mockReturnValue(0);
      mockOperationHistory.getStatus
        .mockReturnValueOnce({ currentIndex: 3 })
        .mockReturnValueOnce({ currentIndex: 1, totalOperations: 6 });
      
      mockOperationHistory.getUndoableOperation
        .mockReturnValueOnce({ description: 'Operation 3' })
        .mockReturnValueOnce({ description: 'Operation 2' })
        .mockReturnValueOnce({ description: 'Operation 1' });

      mockUndoTool.undoOperation
        .mockResolvedValueOnce(undefined) // First succeeds
        .mockRejectedValueOnce(new Error('Error 1')) // Second fails
        .mockRejectedValueOnce(new Error('Error 2')); // Third fails (shouldn't be called)

      const result = await tool.toMCPTool().handler(args);

      // Should stop after first error
      expect(mockUndoTool.undoOperation).toHaveBeenCalledTimes(2);
      expect(mockOperationHistory.markUndone).toHaveBeenCalledTimes(1);

      expect(result.content[0].text).toContain('Undone 1 operation:');
      expect(result.content[0].text).toContain('⚠️  1 error occurred:');
      expect(result.content[0].text).toContain('✗ Failed to undo: Operation 2');
    });

    it('should handle empty checkpoint name', async () => {
      const args = { name: '' };

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow('Checkpoint name is required');
    });

    it('should handle operations with errors gracefully', async () => {
      const args = { name: 'single_op_checkpoint' };
      
      mockOperationHistory.getCheckpointIndex.mockReturnValue(4);
      mockOperationHistory.getStatus
        .mockReturnValueOnce({ currentIndex: 5 })
        .mockReturnValueOnce({ currentIndex: 4, totalOperations: 7 });
      
      // Mock the operation to fail
      const operation = { description: 'Operation 1' };
      mockOperationHistory.getUndoableOperation.mockReturnValueOnce(operation);
      mockUndoTool.undoOperation.mockRejectedValueOnce(new Error('Mock error'));

      const result = await tool.toMCPTool().handler(args);

      // Since the operation fails, we should see the error
      expect(result.content[0].text).toContain('⚠️  1 error occurred:');
      expect(result.content[0].text).toContain('✗ Failed to undo: Operation 1');
    });

    it('should handle operation flow correctly', async () => {
      const args = { name: 'error_checkpoint' };
      
      mockOperationHistory.getCheckpointIndex.mockReturnValue(1);
      mockOperationHistory.getStatus
        .mockReturnValueOnce({ currentIndex: 3 })
        .mockReturnValueOnce({ currentIndex: 2, totalOperations: 5 });
      
      // Mock single operation that fails
      mockOperationHistory.getUndoableOperation.mockReturnValueOnce({ description: 'Operation 1' });
      mockUndoTool.undoOperation.mockRejectedValueOnce(new Error('First fails'));

      const result = await tool.toMCPTool().handler(args);

      // Should show error for the failed operation
      expect(result.content[0].text).toContain('⚠️  1 error occurred:');
      expect(result.content[0].text).toContain('✗ Failed to undo: Operation 1');
      expect(result.content[0].text).toContain('Current position: Operation 3 of 5');
    });
  });
});