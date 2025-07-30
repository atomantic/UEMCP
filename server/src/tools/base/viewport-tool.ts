import { BaseTool } from './base-tool.js';

/**
 * Base class for viewport-related tools
 */
export abstract class ViewportTool<TArgs = unknown> extends BaseTool<TArgs> {
  /**
   * Format camera location
   */
  protected formatCameraInfo(location?: number[], rotation?: number[]): string {
    let info = '';
    
    if (location && Array.isArray(location)) {
      info += `Location: [${location.map(n => n.toFixed(1)).join(', ')}]`;
    }
    
    if (rotation && Array.isArray(rotation)) {
      if (info) info += '\n';
      info += `Rotation: [${rotation.map(n => n.toFixed(1)).join(', ')}]°`;
    }
    
    return info;
  }

  /**
   * Common viewport command types
   */
  protected get viewportCommands() {
    return {
      screenshot: 'viewport.screenshot',
      camera: 'viewport.camera',
      mode: 'viewport.mode',
      focus: 'viewport.focus',
      renderMode: 'viewport.render_mode',
      bounds: 'viewport.bounds',
      fit: 'viewport.fit',
      lookAt: 'viewport.look_at',
    };
  }
}