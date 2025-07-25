import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';
import * as fs from 'fs/promises';

export const viewportScreenshotTool = {
  definition: {
    name: 'viewport_screenshot',
    description: 'Take a screenshot of the current viewport',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  handler: async (_args?: unknown): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> => {
    logger.debug('Taking viewport screenshot');
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'viewport.screenshot',
        params: {}
      });
      
      if (result.success && result.filepath) {
        const filepath = result.filepath as string;
        
        // Read the image file
        try {
          const imageBuffer = await fs.readFile(filepath);
          const base64Image = imageBuffer.toString('base64');
          const mimeType = 'image/png';
          
          return {
            content: [
              {
                type: 'text',
                text: `Screenshot captured successfully!\nSaved to: ${filepath}`,
              },
              {
                type: 'image',
                data: base64Image,
                mimeType,
              },
            ],
          };
        } catch (readError) {
          // If we can't read the file, just return the path
          return {
            content: [
              {
                type: 'text',
                text: `Screenshot saved to: ${filepath}\n\nNote: Unable to display image inline. You can view it at the path above.`,
              },
            ],
          };
        }
      } else {
        throw new Error(result.error || 'Failed to capture screenshot');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to capture screenshot: ${errorMessage}`);
    }
  },
};