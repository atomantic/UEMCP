import { logger } from '../utils/logger.js';
import { PythonBridge } from '../services/python-bridge.js';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';

interface ViewportScreenshotArgs {
  width?: number;
  height?: number;
  screenPercentage?: number;
  compress?: boolean;
  quality?: number;
}

// Helper function to compress image using sips on macOS
async function compressImage(inputPath: string, quality: number = 60): Promise<string> {
  const outputPath = inputPath.replace('.png', '_compressed.jpg');
  
  return new Promise((resolve, reject) => {
    const sips = spawn('sips', [
      '-s', 'format', 'jpeg',
      '-s', 'formatOptions', quality.toString(),
      inputPath,
      '--out', outputPath
    ]);
    
    sips.on('close', (code) => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`Image compression failed with code ${code}`));
      }
    });
    
    sips.on('error', (error) => {
      reject(error);
    });
  });
}

export const viewportScreenshotTool = {
  definition: {
    name: 'viewport_screenshot',
    description: 'Take a screenshot of the current viewport. Examples: viewport_screenshot({}) for quick debug shot, or viewport_screenshot({ width: 1920, height: 1080, quality: 90, compress: false }) for high quality',
    inputSchema: {
      type: 'object',
      properties: {
        width: {
          type: 'number',
          description: 'Screenshot width in pixels (default: 640)',
          default: 640
        },
        height: {
          type: 'number', 
          description: 'Screenshot height in pixels (default: 360)',
          default: 360
        },
        screenPercentage: {
          type: 'number',
          description: 'Screen percentage for rendering (default: 50)',
          default: 50
        },
        compress: {
          type: 'boolean',
          description: 'Compress image to reduce file size (default: true)',
          default: true
        },
        quality: {
          type: 'number',
          description: 'JPEG compression quality 1-100 (default: 60)',
          default: 60
        }
      },
      required: [],
    },
  },
  handler: async (args: unknown = {}): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> => {
    const {
      width = 640,
      height = 360, 
      screenPercentage = 50,
      compress = true,
      quality = 60
    } = args as ViewportScreenshotArgs;
    
    logger.debug(`Taking viewport screenshot: ${width}x${height} @ ${screenPercentage}%, compress: ${compress}`);
    
    try {
      const bridge = new PythonBridge();
      const result = await bridge.executeCommand({
        type: 'viewport.screenshot',
        params: {
          width,
          height,
          screenPercentage
        }
      });
      
      if (result.success && result.filepath) {
        let filepath = result.filepath as string;
        let originalSize = 0;
        let compressedSize = 0;
        
        // Read the image file
        try {
          // Get original file size
          const originalStats = await fs.stat(filepath);
          originalSize = originalStats.size;
          
          // Compress image if requested and on macOS
          if (compress && process.platform === 'darwin') {
            try {
              const compressedPath = await compressImage(filepath, quality);
              const compressedStats = await fs.stat(compressedPath);
              compressedSize = compressedStats.size;
              
              // Use compressed version if it's actually smaller
              if (compressedSize < originalSize) {
                filepath = compressedPath;
                logger.debug(`Image compressed: ${originalSize} bytes -> ${compressedSize} bytes (${Math.round((1 - compressedSize/originalSize) * 100)}% reduction)`);
              } else {
                logger.debug('Compressed image not smaller, using original');
              }
            } catch (compressionError) {
              logger.warn(`Image compression failed: ${String(compressionError)}, using original`);
            }
          }
          
          // For now, just return the file path since we don't display images inline
          // const imageBuffer = await fs.readFile(filepath);
          // const base64Image = imageBuffer.toString('base64');
          
          const sizeInfo = compress && compressedSize > 0 && compressedSize < originalSize
            ? `\nOriginal: ${Math.round(originalSize/1024)}KB, Compressed: ${Math.round(compressedSize/1024)}KB`
            : `\nFile size: ${Math.round(originalSize/1024)}KB`;
          
          return {
            content: [
              {
                type: 'text',
                text: `Screenshot saved to: ${filepath}${sizeInfo}\n\nNote: Unable to display image inline. You can view it at the path above.`,
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