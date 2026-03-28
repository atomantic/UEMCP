import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Utility class for formatting consistent tool responses
 * ToolResponse aligns directly with the MCP SDK CallToolResult type.
 */
export type ToolResponse = CallToolResult;

export class ResponseFormatter {
  /**
   * Create a success response with text content
   */
  static success(text: string): ToolResponse {
    return {
      content: [
        {
          type: 'text' as const,
          text,
        },
      ],
    };
  }

  /**
   * Create an error response
   */
  static error(error: Error | string): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(errorMessage);
  }

  /**
   * Create a response with formatted validation results
   */
  static withValidation(baseText: string, validationText: string): ToolResponse {
    return this.success(baseText + validationText);
  }

  /**
   * Extract error message from various error types
   */
  static getErrorMessage(error: unknown, prefix?: string): string {
    const message = error instanceof Error ? error.message : String(error);
    return prefix ? `${prefix}: ${message}` : message;
  }
}
