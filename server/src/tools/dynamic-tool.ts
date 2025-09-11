/**
 * Dynamic Tool Implementation
 * 
 * A tool that is dynamically created from Python manifest,
 * eliminating the need for duplicate definitions in Node.js.
 */

import { BaseTool, ToolDefinition } from './base/base-tool.js';
import { ToolResponse } from '../utils/response-formatter.js';
import { PythonBridge } from '../services/python-bridge.js';

export interface DynamicToolDefinition {
  name: string;
  description: string;
  category: string;
  inputSchema: {
    type: 'object';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    properties: Record<string, any>;
    required: string[];
    additionalProperties: boolean;
  };
}

/**
 * A tool that forwards all execution to Python based on manifest definition
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class DynamicTool extends BaseTool<any> {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute(args?: any): Promise<ToolResponse> {
    return this.executeInternal(args);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async executeInternal(args: any): Promise<ToolResponse> {
    // Simply forward to Python with the tool name
    const pythonResult = await this.pythonBridge.executeCommand({
      type: this.toolDef.name,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      params: args || {}
    });

    // Convert PythonResponse to ToolResponse
    const toolResponse: ToolResponse = {
      content: []
    };

    // Check if Python already provided content array
    if (Array.isArray(pythonResult.content)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      toolResponse.content = pythonResult.content;
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