/**
 * Utility class for formatting validation results consistently across all tools
 */
export class ValidationFormatter {
  /**
   * Format validation results into a readable string
   */
  static format(
    validated: boolean | undefined,
    errors?: string[],
    warnings?: string[]
  ): string {
    if (validated === undefined) {
      return '';
    }

    let text = `\nValidation: ${validated ? '✓ Passed' : '✗ Failed'}`;

    // Format errors
    if (errors && Array.isArray(errors) && errors.length > 0) {
      text += '\nValidation Errors:';
      errors.forEach((error: string) => {
        text += `\n  - ${error}`;
      });
    }

    // Format warnings
    if (warnings && Array.isArray(warnings) && warnings.length > 0) {
      text += '\nValidation Warnings:';
      warnings.forEach((warning: string) => {
        text += `\n  - ${warning}`;
      });
    }

    return text;
  }

  /**
   * Append validation results to existing text if validation data is present
   */
  static appendToText(text: string, result: { validated?: boolean; validation_errors?: string[]; validation_warnings?: string[] }): string {
    if (result.validated === undefined) {
      return text;
    }

    return text + this.format(
      result.validated,
      result.validation_errors,
      result.validation_warnings
    );
  }
}