// Mock the Python bridge instead of the whole BaseTool
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { BatchOperationsTool } from '../../../src/tools/system/batch-operations.js';

describe('BatchOperationsTool', () => {
  let tool: BatchOperationsTool;

  beforeEach(() => {
    tool = new BatchOperationsTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('batch_operations');
      expect(definition.description).toContain('Execute multiple operations in a single HTTP request');
      expect(definition.description).toContain('reduce overhead');
    });

    it('should have proper input schema for operations array', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      expect(schema.properties?.operations?.type).toBe('array');
      expect(schema.properties?.operations?.minItems).toBe(1);
      expect(schema.required).toContain('operations');
    });

    it('should define supported operation types', () => {
      const operationSchema = (tool.definition.inputSchema as any).properties?.operations?.items;
      expect(operationSchema?.properties?.operation?.enum).toEqual([
        'actor_spawn',
        'actor_modify', 
        'actor_delete',
        'actor_duplicate',
        'viewport_camera',
        'viewport_screenshot'
      ]);
    });

    it('should require operation and params for each operation', () => {
      const operationSchema = (tool.definition.inputSchema as any).properties?.operations?.items;
      expect(operationSchema?.required).toEqual(['operation', 'params']);
    });
  });

  describe('execute', () => {
    it('should execute single batch operation successfully', async () => {
      const args = {
        operations: [
          {
            operation: 'actor_spawn',
            params: { assetPath: '/Game/Meshes/SM_Wall' },
            id: 'wall_1'
          }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        operations: [
          {
            id: 'wall_1',
            operation: 'actor_spawn',
            success: true,
            result: {
              success: true,
              actorName: 'SM_Wall_1',
              location: [0, 0, 0]
            }
          }
        ],
        successCount: 1,
        failureCount: 0,
        executionTime: 0.15
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'batch_operations',
        params: { operations: args.operations }
      });
      expect(result.content[0].text).toContain('Batch Operations Results: 1/1 operations completed successfully');
      expect(result.content[0].text).toContain('✓ wall_1');
      expect(result.content[0].text).toContain('Total execution time: 0.15s');
    });

    it('should execute multiple batch operations successfully', async () => {
      const args = {
        operations: [
          {
            operation: 'actor_spawn',
            params: { assetPath: '/Game/Meshes/SM_Wall', location: [0, 0, 0] },
            id: 'wall_1'
          },
          {
            operation: 'actor_spawn',
            params: { assetPath: '/Game/Meshes/SM_Wall', location: [300, 0, 0] },
            id: 'wall_2'
          },
          {
            operation: 'viewport_camera',
            params: { location: [150, -500, 300] },
            id: 'camera_setup'
          }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        operations: [
          {
            id: 'wall_1',
            operation: 'actor_spawn',
            success: true,
            result: { success: true, actorName: 'SM_Wall_1' }
          },
          {
            id: 'wall_2', 
            operation: 'actor_spawn',
            success: true,
            result: { success: true, actorName: 'SM_Wall_2' }
          },
          {
            id: 'camera_setup',
            operation: 'viewport_camera',
            success: true,
            result: { success: true }
          }
        ],
        successCount: 3,
        failureCount: 0,
        executionTime: 0.42
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Batch Operations Results: 3/3 operations completed successfully');
      expect(result.content[0].text).toContain('✓ wall_1');
      expect(result.content[0].text).toContain('✓ wall_2');
      expect(result.content[0].text).toContain('✓ camera_setup');
      expect(result.content[0].text).toContain('avg: 0.140s per operation');
    });

    it('should handle mixed success and failure operations', async () => {
      const args = {
        operations: [
          {
            operation: 'actor_spawn',
            params: { assetPath: '/Game/Meshes/SM_Wall' },
            id: 'wall_success'
          },
          {
            operation: 'actor_spawn',
            params: { assetPath: '/Game/NonExistent/Asset' },
            id: 'wall_failure'
          }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        operations: [
          {
            id: 'wall_success',
            operation: 'actor_spawn',
            success: true,
            result: { success: true, actorName: 'SM_Wall_1' }
          },
          {
            id: 'wall_failure',
            operation: 'actor_spawn', 
            success: false,
            error: 'Asset not found: /Game/NonExistent/Asset',
            result: { success: false, error: 'Asset not found: /Game/NonExistent/Asset' }
          }
        ],
        successCount: 1,
        failureCount: 1,
        executionTime: 0.25
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Batch Operations Results: 1/2 operations completed successfully');
      expect(result.content[0].text).toContain('✓ wall_success');
      expect(result.content[0].text).toContain('✗ wall_failure: Asset not found: /Game/NonExistent/Asset');
    });

    it('should handle operations without explicit IDs', async () => {
      const args = {
        operations: [
          {
            operation: 'actor_spawn',
            params: { assetPath: '/Game/Meshes/SM_Wall' }
          }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        operations: [
          {
            id: 'op_0',
            operation: 'actor_spawn',
            success: true,
            result: { success: true, actorName: 'SM_Wall_1' }
          }
        ],
        successCount: 1,
        failureCount: 0,
        executionTime: 0.12
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ op_0');
    });

    it('should calculate average time per operation correctly', async () => {
      const args = {
        operations: [
          { operation: 'actor_spawn', params: { assetPath: '/Game/Test1' } },
          { operation: 'actor_spawn', params: { assetPath: '/Game/Test2' } }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        operations: [
          { id: 'op_0', operation: 'actor_spawn', success: true, result: { success: true } },
          { id: 'op_1', operation: 'actor_spawn', success: true, result: { success: true } }
        ],
        successCount: 2,
        failureCount: 0,
        executionTime: 0.8
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Total execution time: 0.80s');
      expect(result.content[0].text).toContain('avg: 0.400s per operation');
    });

    it('should handle zero total count edge case', async () => {
      const args = { operations: [] };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        operations: [],
        successCount: 0,
        failureCount: 0,
        executionTime: 0.01
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('avg: N/A per operation');
    });

    it('should throw error when batch operations fail completely', async () => {
      const args = {
        operations: [
          { operation: 'actor_spawn', params: { assetPath: '/Game/Test' } }
        ]
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Batch processing failed'
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Batch processing failed'
      );
    });
  });
});