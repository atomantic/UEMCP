import { ActorTool } from '../base/actor-tool.js';
import { ToolResponse } from '../../utils/response-formatter.js';
import { ToolDefinition, PythonResult } from '../base/base-tool.js';

interface PlacementValidateArgs {
  actors: string[];
  tolerance?: number;
  checkAlignment?: boolean;
  modularSize?: number;
}

interface Gap {
  location: number[];
  distance: number;
  actors: string[];
  direction: string;
}

interface Overlap {
  location: number[];
  amount: number;
  actors: string[];
  severity: 'minor' | 'major' | 'critical';
}

interface AlignmentIssue {
  actor: string;
  currentLocation: number[];
  suggestedLocation: number[];
  offset: number[];
  axis: string;
}

interface PlacementValidationResult extends PythonResult {
  gaps?: Gap[];
  overlaps?: Overlap[];
  alignmentIssues?: AlignmentIssue[];
  summary?: {
    totalActors: number;
    gapsFound: number;
    overlapsFound: number;
    alignmentIssuesFound: number;
    overallStatus: 'good' | 'minor_issues' | 'major_issues' | 'critical_issues';
  };
  executionTime?: number;
}

/**
 * Tool for validating placement of modular building components
 */
export class PlacementValidateTool extends ActorTool<PlacementValidateArgs> {
  get definition(): ToolDefinition {
    return {
      name: 'placement_validate',
      description: 'Validate placement of modular building components to detect gaps, overlaps, and alignment issues. Essential for ensuring proper modular building assembly with components like ModularOldTown assets.',
      inputSchema: {
        type: 'object',
        properties: {
          actors: {
            type: 'array',
            description: 'Array of actor names to validate placement for',
            items: { type: 'string' },
            minItems: 1,
          },
          tolerance: {
            type: 'number',
            description: 'Acceptable gap/overlap distance in Unreal units (default: 10). Gaps/overlaps within this tolerance are considered acceptable.',
            default: 10,
          },
          checkAlignment: {
            type: 'boolean',
            description: 'Whether to check modular grid alignment (default: true). Ensures components snap to proper grid positions.',
            default: true,
          },
          modularSize: {
            type: 'number',
            description: 'Size of modular grid in Unreal units (default: 300). ModularOldTown assets are typically 300 units wide.',
            default: 300,
          },
        },
        required: ['actors'],
      },
    };
  }

  protected async execute(args: PlacementValidateArgs): Promise<ToolResponse> {
    // Validate we have actors to check
    if (!args.actors || args.actors.length === 0) {
      throw new Error('No actors provided for validation');
    }

    // Execute placement validation command
    const result = await this.executePythonCommand('actor.placement_validate', {
      actors: args.actors,
      tolerance: args.tolerance ?? 10,
      checkAlignment: args.checkAlignment ?? true,
      modularSize: args.modularSize ?? 300,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to validate placement');
    }

    // Format the response
    return this.formatPlacementValidationResult(result as PlacementValidationResult);
  }

  private formatPlacementValidationResult(result: PlacementValidationResult): ToolResponse {
    const { gaps = [], overlaps = [], alignmentIssues = [], summary } = result;
    
    let text = `Placement Validation Results\n`;
    text += `===============================\n\n`;

    // Summary
    if (summary) {
      text += `Summary:\n`;
      text += `  Total actors validated: ${summary.totalActors}\n`;
      text += `  Gaps found: ${summary.gapsFound}\n`;
      text += `  Overlaps found: ${summary.overlapsFound}\n`;
      text += `  Alignment issues: ${summary.alignmentIssuesFound}\n`;
      text += `  Overall status: ${summary.overallStatus.replaceAll('_', ' ').toUpperCase()}\n\n`;
    }

    // Gaps
    if (gaps.length > 0) {
      text += `GAPS DETECTED (${gaps.length}):\n`;
      text += `${'-'.repeat(30)}\n`;
      gaps.forEach((gap, index) => {
        text += `${index + 1}. Gap of ${gap.distance.toFixed(1)} units\n`;
        text += `   Location: [${gap.location.map(v => v.toFixed(1)).join(', ')}]\n`;
        text += `   Direction: ${gap.direction}\n`;
        text += `   Between actors: ${gap.actors.join(' ↔ ')}\n\n`;
      });
    }

    // Overlaps
    if (overlaps.length > 0) {
      text += `OVERLAPS DETECTED (${overlaps.length}):\n`;
      text += `${'-'.repeat(35)}\n`;
      overlaps.forEach((overlap, index) => {
        const severityIcon = overlap.severity === 'critical' ? '🔴' : 
                           overlap.severity === 'major' ? '🟡' : '🟢';
        text += `${index + 1}. ${severityIcon} ${overlap.severity.toUpperCase()} overlap of ${overlap.amount.toFixed(1)} units\n`;
        text += `   Location: [${overlap.location.map(v => v.toFixed(1)).join(', ')}]\n`;
        text += `   Overlapping actors: ${overlap.actors.join(' ↔ ')}\n\n`;
      });
    }

    // Alignment Issues
    if (alignmentIssues.length > 0) {
      text += `ALIGNMENT ISSUES (${alignmentIssues.length}):\n`;
      text += `${'-'.repeat(40)}\n`;
      alignmentIssues.forEach((issue, index) => {
        text += `${index + 1}. Actor: ${issue.actor}\n`;
        text += `   Current: [${issue.currentLocation.map(v => v.toFixed(1)).join(', ')}]\n`;
        text += `   Suggested: [${issue.suggestedLocation.map(v => v.toFixed(1)).join(', ')}]\n`;
        text += `   Offset needed: [${issue.offset.map(v => v.toFixed(1)).join(', ')}] on ${issue.axis} axis\n\n`;
      });
    }

    // Recommendations
    if (gaps.length > 0 || overlaps.length > 0 || alignmentIssues.length > 0) {
      text += `RECOMMENDATIONS:\n`;
      text += `${'-'.repeat(16)}\n`;
      
      if (gaps.length > 0) {
        text += `• Close gaps by moving actors closer together\n`;
        text += `• Use actor_modify tool to adjust positions\n`;
      }
      
      if (overlaps.length > 0) {
        const criticalOverlaps = overlaps.filter(o => o.severity === 'critical').length;
        if (criticalOverlaps > 0) {
          text += `• URGENT: Fix ${criticalOverlaps} critical overlaps immediately\n`;
        }
        text += `• Separate overlapping actors to prevent visual artifacts\n`;
      }
      
      if (alignmentIssues.length > 0) {
        text += `• Align actors to modular grid for proper snapping\n`;
        text += `• Use suggested positions for proper alignment\n`;
      }
      
      text += `• Take wireframe screenshots to verify fixes\n`;
      text += `• Re-run validation after making adjustments\n`;
    } else {
      text += `✅ All actors are properly placed!\n`;
      text += `No gaps, overlaps, or alignment issues detected.\n`;
    }

    // Timing information
    if (result.executionTime !== undefined) {
      text += `\nValidation completed in ${result.executionTime.toFixed(2)} seconds`;
    }

    return {
      content: [
        {
          type: 'text',
          text: text.trimEnd(),
        },
      ],
    };
  }
}

export const placementValidateTool = new PlacementValidateTool().toMCPTool();