import { BaseTool, PythonResult } from './base-tool.js';
import { ValidationFormatter } from '../../utils/validation-formatter.js';
import { ResponseFormatter, ToolResponse } from '../../utils/response-formatter.js';

/**
 * Base class for actor-related tools with common validation formatting
 */
export abstract class ActorTool<TArgs = unknown> extends BaseTool<TArgs> {
  /**
   * Format validation results if present
   */
  protected formatValidation(result: PythonResult): string {
    return ValidationFormatter.format(
      result.validated as boolean | undefined,
      result.validation_errors as string[] | undefined,
      result.validation_warnings as string[] | undefined
    );
  }

  /**
   * Build a success response with optional validation
   */
  protected buildSuccessResponse(
    mainText: string,
    result?: PythonResult
  ): ToolResponse {
    let text = mainText;
    
    if (result && result.validated !== undefined) {
      text += this.formatValidation(result);
    }

    return ResponseFormatter.success(text);
  }

  /**
   * Helper to format location arrays
   */
  protected formatLocation(location: unknown): string {
    if (Array.isArray(location) && location.length === 3) {
      return `[${location.join(', ')}]`;
    }
    return '[Unknown]';
  }

  /**
   * Helper to format rotation arrays
   */
  protected formatRotation(rotation: unknown): string {
    if (Array.isArray(rotation) && rotation.length === 3) {
      return `[${rotation.join(', ')}]°`;
    }
    return '[Unknown]';
  }

  /**
   * Helper to check if rotation is non-zero
   */
  protected hasRotation(rotation: unknown): boolean {
    return Array.isArray(rotation) && rotation.some(r => r !== 0);
  }

  /**
   * Helper to check if scale is non-uniform
   */
  protected hasScale(scale: unknown): boolean {
    return Array.isArray(scale) && scale.some(s => s !== 1);
  }
}