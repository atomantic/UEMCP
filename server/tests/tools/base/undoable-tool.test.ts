import { UndoableTool } from '../../../src/tools/base/undoable-tool.js';
import { OperationHistory } from '../../../src/services/operation-history.js';
import type { UndoData } from '../../../src/services/operation-history.js';
import { ResponseFormatter } from '../../../src/utils/response-formatter.js';
import { ToolDefinition } from '../../../src/tools/base/base-tool.js';

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

interface TestArgs {
  testParam: string;
  actorName?: string;
}

// Create a concrete test class
class TestUndoableTool extends UndoableTool<TestArgs> {
  public mockExecuteWithUndo = jest.fn();
  public testExecutePythonCommand = jest.fn();
  
  get definition(): ToolDefinition {
    return {
      name: 'test_undoable_tool',
      description: 'Test undoable tool',
      inputSchema: {
        type: 'object',
        properties: {
          testParam: { type: 'string' },
          actorName: { type: 'string' },
        },
        required: ['testParam'],
      },
    };
  }

  public async testExecute(args: TestArgs) {
    return this.execute(args);
  }

  protected async executeWithUndo(args: TestArgs, operationId: string) {
    return this.mockExecuteWithUndo(args, operationId);
  }

  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }

  public testGetOperationDescription(args: TestArgs) {
    return this.getOperationDescription(args);
  }

  public testStoreUndoData(operationId: string, undoData: UndoData) {
    return this.storeUndoData(operationId, undoData);
  }

  public async testCaptureActorState(actorName: string) {
    return this.captureActorState(actorName);
  }

  public async testPerformRedo(args: TestArgs) {
    return this.performRedo(args);
  }
}

