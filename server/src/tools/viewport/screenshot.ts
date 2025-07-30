import { ViewportTool } from '../base/viewport-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter, ToolResponse } from '../../utils/response-formatter.js';

interface ScreenshotArgs {
  width?: number;
  height?: number;
  quality?: number;
  screenPercentage?: number;
  compress?: boolean;
}

/**
 * Tool for capturing viewport screenshots
 */
export class ViewportScreenshotTool extends ViewportTool<ScreenshotArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'viewport_screenshot',
      description: 'Capture viewport screenshot. Quick: viewport_screenshot({}). High-quality: viewport_screenshot({ width: 1920, height: 1080, compress: false }). Use wireframe mode first for debugging placement!',
      inputSchema: {
        type: 'object',
        properties: {
          width: {
            type: 'number',
            description: 'Screenshot width in pixels (default: 640)',
            default: 640,
          },
          height: {
            type: 'number',
            description: 'Screenshot height in pixels (default: 360)',
            default: 360,
          },
          quality: {
            type: 'number',
            description: 'JPEG compression quality 1-100 (default: 60)',
            default: 60,
          },
          screenPercentage: {
            type: 'number',
            description: 'Screen percentage for rendering (default: 50)',
            default: 50,
          },
          compress: {
            type: 'boolean',
            description: 'Compress image to reduce file size (default: true, macOS only)',
            default: true,
          },
        },
      },
    };
  }

  protected async execute(args: ScreenshotArgs): Promise<ToolResponse> {
    const result = await this.executePythonCommand(
      this.viewportCommands.screenshot,
      args
    );
    
    const filepath = result.filepath as string;
    const width = args.width || 640;
    const height = args.height || 360;
    
    let text = `✓ Screenshot saved: ${filepath}\n`;
    text += `  Resolution: ${width}x${height}`;
    
    if (result.fileSize) {
      text += `\n  File size: ${this.formatFileSize(result.fileSize as number)}`;
    }
    
    if (args.compress === false) {
      text += '\n  Format: PNG (uncompressed)';
    } else if (args.quality !== undefined && args.quality !== 60) {
      text += `\n  Quality: ${args.quality}%`;
    }
    
    return ResponseFormatter.success(text);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export const viewportScreenshotTool = new ViewportScreenshotTool().toMCPTool();
