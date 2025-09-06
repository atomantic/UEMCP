import { RedoTool } from '../../../src/tools/system/redo.js';
import { OperationHistory } from '../../../src/services/operation-history.js';
import type { OperationRecord } from '../../../src/services/operation-history.js';
import { getPythonCommand } from '../../../src/tools/system/tool-mappings.js';

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
// Mock tool mappings
jest.mock('../../../src/tools/system/tool-mappings.js');

// Create a test class that exposes the protected methods
class TestRedoTool extends RedoTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public async testPerformRedo(operation: OperationRecord) {
    return this.performRedo(operation);
  }

  public testExecutePythonCommand = jest.fn();
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }
}

describe('RedoTool', () => {
  let redoTool: TestRedoTool;
  let mockHistory: jest.Mocked<OperationHistory>;
  let mockGetPythonCommand: jest.MockedFunction<typeof getPythonCommand>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock history instance
    mockHistory = {
      getRedoableOperation: jest.fn(),
      markRedone: jest.fn(),
      getStatus: jest.fn(),
    } as any;

    // Mock getInstance to return our mock
    (OperationHistory.getInstance as jest.Mock).mockReturnValue(mockHistory);
    
    // Mock getPythonCommand
    mockGetPythonCommand = getPythonCommand as jest.MockedFunction<typeof getPythonCommand>;
    
    redoTool = new TestRedoTool();
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = redoTool.definition;
      
      expect(definition.name).toBe('redo');
      expect(definition.description).toContain('Redo previously undone operations');
      expect((definition.inputSchema as any).type).toBe('object');
      expect((definition.inputSchema as any).properties.count).toBeDefined();
    });

    it('should have correct default values and constraints', () => {
      const definition = redoTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.count.default).toBe(1);
      expect(properties.count.minimum).toBe(1);
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Mock successful Python command execution
      redoTool.testExecutePythonCommand.mockResolvedValue({ success: true });
      mockGetPythonCommand.mockReturnValue('actor.spawn');
    });

    it('should handle no operations to redo', async () => {
      mockHistory.getRedoableOperation.mockReturnValue(null);

      const result = await redoTool.testExecute({});

      expect(result.content[0].text).toBe('No operations to redo');
      expect(mockHistory.getRedoableOperation).toHaveBeenCalledTimes(1);
    });

    it('should redo single operation successfully', async () => {
      const mockOp: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: { assetPath: '/Game/Test', location: [0, 0, 0] },
        description: 'Spawn test actor',
        timestamp: Date.now(),
      };

      mockHistory.getRedoableOperation.mockReturnValue(mockOp);
      mockHistory.getStatus.mockReturnValue({
        currentIndex: 1,
        totalOperations: 2,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });

      const result = await redoTool.testExecute({});

      expect(result.content[0].text).toContain('Successfully redone 1 operation:');
      expect(result.content[0].text).toContain('✓ Spawn test actor (actor_spawn)');
      expect(result.content[0].text).toContain('History: 2/2 operations');
      expect(mockHistory.markRedone).toHaveBeenCalledTimes(1);
    });

    it('should redo multiple operations successfully', async () => {
      const mockOps: OperationRecord[] = [
        {
          id: 'op1',
          toolName: 'actor_spawn',
          args: { assetPath: '/Game/Actor1' },
          description: 'Spawn actor 1',
          timestamp: Date.now(),
        },
        {
          id: 'op2',
          toolName: 'actor_modify',
          args: { actorName: 'Actor1', location: [100, 0, 0] },
          description: 'Move actor 1',
          timestamp: Date.now(),
        },
      ];

      mockHistory.getRedoableOperation
        .mockReturnValueOnce(mockOps[0])
        .mockReturnValueOnce(mockOps[1])
        .mockReturnValue(null);

      mockHistory.getStatus.mockReturnValue({
        currentIndex: 3,
        totalOperations: 4,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });

      mockGetPythonCommand
        .mockReturnValueOnce('actor.spawn')
        .mockReturnValueOnce('actor.modify');

      const result = await redoTool.testExecute({ count: 2 });

      expect(result.content[0].text).toContain('Successfully redone 2 operations:');
      expect(result.content[0].text).toContain('✓ Spawn actor 1 (actor_spawn)');
      expect(result.content[0].text).toContain('✓ Move actor 1 (actor_modify)');
      expect(mockHistory.markRedone).toHaveBeenCalledTimes(2);
    });

    it('should handle redo failure and stop', async () => {
      const mockOps: OperationRecord[] = [
        {
          id: 'op1',
          toolName: 'actor_spawn',
          args: { assetPath: '/Game/WorkingActor' },
          description: 'Spawn working actor',
          timestamp: Date.now(),
        },
        {
          id: 'op2',
          toolName: 'actor_spawn',
          args: { assetPath: '/Game/FailingActor' },
          description: 'Spawn failing actor',
          timestamp: Date.now(),
        },
      ];

      mockHistory.getRedoableOperation
        .mockReturnValueOnce(mockOps[0])
        .mockReturnValueOnce(mockOps[1]);

      mockGetPythonCommand.mockReturnValue('actor.spawn');

      // First call succeeds, second fails
      redoTool.testExecutePythonCommand
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Asset not found' });

      mockHistory.getStatus.mockReturnValue({
        currentIndex: 1,
        totalOperations: 3,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });

      const result = await redoTool.testExecute({ count: 2 });

      expect(result.content[0].text).toContain('Successfully redone 1 operation:');
      expect(result.content[0].text).toContain('✓ Spawn working actor (actor_spawn)');
      expect(result.content[0].text).toContain('Failed to redo 1 operation:');
      expect(result.content[0].text).toContain('✗ Spawn failing actor (Asset not found)');
      expect(mockHistory.markRedone).toHaveBeenCalledTimes(1);
    });

    it('should use default count of 1 when not specified', async () => {
      const mockOp: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: {},
        description: 'Spawn actor',
        timestamp: Date.now(),
      };

      mockHistory.getRedoableOperation.mockReturnValue(mockOp);
      mockHistory.getStatus.mockReturnValue({
        currentIndex: 1,
        totalOperations: 2,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });

      await redoTool.testExecute({});

      expect(mockHistory.getRedoableOperation).toHaveBeenCalledTimes(1);
    });

    it('should show undo status when available', async () => {
      const mockOp: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: {},
        description: 'Spawn actor',
        timestamp: Date.now(),
      };

      mockHistory.getRedoableOperation.mockReturnValue(mockOp);
      mockHistory.getStatus.mockReturnValue({
        currentIndex: 2,
        totalOperations: 3,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });

      const result = await redoTool.testExecute({});

      expect(result.content[0].text).toContain('History: 3/3 operations (3 available for undo)');
    });

    it('should handle exception during performRedo', async () => {
      const mockOp: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: {},
        description: 'Spawn actor',
        timestamp: Date.now(),
      };

      mockHistory.getRedoableOperation.mockReturnValue(mockOp);
      mockHistory.getStatus.mockReturnValue({
        currentIndex: 0,
        totalOperations: 1,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });

      mockGetPythonCommand.mockReturnValue('actor.spawn');
      redoTool.testExecutePythonCommand.mockRejectedValue(new Error('Python execution failed'));

      const result = await redoTool.testExecute({});

      expect(result.content[0].text).toContain('Failed to redo 1 operation:');
      expect(result.content[0].text).toContain('✗ Spawn actor (Python execution failed)');
      expect(mockHistory.markRedone).not.toHaveBeenCalled();
    });

    it('should handle string errors gracefully', async () => {
      const mockOp: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: {},
        description: 'Spawn actor',
        timestamp: Date.now(),
      };

      mockHistory.getRedoableOperation.mockReturnValue(mockOp);
      mockHistory.getStatus.mockReturnValue({
        currentIndex: 0,
        totalOperations: 1,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });

      mockGetPythonCommand.mockReturnValue('actor.spawn');
      redoTool.testExecutePythonCommand.mockRejectedValue('String error message');

      const result = await redoTool.testExecute({});

      expect(result.content[0].text).toContain('Failed to redo 1 operation:');
      expect(result.content[0].text).toContain('✗ Spawn actor (String error message)');
    });
  });

  describe('performRedo', () => {
    it('should execute python command for mapped tool', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: { assetPath: '/Game/TestActor', location: [100, 200, 300] },
        description: 'Spawn test actor',
        timestamp: Date.now(),
      };

      mockGetPythonCommand.mockReturnValue('actor.spawn');
      redoTool.testExecutePythonCommand.mockResolvedValue({ success: true });

      await redoTool.testPerformRedo(operation);

      expect(mockGetPythonCommand).toHaveBeenCalledWith('actor_spawn');
      expect(redoTool.testExecutePythonCommand).toHaveBeenCalledWith('actor.spawn', {
        assetPath: '/Game/TestActor',
        location: [100, 200, 300],
      });
    });

    it('should handle python command failure', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: {},
        description: 'Spawn actor',
        timestamp: Date.now(),
      };

      mockGetPythonCommand.mockReturnValue('actor.spawn');
      redoTool.testExecutePythonCommand.mockResolvedValue({
        success: false,
        error: 'Asset path not found',
      });

      await expect(redoTool.testPerformRedo(operation))
        .rejects.toThrow('Asset path not found');
    });

    it('should handle python command failure without error message', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'material_apply',
        args: {},
        description: 'Apply material',
        timestamp: Date.now(),
      };

      mockGetPythonCommand.mockReturnValue('material.apply');
      redoTool.testExecutePythonCommand.mockResolvedValue({ success: false });

      await expect(redoTool.testPerformRedo(operation))
        .rejects.toThrow('Failed to redo material_apply');
    });

    it('should handle unmapped tool', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'unknown_tool',
        args: {},
        description: 'Unknown operation',
        timestamp: Date.now(),
      };

      mockGetPythonCommand.mockReturnValue(undefined);

      await expect(redoTool.testPerformRedo(operation))
        .rejects.toThrow('Redo not available for unknown_tool');

      expect(redoTool.testExecutePythonCommand).not.toHaveBeenCalled();
    });

    it('should handle different tool types', async () => {
      const operations: OperationRecord[] = [
        {
          id: 'op1',
          toolName: 'actor_modify',
          args: { actorName: 'TestActor', location: [0, 0, 100] },
          description: 'Modify actor',
          timestamp: Date.now(),
        },
        {
          id: 'op2',
          toolName: 'material_apply',
          args: { actorName: 'TestActor', materialPath: '/Game/Materials/Test' },
          description: 'Apply material',
          timestamp: Date.now(),
        },
        {
          id: 'op3',
          toolName: 'batch_spawn',
          args: { actors: [{ assetPath: '/Game/Test' }] },
          description: 'Batch spawn',
          timestamp: Date.now(),
        },
      ];

      mockGetPythonCommand
        .mockReturnValueOnce('actor.modify')
        .mockReturnValueOnce('material.apply')
        .mockReturnValueOnce('actor.batch_spawn');

      redoTool.testExecutePythonCommand.mockResolvedValue({ success: true });

      // Test each operation type
      for (const op of operations) {
        await redoTool.testPerformRedo(op);
      }

      expect(redoTool.testExecutePythonCommand).toHaveBeenCalledTimes(3);
      expect(redoTool.testExecutePythonCommand).toHaveBeenNthCalledWith(1, 'actor.modify', operations[0].args);
      expect(redoTool.testExecutePythonCommand).toHaveBeenNthCalledWith(2, 'material.apply', operations[1].args);
      expect(redoTool.testExecutePythonCommand).toHaveBeenNthCalledWith(3, 'actor.batch_spawn', operations[2].args);
    });
  });

  describe('redoOperation (public method)', () => {
    it('should delegate to performRedo', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: { assetPath: '/Game/TestActor' },
        description: 'Spawn actor',
        timestamp: Date.now(),
      };

      mockGetPythonCommand.mockReturnValue('actor.spawn');
      redoTool.testExecutePythonCommand.mockResolvedValue({ success: true });
      
      await redoTool.redoOperation(operation);

      expect(redoTool.testExecutePythonCommand).toHaveBeenCalledWith('actor.spawn', {
        assetPath: '/Game/TestActor',
      });
    });
  });

  describe('complex scenarios', () => {
    it('should handle mixed success and failure operations', async () => {
      const mockOps: OperationRecord[] = [
        {
          id: 'op1',
          toolName: 'actor_spawn',
          args: { assetPath: '/Game/ValidActor' },
          description: 'Spawn valid actor',
          timestamp: Date.now(),
        },
        {
          id: 'op2',
          toolName: 'actor_spawn',
          args: { assetPath: '/Game/InvalidActor' },
          description: 'Spawn invalid actor',
          timestamp: Date.now(),
        },
        {
          id: 'op3',
          toolName: 'unknown_tool',
          args: {},
          description: 'Unknown tool operation',
          timestamp: Date.now(),
        },
      ];

      mockHistory.getRedoableOperation
        .mockReturnValueOnce(mockOps[0])
        .mockReturnValueOnce(mockOps[1])
        .mockReturnValue(null);

      mockGetPythonCommand
        .mockReturnValueOnce('actor.spawn')
        .mockReturnValueOnce('actor.spawn');

      redoTool.testExecutePythonCommand
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Invalid asset path' });

      mockHistory.getStatus.mockReturnValue({
        currentIndex: 1,
        totalOperations: 3,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });

      const result = await redoTool.testExecute({ count: 3 });

      expect(result.content[0].text).toContain('Successfully redone 1 operation:');
      expect(result.content[0].text).toContain('✓ Spawn valid actor (actor_spawn)');
      expect(result.content[0].text).toContain('Failed to redo 1 operation:');
      expect(result.content[0].text).toContain('✗ Spawn invalid actor (Invalid asset path)');
      expect(mockHistory.markRedone).toHaveBeenCalledTimes(1);
    });

    it('should handle empty args object', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'level_save',
        args: {},
        description: 'Save level',
        timestamp: Date.now(),
      };

      mockGetPythonCommand.mockReturnValue('level.save');
      redoTool.testExecutePythonCommand.mockResolvedValue({ success: true });

      await redoTool.testPerformRedo(operation);

      expect(redoTool.testExecutePythonCommand).toHaveBeenCalledWith('level.save', {});
    });

    it('should handle null args', async () => {
      const operation: OperationRecord = {
        id: 'op1',
        toolName: 'test_tool',
        args: null as any,
        description: 'Test operation',
        timestamp: Date.now(),
      };

      mockGetPythonCommand.mockReturnValue('test.command');
      redoTool.testExecutePythonCommand.mockResolvedValue({ success: true });

      await redoTool.testPerformRedo(operation);

      expect(redoTool.testExecutePythonCommand).toHaveBeenCalledWith('test.command', null);
    });
  });
});