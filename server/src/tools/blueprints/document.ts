import { BlueprintTool } from '../base/blueprint-tool.js';
import { ToolDefinition } from '../base/base-tool.js';
import { ResponseFormatter } from '../../utils/response-formatter.js';

interface BlueprintDocumentArgs {
  blueprintPath?: string;
  blueprintPaths?: string[];
  outputPath?: string;
  includeComponents?: boolean;
  includeVariables?: boolean;
  includeFunctions?: boolean;
  includeEvents?: boolean;
  includeDependencies?: boolean;
}

/**
 * Tool for generating Blueprint documentation
 */
export class BlueprintDocumentTool extends BlueprintTool<BlueprintDocumentArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'blueprint_document',
      description: 'Generate comprehensive markdown documentation for Blueprint systems.',
      inputSchema: {
        type: 'object',
        properties: {
          blueprintPath: {
            type: 'string',
            description: 'Single Blueprint path to document (e.g., /Game/TestBlueprints/BP_InteractiveDoor)',
          },
          blueprintPaths: {
            type: 'array',
            description: 'Array of Blueprint paths for batch documentation',
            items: {
              type: 'string',
            },
          },
          outputPath: {
            type: 'string',
            description: 'Output file path for generated documentation (optional)',
          },
          includeComponents: {
            type: 'boolean',
            description: 'Include component hierarchy in documentation (default: true)',
            default: true,
          },
          includeVariables: {
            type: 'boolean',
            description: 'Include variable descriptions in documentation (default: true)',
            default: true,
          },
          includeFunctions: {
            type: 'boolean',
            description: 'Include function signatures in documentation (default: true)',
            default: true,
          },
          includeEvents: {
            type: 'boolean',
            description: 'Include custom events in documentation (default: true)',
            default: true,
          },
          includeDependencies: {
            type: 'boolean',
            description: 'Include Blueprint dependencies and references (default: false)',
            default: false,
          },
        },
      },
    };
  }

  protected async execute(args: BlueprintDocumentArgs): Promise<ReturnType<typeof ResponseFormatter.success>> {
    // Determine which Blueprints to document
    const blueprintPaths = args.blueprintPaths || (args.blueprintPath ? [args.blueprintPath] : []);
    
    if (blueprintPaths.length === 0) {
      return this.formatError('Either blueprintPath or blueprintPaths must be provided');
    }

    const result = await this.executePythonCommand('blueprint.document', {
      blueprint_paths: blueprintPaths,
      output_path: args.outputPath,
      include_components: args.includeComponents !== false,
      include_variables: args.includeVariables !== false,
      include_functions: args.includeFunctions !== false,
      include_events: args.includeEvents !== false,
      include_dependencies: args.includeDependencies === true,
    });
    
    if (!result.success) {
      return this.formatError(result.error || 'Failed to generate Blueprint documentation');
    }

    let text = `Blueprint Documentation Generated\n\n`;
    
    if (typeof result.outputPath === 'string') {
      text += `📄 Documentation saved to: ${result.outputPath}\n`;
    } else if (result.outputPath) {
      text += `📄 Documentation saved.` + '\n';
    }
    
    text += `📋 Documented ${blueprintPaths.length} Blueprint${blueprintPaths.length === 1 ? '' : 's'}\n\n`;
    
    // Show summary of documented Blueprints
    if (result.documentedBlueprints && Array.isArray(result.documentedBlueprints)) {
      text += `## Documented Blueprints\n\n`;
      (result.documentedBlueprints as Array<{
        name: string;
        path: string;
        componentsCount?: number;
        variablesCount?: number;
        functionsCount?: number;
        eventsCount?: number;
      }>).forEach(bp => {
        text += `### ${bp.name}\n`;
        text += `- **Path**: ${bp.path}\n`;
        if (bp.componentsCount !== undefined) {
          text += `- **Components**: ${bp.componentsCount}\n`;
        }
        if (bp.variablesCount !== undefined) {
          text += `- **Variables**: ${bp.variablesCount}\n`;
        }
        if (bp.functionsCount !== undefined) {
          text += `- **Functions**: ${bp.functionsCount}\n`;
        }
        if (bp.eventsCount !== undefined) {
          text += `- **Events**: ${bp.eventsCount}\n`;
        }
        text += `\n`;
      });
    }

    // Include generated documentation if no output file specified
    if (!args.outputPath && result.documentation) {
      text += `## Generated Documentation\n\n`;
      text += result.documentation as string;
    } else if (result.documentation) {
      text += `## Documentation Preview\n\n`;
      const preview = (result.documentation as string).substring(0, 1000);
      text += preview;
      if (preview.length < (result.documentation as string).length) {
        text += `\n\n... (truncated, see full documentation in output file)`;
      }
    }

    return ResponseFormatter.success(text.trimEnd());
  }
}

export const blueprintDocumentTool = new BlueprintDocumentTool().toMCPTool();
