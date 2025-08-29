import { BlueprintTool } from '../base/blueprint-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface BlueprintAddComponentArgs {
  blueprintPath: string;
  componentName: string;
  componentType: string;
  parentComponent?: string;
  attachSocketName?: string;
  relativeLocation?: number[];
  relativeRotation?: number[];
  relativeScale?: number[];
  properties?: Record<string, unknown>;
}

/**
 * Tool for adding components to Blueprint classes
 */
export class BlueprintAddComponentTool extends BlueprintTool<BlueprintAddComponentArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'blueprint_add_component',
      description: 'Add components to Blueprint actors. Example: blueprint_add_component({ blueprintPath: "/Game/Blueprints/BP_Door", componentName: "DoorMesh", componentType: "StaticMeshComponent" }).',
      inputSchema: {
        type: 'object',
        properties: {
          blueprintPath: {
            type: 'string',
            description: 'Path to the Blueprint (e.g., "/Game/Blueprints/BP_Door")',
          },
          componentName: {
            type: 'string',
            description: 'Name for the new component',
          },
          componentType: {
            type: 'string',
            description: 'Type of component to add (e.g., "StaticMeshComponent", "BoxComponent", "PointLightComponent")',
          },
          parentComponent: {
            type: 'string',
            description: 'Name of parent component to attach to (default: root)',
          },
          attachSocketName: {
            type: 'string',
            description: 'Socket name on parent component for attachment',
          },
          relativeLocation: {
            type: 'array',
            description: 'Relative location [X, Y, Z]',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
          },
          relativeRotation: {
            type: 'array',
            description: 'Relative rotation [Roll, Pitch, Yaw] in degrees',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
          },
          relativeScale: {
            type: 'array',
            description: 'Relative scale [X, Y, Z]',
            items: { type: 'number' },
            minItems: 3,
            maxItems: 3,
            default: [1, 1, 1],
          },
          properties: {
            type: 'object',
            description: 'Additional properties to set on the component',
            additionalProperties: true,
          },
        },
        required: ['blueprintPath', 'componentName', 'componentType'],
      },
    };
  }

  protected async execute(args: BlueprintAddComponentArgs): Promise<ReturnType<typeof ResponseFormatter.success>> {
    // Validate required fields
    if (!args.blueprintPath || !args.componentName || !args.componentType) {
      return this.formatError('blueprintPath, componentName, and componentType are required');
    }
    
    // Execute Python command to add component
    const result = await this.executePythonCommand('blueprint.add_component', {
      blueprint_path: args.blueprintPath,
      component_name: args.componentName,
      component_type: args.componentType,
      parent_component: args.parentComponent,
      attach_socket_name: args.attachSocketName,
      relative_location: args.relativeLocation,
      relative_rotation: args.relativeRotation,
      relative_scale: args.relativeScale || [1, 1, 1],
      properties: args.properties,
    });
    
    if (!result.success) {
      return this.formatError(result.error || 'Failed to add component to Blueprint');
    }
    
    let text = `Component added successfully!\n\n`;
    text += `Blueprint: ${args.blueprintPath}\n`;
    text += `Component Name: ${args.componentName}\n`;
    text += `Component Type: ${args.componentType}\n`;
    
    if (args.parentComponent) {
      text += `Parent Component: ${args.parentComponent}\n`;
    }
    if (args.attachSocketName) {
      text += `Attach Socket: ${args.attachSocketName}\n`;
    }
    
    // Add transform info if provided
    if (args.relativeLocation || args.relativeRotation || args.relativeScale) {
      text += `\nTransform:\n`;
      if (args.relativeLocation) {
        text += `  Location: [${args.relativeLocation.join(', ')}]\n`;
      }
      if (args.relativeRotation) {
        text += `  Rotation: [${args.relativeRotation.join(', ')}]\n`;
      }
      if (args.relativeScale && args.relativeScale.some(v => v !== 1)) {
        text += `  Scale: [${args.relativeScale.join(', ')}]\n`;
      }
    }
    
    // Add properties set info
    if (result.propertiesSet && Array.isArray(result.propertiesSet) && result.propertiesSet.length > 0) {
      text += `\nProperties Set:\n`;
      result.propertiesSet.forEach((prop: string) => {
        text += `  - ${prop}\n`;
      });
    }
    
    return ResponseFormatter.success(text.trimEnd());
  }
}

export const blueprintAddComponentTool = new BlueprintAddComponentTool().toMCPTool();