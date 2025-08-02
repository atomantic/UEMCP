import { BaseTool } from './base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

export interface MaterialInfo {
  name: string;
  path: string;
  type: string;
  parentMaterial?: string;
  domain?: string;
}

export interface MaterialParameter {
  name: string;
  value: number | { r: number; g: number; b: number; a?: number } | string;
}

export interface DetailedMaterialInfo {
  materialPath: string;
  materialType: string;
  name: string;
  domain?: string;
  blendMode?: string;
  shadingModel?: string;
  twoSided?: boolean;
  parentMaterial?: string;
  scalarParameters?: Array<{ name: string; value: number }>;
  vectorParameters?: Array<{ name: string; value: { r: number; g: number; b: number; a: number } }>;
  textureParameters?: Array<{ name: string; texture: string | null }>;
}

/**
 * Base class for material-related tools
 */
export abstract class MaterialTool<TArgs = unknown> extends BaseTool<TArgs> {
  /**
   * Format a list of materials
   */
  protected formatMaterialList(materials: MaterialInfo[], path?: string, pattern?: string): ReturnType<typeof ResponseFormatter.success> {
    let text = `Found ${materials.length} material${materials.length !== 1 ? 's' : ''}`;
    if (path) {
      text += ` in ${path}`;
    }
    if (pattern) {
      text += ` matching "${pattern}"`;
    }
    text += '\n\n';

    if (materials.length === 0) {
      text += 'No materials found matching criteria.';
    } else {
      materials.forEach((material, index) => {
        if (index < 20) { // Limit display
          text += `${material.name} (${material.type})\n`;
          text += `  Path: ${material.path}\n`;
          if (material.parentMaterial) {
            text += `  Parent: ${material.parentMaterial}\n`;
          }
          if (material.domain) {
            text += `  Domain: ${material.domain}\n`;
          }
          if (index < materials.length - 1) text += '\n';
        }
      });
      
      if (materials.length > 20) {
        text += `\n... and ${materials.length - 20} more materials`;
      }
    }

    return ResponseFormatter.success(text);
  }

  /**
   * Format detailed material information
   */
  protected formatMaterialInfo(info: DetailedMaterialInfo): ReturnType<typeof ResponseFormatter.success> {
    const textParts: string[] = [];
    textParts.push(`Material Information: ${info.materialPath}\n\n`);
    
    // Basic info
    textParts.push(`Name: ${info.name}\n`);
    textParts.push(`Type: ${info.materialType}\n`);
    
    if (info.domain) textParts.push(`Domain: ${info.domain}\n`);
    if (info.blendMode) textParts.push(`Blend Mode: ${info.blendMode}\n`);
    if (info.shadingModel) textParts.push(`Shading Model: ${info.shadingModel}\n`);
    if (info.twoSided !== undefined) textParts.push(`Two-Sided: ${info.twoSided}\n`);
    
    // Parent material for instances
    if (info.parentMaterial) {
      textParts.push(`\nParent Material: ${info.parentMaterial}\n`);
    }
    
    // Parameters for material instances
    if (info.scalarParameters && info.scalarParameters.length > 0) {
      textParts.push(`\nScalar Parameters (${info.scalarParameters.length}):\n`);
      info.scalarParameters.forEach((param) => {
        textParts.push(`  - ${param.name}: ${param.value}\n`);
      });
    }
    
    if (info.vectorParameters && info.vectorParameters.length > 0) {
      textParts.push(`\nVector Parameters (${info.vectorParameters.length}):\n`);
      info.vectorParameters.forEach((param) => {
        const val = param.value;
        textParts.push(`  - ${param.name}: RGB(${val.r.toFixed(3)}, ${val.g.toFixed(3)}, ${val.b.toFixed(3)})\n`);
      });
    }
    
    if (info.textureParameters && info.textureParameters.length > 0) {
      textParts.push(`\nTexture Parameters (${info.textureParameters.length}):\n`);
      info.textureParameters.forEach((param) => {
        textParts.push(`  - ${param.name}: ${param.texture || 'None'}\n`);
      });
    }
    
    return ResponseFormatter.success(textParts.join('').trimEnd());
  }

  /**
   * Format material creation result
   */
  protected formatMaterialCreationResult(result: {
    materialPath?: string;
    materialInstancePath?: string;
    name: string;
    parentMaterial?: string;
    properties?: Record<string, unknown>;
    appliedParameters?: string[];
  }): ReturnType<typeof ResponseFormatter.success> {
    const path = result.materialPath || result.materialInstancePath;
    let text = `Material created successfully!\n\n`;
    text += `Name: ${result.name}\n`;
    text += `Path: ${path}\n`;
    
    if (result.parentMaterial) {
      text += `Parent Material: ${result.parentMaterial}\n`;
    }
    
    if (result.properties) {
      text += `\nProperties:\n`;
      Object.entries(result.properties).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (typeof value === 'object' && value !== null && 'r' in value) {
            const color = value as { r: number; g: number; b: number };
            text += `  - ${key}: RGB(${color.r}, ${color.g}, ${color.b})\n`;
          } else {
            text += `  - ${key}: ${String(value)}\n`;
          }
        }
      });
    }
    
    if (result.appliedParameters && result.appliedParameters.length > 0) {
      text += `\nApplied Parameters: ${result.appliedParameters.join(', ')}\n`;
    }
    
    return ResponseFormatter.success(text);
  }

  /**
   * Format material application result
   */
  protected formatMaterialApplicationResult(result: {
    actorName: string;
    materialPath: string;
    slotIndex: number;
    componentName?: string;
  }): ReturnType<typeof ResponseFormatter.success> {
    let text = `Material applied successfully!\n\n`;
    text += `Actor: ${result.actorName}\n`;
    text += `Material: ${result.materialPath}\n`;
    text += `Slot Index: ${result.slotIndex}\n`;
    
    if (result.componentName) {
      text += `Component: ${result.componentName}\n`;
    }
    
    return ResponseFormatter.success(text);
  }

  /**
   * Format error response
   */
  protected formatError(error: string): ReturnType<typeof ResponseFormatter.error> {
    return ResponseFormatter.error(error);
  }
}