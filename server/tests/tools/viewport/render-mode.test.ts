import { ViewportRenderModeTool } from '../../../src/tools/viewport/render-mode.js';

// Create a test class that exposes the protected methods
class TestViewportRenderModeTool extends ViewportRenderModeTool {
  public async testExecute(args: any) {
    return this.execute(args);
  }

  public testExecutePythonCommand = jest.fn();
  public testViewportCommands = {
    renderMode: 'viewport.render_mode',
  };
  
  protected async executePythonCommand(command: string, params: any) {
    return this.testExecutePythonCommand(command, params);
  }

  protected get viewportCommands() {
    return this.testViewportCommands;
  }
}

describe('ViewportRenderModeTool', () => {
  let renderModeTool: TestViewportRenderModeTool;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    renderModeTool = new TestViewportRenderModeTool();
    
    // Set up default mock implementation
    renderModeTool.testExecutePythonCommand.mockResolvedValue({
      success: true,
    });
  });

  describe('definition', () => {
    it('should have correct tool definition', () => {
      const definition = renderModeTool.definition;
      
      expect(definition.name).toBe('viewport_render_mode');
      expect(definition.description).toContain('Change viewport rendering');
      expect(definition.description).toContain('Wireframe best for debugging');
      expect(definition.description).toContain('viewport_render_mode({ mode: "wireframe" })');
      expect((definition.inputSchema as any).type).toBe('object');
    });

    it('should have correct mode enum property with default', () => {
      const definition = renderModeTool.definition;
      const properties = (definition.inputSchema as any).properties;
      
      expect(properties.mode).toBeDefined();
      expect(properties.mode.type).toBe('string');
      expect(properties.mode.default).toBe('lit');
      expect(properties.mode.description).toBe('Rendering mode');
      
      const expectedModes = [
        'lit',
        'unlit',
        'wireframe',
        'detail_lighting',
        'lighting_only',
        'light_complexity',
        'shader_complexity',
      ];
      expect(properties.mode.enum).toEqual(expectedModes);
    });
  });

  describe('execute', () => {
    it('should set lit mode with description', async () => {
      const args = { mode: 'lit' as const };

      const result = await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'lit' });
      
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: lit');
      expect(result.content[0].text).toContain('Standard lit rendering');
    });

    it('should set unlit mode with description', async () => {
      const args = { mode: 'unlit' as const };

      const result = await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'unlit' });
      
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: unlit');
      expect(result.content[0].text).toContain('No lighting (flat shading)');
    });

    it('should set wireframe mode with description', async () => {
      const args = { mode: 'wireframe' as const };

      const result = await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'wireframe' });
      
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: wireframe');
      expect(result.content[0].text).toContain('Wireframe (great for debugging)');
    });

    it('should set detail_lighting mode with description', async () => {
      const args = { mode: 'detail_lighting' as const };

      const result = await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'detail_lighting' });
      
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: detail_lighting');
      expect(result.content[0].text).toContain('Detailed lighting only');
    });

    it('should set lighting_only mode with description', async () => {
      const args = { mode: 'lighting_only' as const };

      const result = await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'lighting_only' });
      
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: lighting_only');
      expect(result.content[0].text).toContain('Lighting without textures');
    });

    it('should set light_complexity mode with description', async () => {
      const args = { mode: 'light_complexity' as const };

      const result = await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'light_complexity' });
      
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: light_complexity');
      expect(result.content[0].text).toContain('Light complexity visualization');
    });

    it('should set shader_complexity mode with description', async () => {
      const args = { mode: 'shader_complexity' as const };

      const result = await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'shader_complexity' });
      
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: shader_complexity');
      expect(result.content[0].text).toContain('Shader complexity visualization');
    });

    it('should default to lit mode when no mode provided', async () => {
      const args = {};

      const result = await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'lit' });
      
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: lit');
      expect(result.content[0].text).toContain('Standard lit rendering');
    });

    it('should default to lit mode when mode is undefined', async () => {
      const args = { mode: undefined };

      const result = await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'lit' });
      
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: lit');
      expect(result.content[0].text).toContain('Standard lit rendering');
    });

    it('should test all render modes systematically', async () => {
      const modes = [
        { mode: 'lit', description: 'Standard lit rendering' },
        { mode: 'unlit', description: 'No lighting (flat shading)' },
        { mode: 'wireframe', description: 'Wireframe (great for debugging)' },
        { mode: 'detail_lighting', description: 'Detailed lighting only' },
        { mode: 'lighting_only', description: 'Lighting without textures' },
        { mode: 'light_complexity', description: 'Light complexity visualization' },
        { mode: 'shader_complexity', description: 'Shader complexity visualization' },
      ];

      for (const { mode, description } of modes) {
        renderModeTool.testExecutePythonCommand.mockClear();
        
        const args = { mode: mode as any };

        const result = await renderModeTool.testExecute(args);

        expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode });
        expect(result.content[0].text).toContain(`✓ Viewport render mode set to: ${mode}`);
        expect(result.content[0].text).toContain(description);
      }
    });

    it('should handle wireframe mode for debugging specifically', async () => {
      const args = { mode: 'wireframe' as const };

      const result = await renderModeTool.testExecute(args);

      expect(result.content[0].text).toContain('✓ Viewport render mode set to: wireframe');
      expect(result.content[0].text).toContain('Wireframe (great for debugging)');
      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'wireframe' });
    });

    it('should maintain consistent response format for all modes', async () => {
      const modes = ['lit', 'unlit', 'wireframe'];

      for (const mode of modes) {
        renderModeTool.testExecutePythonCommand.mockClear();
        
        const result = await renderModeTool.testExecute({ mode: mode as any });

        // All responses should have the same structure
        expect(result).toEqual({
          content: [
            {
              type: 'text',
              text: expect.stringContaining(`✓ Viewport render mode set to: ${mode}`),
            },
          ],
        });
        expect(result.content[0].text).toContain('\n  '); // Should have description line
      }
    });

    it('should call executePythonCommand with correct parameters', async () => {
      const args = { mode: 'detail_lighting' as const };

      await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledTimes(1);
      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'detail_lighting' });
    });

    it('should await Python command execution', async () => {
      let executionOrder: string[] = [];
      
      renderModeTool.testExecutePythonCommand.mockImplementation(async () => {
        executionOrder.push('python_executed');
        return { success: true };
      });

      const args = { mode: 'wireframe' as const };

      const result = await renderModeTool.testExecute(args);
      executionOrder.push('execute_completed');

      expect(executionOrder).toEqual(['python_executed', 'execute_completed']);
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: wireframe');
    });
  });

  describe('edge cases', () => {
    it('should handle unknown mode gracefully', async () => {
      // This would be caught by TypeScript in practice, but testing runtime behavior
      const args = { mode: 'unknown_mode' as any };

      const result = await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'unknown_mode' });
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: unknown_mode');
      expect(result.content[0].text).not.toContain('\n  '); // No description for unknown mode
    });

    it('should handle null mode as undefined', async () => {
      const args = { mode: null as any };

      const result = await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'lit' });
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: lit');
    });

    it('should handle empty string mode', async () => {
      const args = { mode: '' as any };

      const result = await renderModeTool.testExecute(args);

      // Empty string is falsy, so should default to 'lit'
      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'lit' });
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: lit');
    });

    it('should handle case-sensitive mode names', async () => {
      const args = { mode: 'WIREFRAME' as any };

      const result = await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'WIREFRAME' });
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: WIREFRAME');
      expect(result.content[0].text).not.toContain('Wireframe (great for debugging)'); // No description for wrong case
    });

    it('should handle mode with extra spaces', async () => {
      const args = { mode: ' wireframe ' as any };

      const result = await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: ' wireframe ' });
      expect(result.content[0].text).toContain('✓ Viewport render mode set to:  wireframe ');
    });

    it('should return ResponseFormatter.success result', async () => {
      const args = { mode: 'lit' as const };

      const result = await renderModeTool.testExecute(args);

      // Check that it returns a proper ResponseFormatter.success structure
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.any(String),
          },
        ],
      });
    });

    it('should handle Python command failure gracefully', async () => {
      renderModeTool.testExecutePythonCommand.mockRejectedValue(new Error('Python command failed'));

      const args = { mode: 'wireframe' as const };

      await expect(renderModeTool.testExecute(args)).rejects.toThrow('Python command failed');
      
      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'wireframe' });
    });

    it('should verify all mode descriptions exist and are strings', async () => {
      const expectedModes = ['lit', 'unlit', 'wireframe', 'detail_lighting', 'lighting_only', 'light_complexity', 'shader_complexity'];
      
      // Get the mode descriptions from the class (we can't access private members, but can test behavior)
      for (const mode of expectedModes) {
        const result = await renderModeTool.testExecute({ mode: mode as any });
        
        expect(result.content[0].text).toContain(`✓ Viewport render mode set to: ${mode}`);
        expect(result.content[0].text).toContain('\n  '); // Should have description
        const text = result.content[0].text || '';
        const lines = text.split('\n');
        expect(lines.length).toBeGreaterThan(1);
        expect(lines[1]?.trim()).toBeTruthy(); // Description should not be empty
      }
    });

    it('should handle complex nested args object', async () => {
      const args = {
        mode: 'wireframe' as const,
        extraProperty: 'ignored',
        nested: { value: 'also ignored' },
      };

      const result = await renderModeTool.testExecute(args);

      expect(renderModeTool.testExecutePythonCommand).toHaveBeenCalledWith('viewport.render_mode', { mode: 'wireframe' });
      expect(result.content[0].text).toContain('✓ Viewport render mode set to: wireframe');
    });
  });
});