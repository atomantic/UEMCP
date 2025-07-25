export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolHandler {
  (args: unknown): Promise<{
    content: Array<{
      type: string;
      text: string;
    }>;
  }>;
}

export interface Tool {
  definition: ToolDefinition;
  handler: ToolHandler;
}