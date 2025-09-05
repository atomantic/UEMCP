import { HistoryListTool } from '../../../src/tools/system/history-list.js';
import { OperationHistory } from '../../../src/services/operation-history.js';
import type { OperationRecord, UndoData } from '../../../src/services/operation-history.js';

// Mock the OperationHistory service
jest.mock('../../../src/services/operation-history.js');

// Create a test class that exposes the protected method
class TestHistoryListTool extends HistoryListTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testFormatSimpleArgs(args: Record<string, unknown>) {
    return (this as any).formatSimpleArgs(args);
  }
}

describe('HistoryListTool', () => {
  let historyListTool: TestHistoryListTool;
  let mockHistory: jest.Mocked<OperationHistory>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create mock history instance
    mockHistory = {
      getStatus: jest.fn(),
      getUndoHistory: jest.fn(),
      getRedoHistory: jest.fn(),
    } as any;

    // Mock getInstance to return our mock
    (OperationHistory.getInstance as jest.Mock).mockReturnValue(mockHistory);
    
    historyListTool = new TestHistoryListTool();
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = historyListTool.definition;
      
      expect(definition.name).toBe('history_list');
      expect(definition.description).toContain('Show operation history');
      expect((definition.inputSchema as any).type).toBe('object');
      expect((definition.inputSchema as any).properties.limit).toBeDefined();
      expect((definition.inputSchema as any).properties.showRedo).toBeDefined();
    });

    it('should have correct default values and constraints', () => {
      const definition = historyListTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.limit.default).toBe(10);
      expect(properties.limit.minimum).toBe(1);
      expect(properties.limit.maximum).toBe(50);
      expect(properties.showRedo.default).toBe(false);
    });
  });

  describe('execute', () => {
    const mockTimestamp = new Date('2024-01-15T10:30:00Z').getTime();

    it('should display empty history correctly', async () => {
      mockHistory.getStatus.mockReturnValue({
        currentIndex: -1,
        totalOperations: 0,
        canUndo: false,
        canRedo: false,
        checkpoints: [],
      });
      mockHistory.getUndoHistory.mockReturnValue([]);
      mockHistory.getRedoHistory.mockReturnValue([]);

      const result = await historyListTool.testExecute({});

      expect(result.content[0].text).toContain('Operation History (0/0 operations)');
      expect(result.content[0].text).toContain('No operations to undo');
      expect(result.content[0].text).toContain('Status: Nothing to undo');
    });

    it('should display history with operations', async () => {
      const mockOp: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: { assetPath: '/Game/Test' },
        description: 'Spawn test actor',
        timestamp: mockTimestamp,
        undoData: { type: 'actor_spawn', actorName: 'TestActor' } as UndoData,
      };

      mockHistory.getStatus.mockReturnValue({
        currentIndex: 0,
        totalOperations: 1,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });
      mockHistory.getUndoHistory.mockReturnValue([mockOp]);
      mockHistory.getRedoHistory.mockReturnValue([]);

      const result = await historyListTool.testExecute({});

      expect(result.content[0].text).toContain('Operation History (1/1 operations)');
      expect(result.content[0].text).toContain('Recent Operations (can be undone)');
      expect(result.content[0].text).toContain('Spawn test actor');
      expect(result.content[0].text).toContain('Tool: actor_spawn');
      expect(result.content[0].text).toContain('(undoable)');
    });

    it('should display checkpoints', async () => {
      mockHistory.getStatus.mockReturnValue({
        currentIndex: -1,
        totalOperations: 0,
        canUndo: false,
        canRedo: false,
        checkpoints: ['before_build', 'after_walls'],
      });
      mockHistory.getUndoHistory.mockReturnValue([]);
      mockHistory.getRedoHistory.mockReturnValue([]);

      const result = await historyListTool.testExecute({});

      expect(result.content[0].text).toContain('Checkpoints:');
      expect(result.content[0].text).toContain('📍 before_build');
      expect(result.content[0].text).toContain('📍 after_walls');
    });

    it('should display operation with checkpoint', async () => {
      const mockOp: OperationRecord = {
        id: 'op1',
        toolName: 'checkpoint_create',
        args: { name: 'test_checkpoint' },
        description: 'Create checkpoint',
        timestamp: mockTimestamp,
        checkpointName: 'test_checkpoint',
      };

      mockHistory.getStatus.mockReturnValue({
        currentIndex: 0,
        totalOperations: 1,
        canUndo: true,
        canRedo: false,
        checkpoints: ['test_checkpoint'],
      });
      mockHistory.getUndoHistory.mockReturnValue([mockOp]);

      const result = await historyListTool.testExecute({});

      expect(result.content[0].text).toContain('📍 test_checkpoint');
      expect(result.content[0].text).toContain('Create checkpoint 📍 test_checkpoint');
    });

    it('should display operation without undo data', async () => {
      const mockOp: OperationRecord = {
        id: 'op1',
        toolName: 'viewport_screenshot',
        args: {},
        description: 'Take screenshot',
        timestamp: mockTimestamp,
      };

      mockHistory.getStatus.mockReturnValue({
        currentIndex: 0,
        totalOperations: 1,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });
      mockHistory.getUndoHistory.mockReturnValue([mockOp]);

      const result = await historyListTool.testExecute({});

      expect(result.content[0].text).toContain('Take screenshot');
      expect(result.content[0].text).toContain('(no undo)');
    });

    it('should display redo operations when showRedo is true', async () => {
      const mockUndoOp: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: {},
        description: 'Spawn actor',
        timestamp: mockTimestamp,
      };

      const mockRedoOp: OperationRecord = {
        id: 'op2',
        toolName: 'actor_delete',
        args: {},
        description: 'Delete actor',
        timestamp: mockTimestamp + 1000,
      };

      mockHistory.getStatus.mockReturnValue({
        currentIndex: 0,
        totalOperations: 2,
        canUndo: true,
        canRedo: true,
        checkpoints: [],
      });
      mockHistory.getUndoHistory.mockReturnValue([mockUndoOp]);
      mockHistory.getRedoHistory.mockReturnValue([mockRedoOp]);

      const result = await historyListTool.testExecute({ showRedo: true });

      expect(result.content[0].text).toContain('Recent Operations (can be undone)');
      expect(result.content[0].text).toContain('Operations Available for Redo');
      expect(result.content[0].text).toContain('Spawn actor');
      expect(result.content[0].text).toContain('Delete actor');
      expect(result.content[0].text).toContain('1 can be redone');
    });

    it('should not show redo operations when showRedo is false', async () => {
      const mockUndoOp: OperationRecord = {
        id: 'op1',
        toolName: 'actor_spawn',
        args: {},
        description: 'Spawn actor',
        timestamp: mockTimestamp,
      };

      const mockRedoOp: OperationRecord = {
        id: 'op2',
        toolName: 'actor_delete',
        args: {},
        description: 'Delete actor',
        timestamp: mockTimestamp + 1000,
      };

      mockHistory.getStatus.mockReturnValue({
        currentIndex: 0,
        totalOperations: 2,
        canUndo: true,
        canRedo: true,
        checkpoints: [],
      });
      mockHistory.getUndoHistory.mockReturnValue([mockUndoOp]);
      mockHistory.getRedoHistory.mockReturnValue([mockRedoOp]);

      const result = await historyListTool.testExecute({ showRedo: false });

      expect(result.content[0].text).toContain('Spawn actor');
      expect(result.content[0].text).not.toContain('Operations Available for Redo');
      expect(result.content[0].text).not.toContain('Delete actor');
    });

    it('should respect limit parameter for undo operations', async () => {
      const mockOps: OperationRecord[] = [
        {
          id: 'op1',
          toolName: 'actor_spawn',
          args: {},
          description: 'Operation 1',
          timestamp: mockTimestamp,
        },
        {
          id: 'op2',
          toolName: 'actor_spawn',
          args: {},
          description: 'Operation 2',
          timestamp: mockTimestamp + 1000,
        },
        {
          id: 'op3',
          toolName: 'actor_spawn',
          args: {},
          description: 'Operation 3',
          timestamp: mockTimestamp + 2000,
        },
      ];

      mockHistory.getStatus.mockReturnValue({
        currentIndex: 2,
        totalOperations: 3,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });
      mockHistory.getUndoHistory.mockReturnValue(mockOps.slice(0, 2)); // Return first 2
      mockHistory.getRedoHistory.mockReturnValue([]);

      const result = await historyListTool.testExecute({ limit: 2 });

      expect(mockHistory.getUndoHistory).toHaveBeenCalledWith(2);
      expect(result.content[0].text).toContain('Operation 1');
      expect(result.content[0].text).toContain('Operation 2');
      expect(result.content[0].text).not.toContain('Operation 3');
    });

    it('should use default limit when not specified', async () => {
      mockHistory.getStatus.mockReturnValue({
        currentIndex: -1,
        totalOperations: 0,
        canUndo: false,
        canRedo: false,
        checkpoints: [],
      });
      mockHistory.getUndoHistory.mockReturnValue([]);
      mockHistory.getRedoHistory.mockReturnValue([]);

      await historyListTool.testExecute({});

      expect(mockHistory.getUndoHistory).toHaveBeenCalledWith(10);
    });

    it('should mark current operation with arrow', async () => {
      const mockOps: OperationRecord[] = [
        {
          id: 'op1',
          toolName: 'actor_spawn',
          args: {},
          description: 'Current operation',
          timestamp: mockTimestamp,
        },
        {
          id: 'op2',
          toolName: 'actor_spawn',
          args: {},
          description: 'Previous operation',
          timestamp: mockTimestamp - 1000,
        },
      ];

      mockHistory.getStatus.mockReturnValue({
        currentIndex: 1,
        totalOperations: 2,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });
      mockHistory.getUndoHistory.mockReturnValue(mockOps);

      const result = await historyListTool.testExecute({});

      const lines = result.content[0].text?.split('\n') || [];
      const currentOpLine = lines.find(line => line.includes('Current operation'));
      const previousOpLine = lines.find(line => line.includes('Previous operation'));

      expect(currentOpLine).toContain('→');
      expect(previousOpLine).not.toContain('→');
      expect(previousOpLine).toMatch(/^\s\s\[/); // Should start with two spaces
    });
  });

  describe('formatSimpleArgs', () => {
    it('should format simple string args', () => {
      const args = { name: 'test', path: '/Game/Test' };
      const result = historyListTool.testFormatSimpleArgs(args);
      
      expect(result).toBe('name="test", path="/Game/Test"');
    });

    it('should format number and boolean args', () => {
      const args = { count: 5, enabled: true, disabled: false };
      const result = historyListTool.testFormatSimpleArgs(args);
      
      expect(result).toBe('count=5, enabled=true, disabled=false');
    });

    it('should format simple arrays', () => {
      const args = { location: [100, 200, 300] };
      const result = historyListTool.testFormatSimpleArgs(args);
      
      expect(result).toBe('location=[100,200,300]');
    });

    it('should skip complex arrays', () => {
      const args = { complex: [1, 2, 3, 4, 5] }; // More than 3 elements
      const result = historyListTool.testFormatSimpleArgs(args);
      
      expect(result).toBeNull();
    });

    it('should skip complex objects', () => {
      const args = { complex: { nested: { object: true } } };
      const result = historyListTool.testFormatSimpleArgs(args);
      
      expect(result).toBeNull();
    });

    it('should skip null and undefined values', () => {
      const args = { valid: 'test', nullValue: null, undefinedValue: undefined };
      const result = historyListTool.testFormatSimpleArgs(args);
      
      expect(result).toBe('valid="test"');
    });

    it('should limit to 3 arguments', () => {
      const args = { arg1: 1, arg2: 2, arg3: 3, arg4: 4, arg5: 5 };
      const result = historyListTool.testFormatSimpleArgs(args);
      
      const parts = result?.split(', ') || [];
      expect(parts.length).toBe(3);
    });

    it('should return null for empty or no simple args', () => {
      expect(historyListTool.testFormatSimpleArgs({})).toBeNull();
      expect(historyListTool.testFormatSimpleArgs({ complex: { object: true } })).toBeNull();
    });

    it('should handle mixed simple and complex args', () => {
      const args = {
        simple: 'value',
        complex: { nested: true },
        number: 42,
      };
      const result = historyListTool.testFormatSimpleArgs(args);
      
      expect(result).toBe('simple="value", number=42');
    });
  });

  describe('status message formatting', () => {
    it('should show correct status when can undo and redo', async () => {
      mockHistory.getStatus.mockReturnValue({
        currentIndex: 2,
        totalOperations: 5,
        canUndo: true,
        canRedo: true,
        checkpoints: [],
      });
      mockHistory.getUndoHistory.mockReturnValue([]);

      const result = await historyListTool.testExecute({});

      expect(result.content[0].text).toContain('Status: 3 operations can be undone, 2 can be redone');
    });

    it('should show correct status when can only undo', async () => {
      mockHistory.getStatus.mockReturnValue({
        currentIndex: 2,
        totalOperations: 3,
        canUndo: true,
        canRedo: false,
        checkpoints: [],
      });
      mockHistory.getUndoHistory.mockReturnValue([]);

      const result = await historyListTool.testExecute({});

      expect(result.content[0].text).toContain('Status: 3 operations can be undone');
      expect(result.content[0].text).not.toContain('can be redone');
    });

    it('should show nothing to undo when cannot undo', async () => {
      mockHistory.getStatus.mockReturnValue({
        currentIndex: -1,
        totalOperations: 0,
        canUndo: false,
        canRedo: false,
        checkpoints: [],
      });
      mockHistory.getUndoHistory.mockReturnValue([]);

      const result = await historyListTool.testExecute({});

      expect(result.content[0].text).toContain('Status: Nothing to undo');
    });
  });

  describe('integration scenarios', () => {
    const mockTimestamp = new Date('2024-01-15T10:30:00Z').getTime();
    
    it('should handle complex history with checkpoints and mixed operations', async () => {
      const mockOps: OperationRecord[] = [
        {
          id: 'op1',
          toolName: 'checkpoint_create',
          args: { name: 'start' },
          description: 'Create start checkpoint',
          timestamp: mockTimestamp,
          checkpointName: 'start',
        },
        {
          id: 'op2',
          toolName: 'actor_spawn',
          args: { assetPath: '/Game/Wall', location: [0, 0, 0] },
          description: 'Spawn wall actor',
          timestamp: mockTimestamp + 1000,
          undoData: { type: 'actor_spawn', actorName: 'Wall_001' } as UndoData,
        },
        {
          id: 'op3',
          toolName: 'viewport_screenshot',
          args: { width: 800, height: 600 },
          description: 'Take screenshot',
          timestamp: mockTimestamp + 2000,
        },
      ];

      mockHistory.getStatus.mockReturnValue({
        currentIndex: 2,
        totalOperations: 3,
        canUndo: true,
        canRedo: false,
        checkpoints: ['start'],
      });
      mockHistory.getUndoHistory.mockReturnValue(mockOps);

      const result = await historyListTool.testExecute({ limit: 5 });

      const text = result.content[0].text;
      
      // Should show checkpoints section
      expect(text).toContain('Checkpoints:');
      expect(text).toContain('📍 start');
      
      // Should show all operations with proper formatting
      expect(text).toContain('Create start checkpoint 📍 start');
      expect(text).toContain('Spawn wall actor');
      expect(text).toContain('Take screenshot');
      expect(text).toContain('Args: assetPath="/Game/Wall", location=[0,0,0]');
      expect(text).toContain('Args: width=800, height=600');
      
      // Should show undo availability
      expect(text).toContain('(undoable)');
      expect(text).toContain('(no undo)');
    });
  });
});