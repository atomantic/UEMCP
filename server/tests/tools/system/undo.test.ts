import { UndoTool } from '../../../src/tools/system/undo.js';
import { OperationHistory } from '../../../src/services/operation-history.js';
import type { OperationRecord, UndoData } from '../../../src/services/operation-history.js';

// Mock the OperationHistory service
jest.mock('../../../src/services/operation-history.js');
// Mock logger
jest.mock('../../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Create a test class that exposes the protected methods
class TestUndoTool extends UndoTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public async testPerformUndo(operation: OperationRecord) {
    return this.performUndo(operation);
  }

  public testExecutePythonCommand = jest.fn();
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }
}

describe('UndoTool', () => {
  let undoTool: TestUndoTool;
  let mockHistory: jest.Mocked<OperationHistory>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock history instance
    mockHistory = {
      getUndoableOperation: jest.fn(),
      markUndone: jest.fn(),
      getStatus: jest.fn(),
    } as any;

    // Mock getInstance to return our mock
    (OperationHistory.getInstance as jest.Mock).mockReturnValue(mockHistory);
    
    undoTool = new TestUndoTool();
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = undoTool.definition;
      
      expect(definition.name).toBe('undo');
      expect(definition.description).toContain('Undo the last operation');
      expect((definition.inputSchema as any).type).toBe('object');
      expect((definition.inputSchema as any).properties.count).toBeDefined();
    });

    it('should have correct default values and constraints', () => {
      const definition = undoTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.count.default).toBe(1);
      expect(properties.count.minimum).toBe(1);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Mock successful Python command execution
      undoTool.testExecutePythonCommand.mockResolvedValue({ success: true });
    });

    it('should handle no operations to undo', async () => {
      mockHistory.getUndoableOperation.mockReturnValue(null);

      const result = await undoTool.testExecute({});

      expect(result.content[0].text).toBe('No operations to undo');
      expect(mockHistory.getUndoableOperation).toHaveBeenCalledTimes(1);
    });

    it('should undo single operation successfully', async () => {
      const mockOp: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: {},
        description: 'Spawn test actor',
        timestamp: Date.now(),
        undoData: { type: 'actor_spawn', actorName: 'TestActor' } as UndoData,
      };

      mockHistory.getUndoableOperation.mockReturnValue(mockOp);
      mockHistory.getStatus.mockReturnValue({
        currentIndex: 0,
        totalOperations: 1,
        canUndo: false,
        canRedo: true,
        checkpoints: [],
      });

      const result = await undoTool.testExecute({});

      expect(result.content[0].text).toContain('Successfully undone 1 operation:');
      expect(result.content[0].text).toContain('✓ Spawn test actor (actor_spawn)');
      expect(result.content[0].text).toContain('History: 1/1 operations');
      expect(mockHistory.markUndone).toHaveBeenCalledTimes(1);
    });

    it('should undo multiple operations successfully', async () => {
      const mockOps: OperationRecord[] = [
        {
          id: 'op1',
          toolName: 'actor_spawn',
          args: {},
          description: 'Spawn actor 1',
          timestamp: Date.now(),
          undoData: { type: 'actor_spawn', actorName: 'Actor1' } as UndoData,
        },
        {
          id: 'op2',
          toolName: 'actor_spawn',
          args: {},
          description: 'Spawn actor 2',
          timestamp: Date.now(),
          undoData: { type: 'actor_spawn', actorName: 'Actor2' } as UndoData,
        },
      ];

      mockHistory.getUndoableOperation
        .mockReturnValueOnce(mockOps[1])
        .mockReturnValueOnce(mockOps[0])
        .mockReturnValue(null);

      mockHistory.getStatus.mockReturnValue({
        currentIndex: -1,
        totalOperations: 2,
        canUndo: false,
        canRedo: false,
        checkpoints: [],
      });

      const result = await undoTool.testExecute({ count: 2 });

      expect(result.content[0].text).toContain('Successfully undone 2 operations:');
      expect(result.content[0].text).toContain('✓ Spawn actor 2 (actor_spawn)');
      expect(result.content[0].text).toContain('✓ Spawn actor 1 (actor_spawn)');
      expect(mockHistory.markUndone).toHaveBeenCalledTimes(2);
    });

    it('should handle operation without undo data', async () => {
      const mockOp: OperationRecord = {
        id: 'op1',
        toolName: 'viewport_screenshot',
        args: {},
        description: 'Take screenshot',
        timestamp: Date.now(),
        // No undoData
      };

      mockHistory.getUndoableOperation.mockReturnValue(mockOp);
      mockHistory.getStatus.mockReturnValue({
        currentIndex: 0,
        totalOperations: 1,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });

      const result = await undoTool.testExecute({});

      expect(result.content[0].text).toContain('Failed to undo 1 operation:');
      expect(result.content[0].text).toContain('✗ Take screenshot (no undo data)');
      expect(mockHistory.markUndone).not.toHaveBeenCalled();
    });

    it('should handle undo failure and stop', async () => {
      const mockOps: OperationRecord[] = [
        {
          id: 'op1',
          toolName: 'actor_spawn',
          args: {},
          description: 'Spawn working actor',
          timestamp: Date.now(),
          undoData: { type: 'actor_spawn', actorName: 'WorkingActor' } as UndoData,
        },
        {
          id: 'op2',
          toolName: 'actor_spawn',
          args: {},
          description: 'Spawn failing actor',
          timestamp: Date.now(),
          undoData: { type: 'actor_spawn', actorName: 'FailingActor' } as UndoData,
        },
      ];

      mockHistory.getUndoableOperation
        .mockReturnValueOnce(mockOps[1])
        .mockReturnValueOnce(mockOps[0]);

      // First call succeeds, second fails
      undoTool.testExecutePythonCommand
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Actor not found'));

      mockHistory.getStatus.mockReturnValue({
        currentIndex: 1,
        totalOperations: 2,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });

      const result = await undoTool.testExecute({ count: 2 });

      expect(result.content[0].text).toContain('Successfully undone 1 operation:');
      expect(result.content[0].text).toContain('✓ Spawn failing actor (actor_spawn)');
      expect(result.content[0].text).toContain('Failed to undo 1 operation:');
      expect(result.content[0].text).toContain('✗ Spawn working actor (Actor not found)');
      expect(mockHistory.markUndone).toHaveBeenCalledTimes(1);
    });

    it('should use default count of 1 when not specified', async () => {
      const mockOp: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: {},
        description: 'Spawn actor',
        timestamp: Date.now(),
        undoData: { type: 'actor_spawn', actorName: 'Actor' } as UndoData,
      };

      mockHistory.getUndoableOperation.mockReturnValue(mockOp);
      mockHistory.getStatus.mockReturnValue({
        currentIndex: 0,
        totalOperations: 1,
        canUndo: false,
        canRedo: true,
        checkpoints: [],
      });

      await undoTool.testExecute({});

      expect(mockHistory.getUndoableOperation).toHaveBeenCalledTimes(1);
    });

    it('should show redo status when available', async () => {
      const mockOp: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: {},
        description: 'Spawn actor',
        timestamp: Date.now(),
        undoData: { type: 'actor_spawn', actorName: 'Actor' } as UndoData,
      };

      mockHistory.getUndoableOperation.mockReturnValue(mockOp);
      mockHistory.getStatus.mockReturnValue({
        currentIndex: 1,
        totalOperations: 3,
        canUndo: true,
        canRedo: true,
        checkpoints: [],
      });

      const result = await undoTool.testExecute({});

      expect(result.content[0].text).toContain('History: 2/3 operations (1 available for redo)');
    });
  });

  describe('performUndo', () => {
    beforeEach(() => {
      undoTool.testExecutePythonCommand.mockResolvedValue({ success: true });
    });

    it('should throw error for operation without undo data', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'test',
        args: {},
        description: 'Test operation',
        timestamp: Date.now(),
      };

      await expect(undoTool.testPerformUndo(operation))
        .rejects.toThrow('No undo data available for operation (ID: op1)');
    });

    it('should handle actor_spawn undo', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: {},
        description: 'Spawn actor',
        timestamp: Date.now(),
        undoData: { type: 'actor_spawn', actorName: 'TestActor' } as UndoData,
      };

      await undoTool.testPerformUndo(operation);

      expect(undoTool.testExecutePythonCommand).toHaveBeenCalledWith('actor.delete', {
        actor_name: 'TestActor',
      });
    });

    it('should handle actor_delete undo', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'actor_delete',
        args: {},
        description: 'Delete actor',
        timestamp: Date.now(),
        undoData: {
          type: 'actor_delete',
          actorData: {
            assetPath: '/Game/Test',
            location: [100, 200, 300],
            rotation: [0, 0, 90],
            scale: [1, 1, 1],
            name: 'TestActor',
          },
        } as UndoData,
      };

      await undoTool.testPerformUndo(operation);

      expect(undoTool.testExecutePythonCommand).toHaveBeenCalledWith('actor.spawn', {
        asset_path: '/Game/Test',
        location: [100, 200, 300],
        rotation: [0, 0, 90],
        scale: [1, 1, 1],
        name: 'TestActor',
      });
    });

    it('should handle actor_modify undo', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'actor_modify',
        args: {},
        description: 'Modify actor',
        timestamp: Date.now(),
        undoData: {
          type: 'actor_modify',
          actorName: 'TestActor',
          previousState: {
            location: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            mesh: '/Game/OldMesh',
          },
        } as UndoData,
      };

      await undoTool.testPerformUndo(operation);

      expect(undoTool.testExecutePythonCommand).toHaveBeenCalledWith('actor.modify', {
        actor_name: 'TestActor',
        location: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        mesh: '/Game/OldMesh',
      });
    });

    it('should handle actor_modify undo with partial previous state', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'actor_modify',
        args: {},
        description: 'Modify actor location',
        timestamp: Date.now(),
        undoData: {
          type: 'actor_modify',
          actorName: 'TestActor',
          previousState: {
            location: [100, 200, 300],
            // rotation and scale undefined
          },
        } as UndoData,
      };

      await undoTool.testPerformUndo(operation);

      expect(undoTool.testExecutePythonCommand).toHaveBeenCalledWith('actor.modify', {
        actor_name: 'TestActor',
        location: [100, 200, 300],
      });
    });

    it('should handle material_apply undo', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'material_apply',
        args: {},
        description: 'Apply material',
        timestamp: Date.now(),
        undoData: {
          type: 'material_apply',
          actorName: 'TestActor',
          previousMaterial: '/Game/Materials/OldMaterial',
          materialSlot: 1,
        } as UndoData,
      };

      await undoTool.testPerformUndo(operation);

      expect(undoTool.testExecutePythonCommand).toHaveBeenCalledWith('material.apply', {
        actor_name: 'TestActor',
        material_path: '/Game/Materials/OldMaterial',
        slot_index: 1,
      });
    });

    it('should handle material_apply undo with default slot', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'material_apply',
        args: {},
        description: 'Apply material',
        timestamp: Date.now(),
        undoData: {
          type: 'material_apply',
          actorName: 'TestActor',
          previousMaterial: '/Game/Materials/OldMaterial',
          // materialSlot not specified
        } as UndoData,
      };

      await undoTool.testPerformUndo(operation);

      expect(undoTool.testExecutePythonCommand).toHaveBeenCalledWith('material.apply', {
        actor_name: 'TestActor',
        material_path: '/Game/Materials/OldMaterial',
        slot_index: 0,
      });
    });

    it('should handle material_apply undo with null previous material', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'material_apply',
        args: {},
        description: 'Apply material',
        timestamp: Date.now(),
        undoData: {
          type: 'material_apply',
          actorName: 'TestActor',
          previousMaterial: null as any,
          materialSlot: 0,
        } as UndoData,
      };

      await undoTool.testPerformUndo(operation);

      expect(undoTool.testExecutePythonCommand).toHaveBeenCalledWith('material.apply', {
        actor_name: 'TestActor',
        material_path: null,
        slot_index: 0,
      });
    });

    it('should reject level_save undo', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'level_save',
        args: {},
        description: 'Save level',
        timestamp: Date.now(),
        undoData: { type: 'level_save' } as UndoData,
      };

      await expect(undoTool.testPerformUndo(operation))
        .rejects.toThrow('Level save cannot be undone');
    });

    it('should reject custom undo', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'custom',
        args: {},
        description: 'Custom operation',
        timestamp: Date.now(),
        undoData: { type: 'custom', customData: { test: true } } as UndoData,
      };

      await expect(undoTool.testPerformUndo(operation))
        .rejects.toThrow('Custom undo not implemented');
    });

    it('should reject unknown undo type', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'unknown',
        args: {},
        description: 'Unknown operation',
        timestamp: Date.now(),
        undoData: { type: 'unknown_type' as any } as UndoData,
      };

      await expect(undoTool.testPerformUndo(operation))
        .rejects.toThrow('Unknown undo type: unknown_type');
    });

    it('should handle missing actor name for actor_spawn', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: {},
        description: 'Spawn actor',
        timestamp: Date.now(),
        undoData: { type: 'actor_spawn' } as UndoData, // No actorName
      };

      // Should not throw, just not call executePythonCommand
      await undoTool.testPerformUndo(operation);

      expect(undoTool.testExecutePythonCommand).not.toHaveBeenCalled();
    });

    it('should handle missing actor data for actor_delete', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'actor_delete',
        args: {},
        description: 'Delete actor',
        timestamp: Date.now(),
        undoData: { type: 'actor_delete' } as UndoData, // No actorData
      };

      await undoTool.testPerformUndo(operation);

      expect(undoTool.testExecutePythonCommand).not.toHaveBeenCalled();
    });

    it('should handle missing data for actor_modify', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'actor_modify',
        args: {},
        description: 'Modify actor',
        timestamp: Date.now(),
        undoData: { type: 'actor_modify' } as UndoData, // No actorName or previousState
      };

      await undoTool.testPerformUndo(operation);

      expect(undoTool.testExecutePythonCommand).not.toHaveBeenCalled();
    });
  });

  describe('undoOperation (public method)', () => {
    it('should delegate to performUndo', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: {},
        description: 'Spawn actor',
        timestamp: Date.now(),
        undoData: { type: 'actor_spawn', actorName: 'TestActor' } as UndoData,
      };

      undoTool.testExecutePythonCommand.mockResolvedValue({ success: true });
      
      await undoTool.undoOperation(operation);

      expect(undoTool.testExecutePythonCommand).toHaveBeenCalledWith('actor.delete', {
        actor_name: 'TestActor',
      });
    });
  });

  describe('error handling', () => {
    it('should handle string errors gracefully', async () => {
      const mockOp: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: {},
        description: 'Spawn actor',
        timestamp: Date.now(),
        undoData: { type: 'actor_spawn', actorName: 'Actor' } as UndoData,
      };

      mockHistory.getUndoableOperation.mockReturnValue(mockOp);
      mockHistory.getStatus.mockReturnValue({
        currentIndex: 0,
        totalOperations: 1,
        canUndo: false,
        canRedo: false,
        checkpoints: [],
      });

      undoTool.testExecutePythonCommand.mockRejectedValue('String error');

      const result = await undoTool.testExecute({});

      expect(result.content[0].text).toContain('Failed to undo 1 operation:');
      expect(result.content[0].text).toContain('✗ Spawn actor (String error)');
    });

    it('should handle operation without ID gracefully', async () => {
      const operation: OperationRecord = {
        toolName: 'test',
        args: {},
        description: 'Test operation',
        timestamp: Date.now(),
        // No id field
      } as any;

      await expect(undoTool.testPerformUndo(operation))
        .rejects.toThrow('No undo data available for operation');
    });
  });
});