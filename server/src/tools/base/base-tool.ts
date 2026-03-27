import { logger } from '../../utils/logger.js';
import { ResponseFormatter, ToolResponse } from '../../utils/response-formatter.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: unknown;
}

export interface PythonResult {
  success: boolean;
  error?: string;
  message?: string;
  // Common response properties
  validated?: boolean;
  validation_errors?: string[];
  validation_warnings?: string[];
  actorName?: string;
  location?: number[];
  rotation?: number[];
  scale?: number[];
  assets?: unknown[];
  actors?: unknown[];
  totalCount?: number;
  currentLevel?: string;
  // Allow additional properties
  [key: string]: unknown;
}

/**
 * Base class for all MCP tools
 */
export abstract class BaseTool<TArgs = unknown> {
  abstract get definition(): ToolDefinition;

  /**
   * The main handler function called by MCP
   */
  async handler(args: unknown = {}): Promise<ToolResponse> {
    try {
      logger.debug(`Executing ${this.definition.name}`, { args });
      return await this.execute(args as TArgs);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Execute the tool's main logic - must be implemented by subclasses
   */
  protected abstract execute(args: TArgs): Promise<ToolResponse>;

  /**
   * Common error handling
   */
  protected handleError(error: unknown): never {
    const errorMessage = ResponseFormatter.getErrorMessage(
      error,
      `Failed to execute ${this.definition.name}`
    );
    logger.error(errorMessage, { tool: this.definition.name, error });
    throw new Error(errorMessage);
  }

  /**
   * Create the tool export object in the format expected by MCP
   */
  toMCPTool(): { definition: ToolDefinition; handler: (args: unknown) => Promise<ToolResponse> } {
    return {
      definition: this.definition,
      handler: this.handler.bind(this),
    };
  }
}