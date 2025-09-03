import { BaseTool } from '../base/base-tool.js';
import { ToolResponse } from '../../utils/response-formatter.js';
import { ToolDefinition, PythonResult } from '../base/base-tool.js';

interface BatchOperation {
  operation: string;
  params: Record<string, unknown>;
  id?: string;
}

interface BatchOperationsArgs {
  operations: BatchOperation[];
}

interface BatchOperationResult {
  id: string;
  operation: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

interface BatchOperationsResult extends PythonResult {
  operations?: BatchOperationResult[];
  successCount?: number;
  failureCount?: number;
  executionTime?: number;
}

/**
 * Tool for executing multiple operations in a single HTTP request
 */
export class BatchOperationsTool extends BaseTool<BatchOperationsArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'batch_operations',
      description: 'Execute multiple operations in a single HTTP request to reduce overhead. Supports actor_spawn, actor_modify, actor_delete, actor_duplicate, viewport_camera, and viewport_screenshot.',
      inputSchema: {
        type: 'object',
        properties: {
          operations: {
            type: 'array',
            description: 'Array of operations to execute',
            items: {
              type: 'object',
              properties: {
                operation: {
                  type: 'string',
                  description: 'Operation name (actor_spawn, actor_modify, actor_delete, etc.)',
                  enum: ['actor_spawn', 'actor_modify', 'actor_delete', 'actor_duplicate', 'viewport_camera', 'viewport_screenshot']
                },
                params: {
                  type: 'object',
                  description: 'Parameters for the operation',
                },
                id: {
                  type: 'string',
                  description: 'Optional ID for tracking this operation in results',
                },
              },
              required: ['operation', 'params'],
            },
            minItems: 1,
          },
        },
        required: ['operations'],
      },
    };
  }

  protected async execute(args: BatchOperationsArgs): Promise<ToolResponse> {
    // Execute batch operations
    const result = await this.executePythonCommand('batch_operations', {
      operations: args.operations,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to execute batch operations');
    }

    // Format the response
    return this.formatBatchOperationsResult(result as BatchOperationsResult);
  }

  private formatBatchOperationsResult(result: BatchOperationsResult): ToolResponse {
    const successCount = result.successCount || 0;
    const failureCount = result.failureCount || 0;
    const totalCount = successCount + failureCount;

    let text = `Batch Operations Results: ${successCount}/${totalCount} operations completed successfully\n\n`;

    // List operation results
    if (result.operations && result.operations.length > 0) {
      result.operations.forEach((op) => {
        const status = op.success ? '✓' : '✗';
        text += `  ${status} ${op.id || op.operation}`;
        if (!op.success && op.error) {
          text += `: ${op.error}`;
        }
        text += '\n';
      });
    }

    // Add timing information if available
    if (result.executionTime !== undefined) {
      text += `\nTotal execution time: ${result.executionTime.toFixed(2)}s`;
      const avgTime = result.executionTime / totalCount;
      text += ` (avg: ${avgTime.toFixed(3)}s per operation)`;
    }

    return {
      content: [
        {
          type: 'text',
          text: text.trimEnd(),
        },
      ],
    };
  }
}

export const batchOperationsTool = new BatchOperationsTool().toMCPTool();