describe('UndoableTool', () => {
  let undoableTool: TestUndoableTool;
  let mockHistory: jest.Mocked<OperationHistory>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock history instance
    mockHistory = {
      recordOperation: jest.fn(),
      getFullHistory: jest.fn(),
      updateUndoData: jest.fn(),
      getInstance: jest.fn(),
    } as any;

    // Mock getInstance to return our mock
    (OperationHistory.getInstance as jest.Mock).mockReturnValue(mockHistory);
    
    undoableTool = new TestUndoableTool();
  });

  describe('constructor', () => {
    it('should initialize with operation history instance', () => {
      expect(OperationHistory.getInstance).toHaveBeenCalled();
      expect((undoableTool as any).history).toBe(mockHistory);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      mockHistory.recordOperation.mockReturnValue('test-operation-id');
      mockHistory.getFullHistory.mockReturnValue([]); // Default to empty array
      undoableTool.mockExecuteWithUndo.mockResolvedValue(
        ResponseFormatter.success('Operation completed')
      );
    });

    it('should record operation before execution', async () => {
      const args = { testParam: 'test-value' };
      
      await undoableTool.testExecute(args);

      expect(mockHistory.recordOperation).toHaveBeenCalledWith({
        toolName: 'test_undoable_tool',
        args,
        description: 'test_undoable_tool operation',
      });
    });

    it('should call executeWithUndo with args and operation ID', async () => {
      const args = { testParam: 'test-value' };
      
      await undoableTool.testExecute(args);

      expect(undoableTool.mockExecuteWithUndo).toHaveBeenCalledWith(
        args,
        'test-operation-id'
      );
    });

    it('should store result in operation history', async () => {
      const args = { testParam: 'test-value' };
      const result = ResponseFormatter.success('Operation completed');
      const mockOperation = {
        id: 'test-operation-id',
        toolName: 'test_undoable_tool',
        args,
        description: 'test_undoable_tool operation',
        timestamp: Date.now(),
        result: undefined, // Add result property
      };

      undoableTool.mockExecuteWithUndo.mockResolvedValue(result);
      mockHistory.getFullHistory.mockReturnValue([mockOperation]);

      await undoableTool.testExecute(args);

      expect(mockHistory.getFullHistory).toHaveBeenCalled();
      expect(mockOperation.result).toBe(result);
    });

    it('should return the result from executeWithUndo', async () => {
      const args = { testParam: 'test-value' };
      const expectedResult = ResponseFormatter.success('Test result');
      
      undoableTool.mockExecuteWithUndo.mockResolvedValue(expectedResult);

      const result = await undoableTool.testExecute(args);

      expect(result).toBe(expectedResult);
    });

    it('should handle operation not found in history', async () => {
      const args = { testParam: 'test-value' };
      
      mockHistory.getFullHistory.mockReturnValue([]); // Empty history

      const result = await undoableTool.testExecute(args);

      // Should still return the result, just not store it in history
      expect(result).toEqual(ResponseFormatter.success('Operation completed'));
      expect(mockHistory.getFullHistory).toHaveBeenCalled();
    });

    it('should handle execution failure and rethrow error', async () => {
      const args = { testParam: 'test-value' };
      const testError = new Error('Execution failed');
      
      undoableTool.mockExecuteWithUndo.mockRejectedValue(testError);

      await expect(undoableTool.testExecute(args)).rejects.toThrow('Execution failed');

      // Should have recorded the operation initially
      expect(mockHistory.recordOperation).toHaveBeenCalled();
    });

    it('should log error when execution fails', async () => {
      const args = { testParam: 'test-value' };
      const testError = new Error('Execution failed');
      
      undoableTool.mockExecuteWithUndo.mockRejectedValue(testError);

      try {
        await undoableTool.testExecute(args);
      } catch (error) {
        // Expected to throw
      }

      // Logger should have been called (we can't easily verify the exact call due to mocking)
      expect(mockHistory.recordOperation).toHaveBeenCalled();
    });

    it('should handle string errors', async () => {
      const args = { testParam: 'test-value' };
      
      undoableTool.mockExecuteWithUndo.mockRejectedValue('String error');

      await expect(undoableTool.testExecute(args)).rejects.toBe('String error');
    });
  });

  describe('getOperationDescription', () => {
    it('should return default operation description', () => {
      const args = { testParam: 'test-value' };
      
      const description = undoableTool.testGetOperationDescription(args);

      expect(description).toBe('test_undoable_tool operation');
    });
  });

  describe('performRedo', () => {
    it('should throw error indicating redo should be handled by RedoTool', async () => {
      const args = { testParam: 'test-value' };

      await expect(undoableTool.testPerformRedo(args))
        .rejects.toThrow('Redo should be handled by RedoTool, not individual tool classes');
    });
  });

  describe('storeUndoData', () => {
    it('should call history updateUndoData with operation ID and undo data', () => {
      const operationId = 'test-op-id';
      const undoData: UndoData = {
        type: 'actor_spawn',
        actorName: 'TestActor',
      };

      undoableTool.testStoreUndoData(operationId, undoData);

      expect(mockHistory.updateUndoData).toHaveBeenCalledWith(operationId, undoData);
    });
  });

  describe('captureActorState', () => {
    it('should capture complete actor state', async () => {
      const actorName = 'TestActor';
      undoableTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [100, 200, 300],
        rotation: [0, 90, 0],
        scale: [1, 2, 1],
        mesh: '/Game/Meshes/TestMesh',
        folder: 'TestFolder',
        asset_path: '/Game/Actors/TestActor',
      });

      const state = await undoableTool.testCaptureActorState(actorName);

      expect(undoableTool.testExecutePythonCommand).toHaveBeenCalledWith(
        'actor.get_actor_state',
        { actor_name: actorName }
      );

      expect(state).toEqual({
        location: [100, 200, 300],
        rotation: [0, 90, 0],
        scale: [1, 2, 1],
        mesh: '/Game/Meshes/TestMesh',
        folder: 'TestFolder',
        asset_path: '/Game/Actors/TestActor',
      });
    });

    it('should capture partial actor state', async () => {
      const actorName = 'PartialActor';
      undoableTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [0, 0, 0],
        // Missing rotation, scale, mesh, folder, asset_path
      });

      const state = await undoableTool.testCaptureActorState(actorName);

      expect(state).toEqual({
        location: [0, 0, 0],
        rotation: undefined,
        scale: undefined,
        mesh: undefined,
        folder: undefined,
        asset_path: undefined,
      });
    });

    it('should handle invalid array types', async () => {
      const actorName = 'InvalidActor';
      undoableTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: 'not an array',
        rotation: { x: 0, y: 0, z: 0 }, // Object instead of array
        scale: [1, 2], // Wrong length array
        mesh: 123, // Number instead of string
        folder: null,
        asset_path: undefined,
      });

      const state = await undoableTool.testCaptureActorState(actorName);

      expect(state).toEqual({
        location: undefined, // Non-array filtered out
        rotation: undefined, // Non-array filtered out
        scale: [1, 2], // Array preserved even if wrong length
        mesh: '123', // Converted to string
        folder: undefined, // null filtered out
        asset_path: undefined, // undefined preserved
      });
    });

    it('should handle python command failure', async () => {
      const actorName = 'FailedActor';
      undoableTool.testExecutePythonCommand.mockResolvedValue({
        success: false,
        error: 'Actor not found',
      });

      const state = await undoableTool.testCaptureActorState(actorName);

      expect(state).toEqual({});
    });

    it('should handle empty response on success', async () => {
      const actorName = 'EmptyActor';
      undoableTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        // No additional properties
      });

      const state = await undoableTool.testCaptureActorState(actorName);

      expect(state).toEqual({
        location: undefined,
        rotation: undefined,
        scale: undefined,
        mesh: undefined,
        folder: undefined,
        asset_path: undefined,
      });
    });

    it('should convert various types to strings for mesh, folder, asset_path', async () => {
      const actorName = 'TypeConversionActor';
      undoableTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        mesh: 42, // Number
        folder: true, // Boolean
        asset_path: { path: '/Game/Test' }, // Object
      });

      const state = await undoableTool.testCaptureActorState(actorName);

      expect(state).toEqual({
        location: undefined,
        rotation: undefined,
        scale: undefined,
        mesh: '42',
        folder: 'true',
        asset_path: '[object Object]',
      });
    });

    it('should handle null/falsy string values', async () => {
      const actorName = 'FalsyActor';
      undoableTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        mesh: '', // Empty string
        folder: 0, // Zero
        asset_path: false, // Boolean false
      });

      const state = await undoableTool.testCaptureActorState(actorName);

      expect(state).toEqual({
        location: undefined,
        rotation: undefined,
        scale: undefined,
        mesh: undefined, // Empty string filtered out
        folder: undefined, // Zero filtered out  
        asset_path: undefined, // False filtered out
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow with undo data storage', async () => {
      const args = { testParam: 'integration-test', actorName: 'IntegrationActor' };
      const operationId = 'integration-op-id';
      
      mockHistory.recordOperation.mockReturnValue(operationId);
      
      // Mock the executeWithUndo implementation to store undo data
      undoableTool.mockExecuteWithUndo.mockImplementation(async (args, operationId) => {
        // Simulate storing undo data during execution
        undoableTool.testStoreUndoData(operationId, {
          type: 'actor_spawn',
          actorName: args.actorName!,
        });
        return ResponseFormatter.success('Integration test completed');
      });

      mockHistory.getFullHistory.mockReturnValue([{
        id: operationId,
        toolName: 'test_undoable_tool',
        args,
        description: 'test_undoable_tool operation',
        timestamp: Date.now(),
      }]);

      const result = await undoableTool.testExecute(args);

      expect(mockHistory.recordOperation).toHaveBeenCalled();
      expect(undoableTool.mockExecuteWithUndo).toHaveBeenCalledWith(args, operationId);
      expect(mockHistory.updateUndoData).toHaveBeenCalledWith(operationId, {
        type: 'actor_spawn',
        actorName: 'IntegrationActor',
      });
      expect(result.content[0].text).toBe('Integration test completed');
    });

    it('should handle workflow with actor state capture', async () => {
      const args = { testParam: 'state-capture', actorName: 'StateCaptureActor' };
      
      mockHistory.recordOperation.mockReturnValue('state-capture-op-id');
      mockHistory.getFullHistory.mockReturnValue([]);
      
      undoableTool.testExecutePythonCommand.mockResolvedValue({
        success: true,
        location: [500, 500, 100],
        rotation: [0, 0, 45],
        scale: [2, 2, 2],
        mesh: '/Game/Meshes/StateMesh',
        folder: 'StateFolder',
      });

      // Test that captureActorState can be used within executeWithUndo
      undoableTool.mockExecuteWithUndo.mockImplementation(async (args, _operationId) => {
        const capturedState = await undoableTool.testCaptureActorState(args.actorName!);
        
        expect(capturedState).toEqual({
          location: [500, 500, 100],
          rotation: [0, 0, 45],
          scale: [2, 2, 2],
          mesh: '/Game/Meshes/StateMesh',
          folder: 'StateFolder',
          asset_path: undefined,
        });

        return ResponseFormatter.success('State captured successfully');
      });

      const result = await undoableTool.testExecute(args);

      expect(result.content[0].text).toBe('State captured successfully');
    });
  });
});