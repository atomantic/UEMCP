import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';

interface AssetInfoArgs {
  assetPath: string;
}

export const assetInfoTool = {
  definition: {
    name: 'asset_info',
    description: 'Get detailed information about an asset including dimensions and sockets',
    inputSchema: {
      type: 'object',
      properties: {
        assetPath: {
          type: 'string',
          description: 'Asset path (e.g., /Game/Meshes/SM_Wall01)',
        },
      },
      required: ['assetPath'],
    },
  },
  handler: async (args: unknown = {}): Promise<{ content: Array<{ type: string; text: string }> }> => {
    const { assetPath } = args as AssetInfoArgs;
    
    logger.debug('Getting asset info', { assetPath });
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'asset.info',
        params: { assetPath }
      });
      
      if (result.success) {
        let text = `Asset Information for: ${assetPath}\n`;
        text += `Type: ${typeof result.assetType === 'string' ? result.assetType : 'Unknown'}\n\n`;
        
        const bounds = result.bounds as {
          size: { x: number; y: number; z: number };
          origin: { x: number; y: number; z: number };
          extent: { x: number; y: number; z: number };
        } | undefined;
        
        if (bounds) {
          text += `Dimensions:\n`;
          text += `  Size: ${bounds.size.x.toFixed(1)} x ${bounds.size.y.toFixed(1)} x ${bounds.size.z.toFixed(1)} units\n`;
          text += `  Origin Offset: (${bounds.origin.x.toFixed(1)}, ${bounds.origin.y.toFixed(1)}, ${bounds.origin.z.toFixed(1)})\n`;
          text += `  Half Extents: (${bounds.extent.x.toFixed(1)}, ${bounds.extent.y.toFixed(1)}, ${bounds.extent.z.toFixed(1)})\n\n`;
        }
        
        if (typeof result.numVertices === 'number') {
          text += `Geometry:\n`;
          text += `  Vertices: ${result.numVertices}\n`;
          text += `  Triangles: ${typeof result.numTriangles === 'number' ? result.numTriangles : 'N/A'}\n`;
          text += `  Materials: ${typeof result.numMaterials === 'number' ? result.numMaterials : 'N/A'}\n\n`;
        }
        
        const sockets = result.sockets as Array<{
          name: string;
          location: { x: number; y: number; z: number };
        }> | undefined;
        
        if (sockets && sockets.length > 0) {
          text += `Sockets (${sockets.length}):\n`;
          for (const socket of sockets) {
            text += `  - ${socket.name}: Loc(${socket.location.x}, ${socket.location.y}, ${socket.location.z})\n`;
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      } else {
        throw new Error(result.error || 'Failed to get asset info');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get asset info: ${errorMessage}`);
    }
  },
};