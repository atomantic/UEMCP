// Mock the Python bridge
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { PythonProxyTool } from '../../../src/tools/system/python-proxy.js';

describe('PythonProxyTool', () => {
  let tool: PythonProxyTool;

  beforeEach(() => {
    tool = new PythonProxyTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('python_proxy');
      expect(definition.description).toContain('Execute ANY Python code in UE');
      expect(definition.description).toContain('Full unreal module access');
      expect(definition.description).toContain('python_proxy({');
      expect(definition.description).toContain('Perfect for complex operations MCP tools don\'t cover');
    });

    it('should have proper input schema with code parameter', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      
      expect(schema.properties?.code?.type).toBe('string');
      expect(schema.properties?.code?.description).toContain('Python code to execute');
      expect(schema.properties?.code?.description).toContain('Has full access to the unreal module');
      expect(schema.properties?.code?.description).toContain('Examples: manipulating actors');
      
      expect(schema.properties?.context?.type).toBe('object');
      expect(schema.properties?.context?.description).toContain('Optional context variables');
      expect(schema.properties?.context?.additionalProperties).toBe(true);
      
      expect(schema.required).toContain('code');
      expect(schema.required).not.toContain('context');
    });
  });

  describe('execute', () => {
    it('should execute simple Python code successfully', async () => {
      const args = {
        code: 'print("Hello World")'
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        result: null
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'python.execute',
        params: args
      });
      expect(result.content[0].text).toContain('✓ Python code executed successfully');
    });

    it('should display string result', async () => {
      const args = {
        code: 'result = "Hello from Python"'
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        result: 'Hello from Python'
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Python code executed successfully');
      expect(result.content[0].text).toContain('Result:');
      expect(result.content[0].text).toContain('Hello from Python');
    });

    it('should display JSON result for objects', async () => {
      const args = {
        code: 'result = {"actors": 5, "lights": 2}'
      };

      const resultObject = { actors: 5, lights: 2 };
      mockExecuteCommand.mockResolvedValue({
        success: true,
        result: resultObject
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Python code executed successfully');
      expect(result.content[0].text).toContain('Result:');
      expect(result.content[0].text).toContain('{\n  "actors": 5,\n  "lights": 2\n}');
    });

    it('should display JSON result for arrays', async () => {
      const args = {
        code: 'result = ["Wall_01", "Wall_02", "Door_01"]'
      };

      const resultArray = ["Wall_01", "Wall_02", "Door_01"];
      mockExecuteCommand.mockResolvedValue({
        success: true,
        result: resultArray
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Result:');
      expect(result.content[0].text).toContain('[\n  "Wall_01",\n  "Wall_02",\n  "Door_01"\n]');
    });

    it('should handle numeric results', async () => {
      const args = {
        code: 'result = 42'
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        result: 42
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Result:');
      expect(result.content[0].text).toContain('42');
    });

    it('should handle boolean results', async () => {
      const args = {
        code: 'result = True'
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        result: true
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Result:');
      expect(result.content[0].text).toContain('true');
    });

    it('should handle undefined result', async () => {
      const args = {
        code: 'x = 5 + 3'
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        result: undefined
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Python code executed successfully');
      expect(result.content[0].text).not.toContain('Result:');
    });

    it('should handle null result', async () => {
      const args = {
        code: 'result = None'
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        result: null
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('✓ Python code executed successfully');
      expect(result.content[0].text).not.toContain('Result:');
    });

    it('should use message when provided', async () => {
      const args = {
        code: 'print("Custom output")'
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        result: 'some result',
        message: 'Custom execution output from Python'
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toBe('Custom execution output from Python');
      expect(result.content[0].text).not.toContain('✓ Python code executed successfully');
    });

    it('should execute code with context variables', async () => {
      const args = {
        code: 'result = actor_name + "_modified"',
        context: {
          actor_name: 'Wall_01',
          multiplier: 2
        }
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        result: 'Wall_01_modified'
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'python.execute',
        params: {
          code: 'result = actor_name + "_modified"',
          context: {
            actor_name: 'Wall_01',
            multiplier: 2
          }
        }
      });
      expect(result.content[0].text).toContain('Wall_01_modified');
    });

    it('should handle complex Unreal Engine operations', async () => {
      const args = {
        code: `
import unreal
actors = unreal.EditorLevelLibrary.get_all_level_actors()
result = f"Found {len(actors)} actors in the level"
        `.trim()
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        result: 'Found 15 actors in the level'
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Found 15 actors in the level');
    });

    it('should handle complex data structures', async () => {
      const args = {
        code: 'result = {"level": {"actors": [{"name": "Wall_01", "location": [100, 200, 0]}]}}'
      };

      const complexResult = {
        level: {
          actors: [
            { name: "Wall_01", location: [100, 200, 0] }
          ]
        }
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        result: complexResult
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Result:');
      expect(result.content[0].text).toContain('"level"');
      expect(result.content[0].text).toContain('"actors"');
      expect(result.content[0].text).toContain('"Wall_01"');
      expect(result.content[0].text).toContain('100');
      expect(result.content[0].text).toContain('200');
    });

    it('should throw error when Python execution fails', async () => {
      const args = {
        code: 'invalid python syntax !!!'
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'SyntaxError: invalid syntax'
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'SyntaxError: invalid syntax'
      );
    });

    it('should handle empty context object', async () => {
      const args = {
        code: 'result = "test"',
        context: {}
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        result: 'test'
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'python.execute',
        params: {
          code: 'result = "test"',
          context: {}
        }
      });
      expect(result.content[0].text).toContain('test');
    });

    it('should handle multiline Python code', async () => {
      const args = {
        code: `
def calculate_distance(p1, p2):
    import math
    return math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2)

result = calculate_distance([0, 0], [3, 4])
        `.trim()
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        result: 5.0
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Result:');
      expect(result.content[0].text).toContain('5');
    });
  });
});