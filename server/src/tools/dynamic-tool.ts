/**
 * Dynamic Tool Implementation
 * 
 * A tool that is dynamically created from Python manifest,
 * eliminating the need for duplicate definitions in Node.js.
 */

import { BaseTool, ToolDefinition } from './base/base-tool.js';
import { ToolResponse } from '../utils/response-formatter.js';
import { PythonBridge } from '../services/python-bridge.js';

// JSON Schema property definition for type safety
export interface JSONSchemaProperty {
  type?: string;
  description?: string;
  enum?: unknown[];
  items?: JSONSchemaProperty | JSONSchemaProperty[];
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  [key: string]: unknown;
}

export interface DynamicToolDefinition {
  name: string;
  description: string;
  category: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, JSONSchemaProperty>;
    required: string[];
    additionalProperties: boolean;
  };
}

/**
 * A tool that forwards all execution to Python based on manifest definition
 */
export class DynamicTool extends BaseTool<Record<string, unknown>> {
  public readonly category: string;
  
  constructor(
    private toolDef: DynamicToolDefinition,
    private pythonBridge: PythonBridge
  ) {
    super();
    this.category = toolDef.category;
  }

  get definition(): ToolDefinition {
    return {
      name: this.toolDef.name,
      description: this.toolDef.description,
      inputSchema: this.toolDef.inputSchema,
    };
  }

  // Implement the required execute method
  async execute(args?: Record<string, unknown>): Promise<ToolResponse> {
    return this.executeInternal(args);
  }

  protected async executeInternal(args: Record<string, unknown> | undefined): Promise<ToolResponse> {
    // Simply forward to Python with the tool name
    const pythonResult = await this.pythonBridge.executeCommand({
      type: this.toolDef.name,
      params: args || {}
    });

    // Convert PythonResponse to ToolResponse
    const toolResponse: ToolResponse = {
      content: []
    };

    // Check if Python already provided content array
    if (Array.isArray(pythonResult.content)) {
      toolResponse.content = pythonResult.content as Array<{type: string; text?: string; [key: string]: unknown}>;
    } else {
      // Create content from Python result
      const textContent = pythonResult.error 
        ? String(pythonResult.error)
        : pythonResult.message 
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        ? String(pythonResult.message)
        : JSON.stringify(pythonResult);
        
      toolResponse.content = [{
        type: 'text',
        text: textContent
      }];
    }

    return toolResponse;
  }
}