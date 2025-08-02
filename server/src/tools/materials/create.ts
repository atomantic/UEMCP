import { MaterialTool } from '../base/material-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ToolResponse } from '../../utils/response-formatter.js';

interface MaterialCreateArgs {
  materialName: string;
  targetFolder?: string;
  baseColor?: { r: number; g: number; b: number };
  metallic?: number;
  roughness?: number;
  specular?: number;
  emissive?: { r: number; g: number; b: number };
}

interface MaterialInstanceCreateArgs {
  parentMaterialPath: string;
  instanceName: string;
  targetFolder?: string;
  parameters?: Record<string, number | { r: number; g: number; b: number; a?: number } | string>;
}

/**
 * Tool for creating new materials and material instances
 */
export class MaterialCreateTool extends MaterialTool<MaterialCreateArgs | MaterialInstanceCreateArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'material_create',
      description: 'Create materials or material instances. For simple materials: material_create({ materialName: "M_Sand", baseColor: { r: 0.8, g: 0.7, b: 0.5 } }). For instances: material_create({ parentMaterialPath: "/Game/Materials/M_Base", instanceName: "MI_Sand" }).',
      inputSchema: {
        type: 'object',
        properties: {
          // Simple material creation
          materialName: {
            type: 'string',
            description: 'Name for new material (creates simple material)',
          },
          targetFolder: {
            type: 'string',
            description: 'Destination folder (default: /Game/Materials)',
            default: '/Game/Materials',
          },
          baseColor: {
            type: 'object',
            description: 'RGB base color (0-1 range)',
            properties: {
              r: { type: 'number', minimum: 0, maximum: 1 },
              g: { type: 'number', minimum: 0, maximum: 1 },
              b: { type: 'number', minimum: 0, maximum: 1 },
            },
            required: ['r', 'g', 'b'],
          },
          metallic: {
            type: 'number',
            description: 'Metallic value (0-1)',
            minimum: 0,
            maximum: 1,
            default: 0.0,
          },
          roughness: {
            type: 'number',
            description: 'Roughness value (0-1)',
            minimum: 0,
            maximum: 1,
            default: 0.5,
          },
          emissive: {
            type: 'object',
            description: 'RGB emissive color (0-1 range)',
            properties: {
              r: { type: 'number', minimum: 0 },
              g: { type: 'number', minimum: 0 },
              b: { type: 'number', minimum: 0 },
            },
            required: ['r', 'g', 'b'],
          },
          
          // Material instance creation
          parentMaterialPath: {
            type: 'string',
            description: 'Path to parent material (creates material instance)',
          },
          instanceName: {
            type: 'string',
            description: 'Name for new material instance',
          },
          parameters: {
            type: 'object',
            description: 'Parameter overrides for material instance',
            additionalProperties: true,
          },
        },
        anyOf: [
          { required: ['materialName'] },
          { required: ['parentMaterialPath', 'instanceName'] },
        ],
      },
    };
  }

  protected async execute(args: MaterialCreateArgs | MaterialInstanceCreateArgs): Promise<ToolResponse> {
    // Determine if creating simple material or material instance
    if ('materialName' in args) {
      // Create simple material
      const result = await this.executePythonCommand('material.create_simple_material', {
        material_name: args.materialName,
        target_folder: args.targetFolder,
        base_color: args.baseColor,
        metallic: args.metallic,
        roughness: args.roughness,
        emissive: args.emissive
      });
      
      if (!result.success) {
        return this.formatError(result.error || 'Failed to create material');
      }
      
      return this.formatMaterialCreationResult({
        name: args.materialName,
        materialPath: result.materialPath as string,
        properties: {
          baseColor: args.baseColor,
          roughness: args.roughness,
          metallic: args.metallic,
          specular: args.specular,
          emissive: args.emissive
        }
      });
    } else {
      // Create material instance
      const result = await this.executePythonCommand('material.create_material_instance', {
        parent_material_path: args.parentMaterialPath,
        instance_name: args.instanceName,
        target_folder: args.targetFolder,
        parameters: args.parameters
      });
      
      if (!result.success) {
        return this.formatError(result.error || 'Failed to create material instance');
      }
      
      return this.formatMaterialCreationResult({
        name: args.instanceName,
        materialInstancePath: result.materialInstancePath as string,
        parentMaterial: args.parentMaterialPath,
        appliedParameters: result.appliedParameters as string[] | undefined
      });
    }
  }
}

export const materialCreateTool = new MaterialCreateTool().toMCPTool();