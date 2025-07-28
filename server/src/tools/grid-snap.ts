import { PythonBridge } from '../services/python-bridge.js';

export const gridSnapTool = {
  definition: {
    name: 'grid_snap',
    description: 'Enable/disable grid snapping and set grid size for precise modular placement',
    inputSchema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable or disable grid snapping'
        },
        gridSize: {
          type: 'number',
          description: 'Grid size in Unreal units (default: 100 for 1m grid)',
          default: 100
        },
        snapToGrid: {
          type: 'boolean',
          description: 'Snap all selected actors to grid positions',
          default: false
        }
      }
    }
  },
  handler: async (args: { enabled?: boolean; gridSize?: number; snapToGrid?: boolean }): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> => {
    const bridge = new PythonBridge();
    
    try {
      const result = await bridge.executeCommand({
        type: 'grid.snap',
        params: {
          enabled: args.enabled,
          gridSize: args.gridSize || 100,
          snapToGrid: args.snapToGrid || false
        }
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to configure grid snapping');
      }

      let message = '';
      if (args.enabled !== undefined) {
        message = `Grid snapping ${args.enabled ? 'enabled' : 'disabled'}`;
      }
      if (args.gridSize) {
        message += `\nGrid size set to ${args.gridSize} units`;
      }
      if (result.snappedActors && Number(result.snappedActors) > 0) {
        message += `\nSnapped ${result.snappedActors} actors to grid`;
      }

      return {
        content: [{
          type: 'text',
          text: `✓ ${message}\n\n${result.message ? String(result.message) : ''}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{
          type: 'text',
          text: `Error: Failed to configure grid snapping: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
};