import { BaseTool } from './base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface BlueprintInfo {
  blueprintPath: string;
  className?: string;
  parentClass?: string;
  components?: Array<{
    name: string;
    type: string;
    properties?: Record<string, unknown>;
  }>;
  variables?: Array<{
    name: string;
    type: string;
    defaultValue?: unknown;
    isEditable?: boolean;
  }>;
  functions?: Array<{
    name: string;
    returnType?: string;
    parameters?: Array<{
      name: string;
      type: string;
    }>;
  }>;
}

/**
 * Base class for Blueprint-related tools
 */
export abstract class BlueprintTool<TArgs = unknown> extends BaseTool<TArgs> {
  
  /**
   * Format Blueprint creation result
   */
  protected formatBlueprintCreationResult(info: {
    blueprintPath: string;
    className: string;
    parentClass?: string;
    components?: string[];
    variables?: string[];
  }): ReturnType<typeof ResponseFormatter.success> {
    let text = `Blueprint created successfully!\n\n`;
    text += `Path: ${info.blueprintPath}\n`;
    text += `Class Name: ${info.className}\n`;
    
    if (info.parentClass) {
      text += `Parent Class: ${info.parentClass}\n`;
    }
    
    if (info.components?.length) {
      text += `\nComponents (${info.components.length}):\n`;
      info.components.forEach(comp => {
        text += `  - ${comp}\n`;
      });
    }
    
    if (info.variables?.length) {
      text += `\nVariables (${info.variables.length}):\n`;
      info.variables.forEach(variable => {
        text += `  - ${variable}\n`;
      });
    }
    
    return ResponseFormatter.success(text.trimEnd());
  }
  
  /**
   * Format Blueprint information result
   */
  protected formatBlueprintInfo(info: BlueprintInfo): ReturnType<typeof ResponseFormatter.success> {
    let text = `Blueprint Information\n\n`;
    text += `Path: ${info.blueprintPath}\n`;
    
    if (info.className) {
      text += `Class Name: ${info.className}\n`;
    }
    if (info.parentClass) {
      text += `Parent Class: ${info.parentClass}\n`;
    }
    
    if (info.components?.length) {
      text += `\nComponents (${info.components.length}):\n`;
      info.components.forEach(comp => {
        text += `  - ${comp.name} (${comp.type})\n`;
      });
    }
    
    if (info.variables?.length) {
      text += `\nVariables (${info.variables.length}):\n`;
      info.variables.forEach(variable => {
        text += `  - ${variable.name}: ${variable.type}`;
        if (variable.defaultValue !== undefined) {
          text += ` = ${String(variable.defaultValue)}`;
        }
        text += `\n`;
      });
    }
    
    if (info.functions?.length) {
      text += `\nFunctions (${info.functions.length}):\n`;
      info.functions.forEach(func => {
        const params = func.parameters?.map(p => `${p.name}: ${p.type}`).join(', ') || '';
        text += `  - ${func.name}(${params})`;
        if (func.returnType) {
          text += `: ${func.returnType}`;
        }
        text += `\n`;
      });
    }
    
    return ResponseFormatter.success(text.trimEnd());
  }
  
  /**
   * Format error response
   */
  protected formatError(message: string): ReturnType<typeof ResponseFormatter.error> {
    return ResponseFormatter.error(message);
  }
}