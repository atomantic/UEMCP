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
  timeout?: number;
  inputSchema: {
    type: 'object';
    properties: Record<string, JSONSchemaProperty>;
    required: string[];
    additionalProperties: boolean;
  };
}

// Per-tool timeout overrides (seconds) — must match Python _COMMAND_TIMEOUTS
const TOOL_TIMEOUTS: Record<string, number> = {
  asset_import_assets: 60,
  material_create_simple_material: 20,
  material_create_material_instance: 20,
  python_proxy: 30,
};

// Per-category default timeouts (seconds) for the TypeScript bridge side
// Keys must match the category strings produced by the Python tool manifest
const CATEGORY_TIMEOUTS: Record<string, number> = {
  viewport: 30,
  actors: 30,
  assets: 30,
  blueprints: 30,
  materials: 30,
  level: 30,
  system: 30,
};
const DEFAULT_TIMEOUT = 10;

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
    // Resolve timeout: manifest > per-tool > category > default
    const timeout = this.toolDef.timeout
      ?? TOOL_TIMEOUTS[this.toolDef.name]
      ?? CATEGORY_TIMEOUTS[this.category]
      ?? DEFAULT_TIMEOUT;

    // Forward to Python with the tool name and timeout
    const pythonResult = await this.pythonBridge.executeCommand({
      type: this.toolDef.name,
      params: args || {},
      timeout,
    });

    // Convert PythonResponse to ToolResponse
    const toolResponse: ToolResponse = {
      content: []
    };

    // Check if Python already provided content array
    if (Array.isArray(pythonResult.content)) {
      // Map Python content to TextContent items — the Python bridge only produces text responses
      toolResponse.content = (pythonResult.content as Array<{type?: string; text?: string; [key: string]: unknown}>).map(
        item => ({ type: 'text' as const, text: typeof item.text === 'string' ? item.text : JSON.stringify(item) })
      );
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