// Mock the Python bridge
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { PlacementValidateTool } from '../../../src/tools/actors/placement-validate.js';

describe('PlacementValidateTool', () => {
  let tool: PlacementValidateTool;

  beforeEach(() => {
    tool = new PlacementValidateTool();
    jest.clearAllMocks();
  });

  describe('definition', () => {
    it('should have correct name and description', () => {
      const definition = tool.definition;
      expect(definition.name).toBe('placement_validate');
      expect(definition.description).toContain('Validate placement of modular building components');
      expect(definition.description).toContain('detect gaps, overlaps, and alignment issues');
      expect(definition.description).toContain('ModularOldTown assets');
    });

    it('should have proper input schema', () => {
      const schema = tool.definition.inputSchema as any;
      expect(schema.type).toBe('object');
      expect(schema.required).toEqual(['actors']);
      
      expect(schema.properties.actors.type).toBe('array');
      expect(schema.properties.actors.description).toContain('Array of actor names to validate placement for');
      expect(schema.properties.actors.items.type).toBe('string');
      expect(schema.properties.actors.minItems).toBe(1);
      
      expect(schema.properties.tolerance.type).toBe('number');
      expect(schema.properties.tolerance.default).toBe(10);
      expect(schema.properties.tolerance.description).toContain('Acceptable gap/overlap distance');
      
      expect(schema.properties.checkAlignment.type).toBe('boolean');
      expect(schema.properties.checkAlignment.default).toBe(true);
      expect(schema.properties.checkAlignment.description).toContain('Whether to check modular grid alignment');
      
      expect(schema.properties.modularSize.type).toBe('number');
      expect(schema.properties.modularSize.default).toBe(300);
      expect(schema.properties.modularSize.description).toContain('Size of modular grid in Unreal units');
    });
  });

  describe('execute', () => {
    it('should throw error when no actors provided', async () => {
      await expect(tool.toMCPTool().handler({ actors: [] }))
        .rejects.toThrow('No actors provided for validation');
    });

    it('should validate placement with perfect results', async () => {
      const args = {
        actors: ['Wall_1', 'Wall_2', 'Corner_1']
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        gaps: [],
        overlaps: [],
        alignmentIssues: [],
        summary: {
          totalActors: 3,
          gapsFound: 0,
          overlapsFound: 0,
          alignmentIssuesFound: 0,
          overallStatus: 'good'
        },
        executionTime: 0.15
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor.placement_validate',
        params: {
          actors: ['Wall_1', 'Wall_2', 'Corner_1'],
          tolerance: 10,
          checkAlignment: true,
          modularSize: 300
        }
      });

      expect(result.content[0].text).toContain('Placement Validation Results');
      expect(result.content[0].text).toContain('Total actors validated: 3');
      expect(result.content[0].text).toContain('Gaps found: 0');
      expect(result.content[0].text).toContain('Overlaps found: 0');
      expect(result.content[0].text).toContain('Alignment issues: 0');
      expect(result.content[0].text).toContain('Overall status: GOOD');
      expect(result.content[0].text).toContain('✅ All actors are properly placed!');
      expect(result.content[0].text).toContain('No gaps, overlaps, or alignment issues detected.');
      expect(result.content[0].text).toContain('Validation completed in 0.15 seconds');
    });

    it('should validate placement with custom parameters', async () => {
      const args = {
        actors: ['Wall_1'],
        tolerance: 5,
        checkAlignment: false,
        modularSize: 400
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        gaps: [],
        overlaps: [],
        alignmentIssues: [],
        summary: {
          totalActors: 1,
          gapsFound: 0,
          overlapsFound: 0,
          alignmentIssuesFound: 0,
          overallStatus: 'good'
        }
      });

      const result = await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor.placement_validate',
        params: {
          actors: ['Wall_1'],
          tolerance: 5,
          checkAlignment: false,
          modularSize: 400
        }
      });

      expect(result.content[0].text).toContain('✅ All actors are properly placed!');
    });

    it('should detect and format gaps', async () => {
      const args = {
        actors: ['Wall_1', 'Wall_2']
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        gaps: [
          {
            location: [150, 200, 0],
            distance: 25.5,
            actors: ['Wall_1', 'Wall_2'],
            direction: 'North-South'
          },
          {
            location: [300, 400, 0],
            distance: 15.2,
            actors: ['Wall_2', 'Wall_3'],
            direction: 'East-West'
          }
        ],
        overlaps: [],
        alignmentIssues: [],
        summary: {
          totalActors: 2,
          gapsFound: 2,
          overlapsFound: 0,
          alignmentIssuesFound: 0,
          overallStatus: 'minor_issues'
        }
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('GAPS DETECTED (2):');
      expect(result.content[0].text).toContain('1. Gap of 25.5 units');
      expect(result.content[0].text).toContain('Location: [150.0, 200.0, 0.0]');
      expect(result.content[0].text).toContain('Direction: North-South');
      expect(result.content[0].text).toContain('Between actors: Wall_1 ↔ Wall_2');
      
      expect(result.content[0].text).toContain('2. Gap of 15.2 units');
      expect(result.content[0].text).toContain('Location: [300.0, 400.0, 0.0]');
      expect(result.content[0].text).toContain('Direction: East-West');
      expect(result.content[0].text).toContain('Between actors: Wall_2 ↔ Wall_3');
      
      expect(result.content[0].text).toContain('RECOMMENDATIONS:');
      expect(result.content[0].text).toContain('• Close gaps by moving actors closer together');
      expect(result.content[0].text).toContain('• Use actor_modify tool to adjust positions');
    });

    it('should detect and format overlaps with different severities', async () => {
      const args = {
        actors: ['Wall_1', 'Wall_2', 'Wall_3']
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        gaps: [],
        overlaps: [
          {
            location: [100, 150, 0],
            amount: 5.3,
            actors: ['Wall_1', 'Wall_2'],
            severity: 'minor'
          },
          {
            location: [200, 250, 0],
            amount: 15.7,
            actors: ['Wall_2', 'Wall_3'],
            severity: 'major'
          },
          {
            location: [300, 350, 0],
            amount: 45.8,
            actors: ['Wall_1', 'Wall_3'],
            severity: 'critical'
          }
        ],
        alignmentIssues: [],
        summary: {
          totalActors: 3,
          gapsFound: 0,
          overlapsFound: 3,
          alignmentIssuesFound: 0,
          overallStatus: 'critical_issues'
        }
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('OVERLAPS DETECTED (3):');
      
      expect(result.content[0].text).toContain('1. 🟢 MINOR overlap of 5.3 units');
      expect(result.content[0].text).toContain('Location: [100.0, 150.0, 0.0]');
      expect(result.content[0].text).toContain('Overlapping actors: Wall_1 ↔ Wall_2');
      
      expect(result.content[0].text).toContain('2. 🟡 MAJOR overlap of 15.7 units');
      expect(result.content[0].text).toContain('Location: [200.0, 250.0, 0.0]');
      expect(result.content[0].text).toContain('Overlapping actors: Wall_2 ↔ Wall_3');
      
      expect(result.content[0].text).toContain('3. 🔴 CRITICAL overlap of 45.8 units');
      expect(result.content[0].text).toContain('Location: [300.0, 350.0, 0.0]');
      expect(result.content[0].text).toContain('Overlapping actors: Wall_1 ↔ Wall_3');
      
      expect(result.content[0].text).toContain('• URGENT: Fix 1 critical overlaps immediately');
      expect(result.content[0].text).toContain('• Separate overlapping actors to prevent visual artifacts');
    });

    it('should detect and format alignment issues', async () => {
      const args = {
        actors: ['Wall_1', 'Wall_2']
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        gaps: [],
        overlaps: [],
        alignmentIssues: [
          {
            actor: 'Wall_1',
            currentLocation: [155.5, 202.3, 0],
            suggestedLocation: [150, 200, 0],
            offset: [-5.5, -2.3, 0],
            axis: 'X'
          },
          {
            actor: 'Wall_2',
            currentLocation: [298.7, 400, 0],
            suggestedLocation: [300, 400, 0],
            offset: [1.3, 0, 0],
            axis: 'Y'
          }
        ],
        summary: {
          totalActors: 2,
          gapsFound: 0,
          overlapsFound: 0,
          alignmentIssuesFound: 2,
          overallStatus: 'minor_issues'
        }
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('ALIGNMENT ISSUES (2):');
      
      expect(result.content[0].text).toContain('1. Actor: Wall_1');
      expect(result.content[0].text).toContain('Current: [155.5, 202.3, 0.0]');
      expect(result.content[0].text).toContain('Suggested: [150.0, 200.0, 0.0]');
      expect(result.content[0].text).toContain('Offset needed: [-5.5, -2.3, 0.0] on X axis');
      
      expect(result.content[0].text).toContain('2. Actor: Wall_2');
      expect(result.content[0].text).toContain('Current: [298.7, 400.0, 0.0]');
      expect(result.content[0].text).toContain('Suggested: [300.0, 400.0, 0.0]');
      expect(result.content[0].text).toContain('Offset needed: [1.3, 0.0, 0.0] on Y axis');
      
      expect(result.content[0].text).toContain('• Align actors to modular grid for proper snapping');
      expect(result.content[0].text).toContain('• Use suggested positions for proper alignment');
    });

    it('should format complex results with all issue types', async () => {
      const args = {
        actors: ['Wall_1', 'Wall_2', 'Wall_3', 'Corner_1']
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        gaps: [
          {
            location: [100, 100, 0],
            distance: 20.0,
            actors: ['Wall_1', 'Wall_2'],
            direction: 'North'
          }
        ],
        overlaps: [
          {
            location: [200, 200, 0],
            amount: 10.5,
            actors: ['Wall_2', 'Wall_3'],
            severity: 'major'
          }
        ],
        alignmentIssues: [
          {
            actor: 'Corner_1',
            currentLocation: [305, 295, 0],
            suggestedLocation: [300, 300, 0],
            offset: [-5, 5, 0],
            axis: 'XY'
          }
        ],
        summary: {
          totalActors: 4,
          gapsFound: 1,
          overlapsFound: 1,
          alignmentIssuesFound: 1,
          overallStatus: 'major_issues'
        },
        executionTime: 0.85
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Total actors validated: 4');
      expect(result.content[0].text).toContain('Gaps found: 1');
      expect(result.content[0].text).toContain('Overlaps found: 1');
      expect(result.content[0].text).toContain('Alignment issues: 1');
      expect(result.content[0].text).toContain('Overall status: MAJOR ISSUES');
      
      expect(result.content[0].text).toContain('GAPS DETECTED (1):');
      expect(result.content[0].text).toContain('OVERLAPS DETECTED (1):');
      expect(result.content[0].text).toContain('ALIGNMENT ISSUES (1):');
      expect(result.content[0].text).toContain('RECOMMENDATIONS:');
      
      expect(result.content[0].text).toContain('• Close gaps by moving actors closer together');
      expect(result.content[0].text).toContain('• Separate overlapping actors to prevent visual artifacts');
      expect(result.content[0].text).toContain('• Align actors to modular grid for proper snapping');
      expect(result.content[0].text).toContain('• Take wireframe screenshots to verify fixes');
      expect(result.content[0].text).toContain('• Re-run validation after making adjustments');
      
      expect(result.content[0].text).toContain('Validation completed in 0.85 seconds');
    });

    it('should handle results without summary', async () => {
      const args = {
        actors: ['Wall_1']
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        gaps: [],
        overlaps: [],
        alignmentIssues: []
        // No summary provided
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Placement Validation Results');
      expect(result.content[0].text).not.toContain('Summary:');
      expect(result.content[0].text).toContain('✅ All actors are properly placed!');
    });

    it('should handle results without execution time', async () => {
      const args = {
        actors: ['Wall_1']
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        gaps: [],
        overlaps: [],
        alignmentIssues: [],
        summary: {
          totalActors: 1,
          gapsFound: 0,
          overlapsFound: 0,
          alignmentIssuesFound: 0,
          overallStatus: 'good'
        }
        // No executionTime
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).not.toContain('Validation completed in');
    });

    it('should handle empty arrays gracefully', async () => {
      const args = {
        actors: ['Wall_1']
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        gaps: [],
        overlaps: [],
        alignmentIssues: [],
        summary: {
          totalActors: 1,
          gapsFound: 0,
          overlapsFound: 0,
          alignmentIssuesFound: 0,
          overallStatus: 'good'
        }
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).not.toContain('GAPS DETECTED');
      expect(result.content[0].text).not.toContain('OVERLAPS DETECTED');
      expect(result.content[0].text).not.toContain('ALIGNMENT ISSUES');
      expect(result.content[0].text).toContain('✅ All actors are properly placed!');
    });

    it('should use default parameters when not provided', async () => {
      const args = {
        actors: ['Wall_1', 'Wall_2']
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        gaps: [],
        overlaps: [],
        alignmentIssues: [],
        summary: {
          totalActors: 2,
          gapsFound: 0,
          overlapsFound: 0,
          alignmentIssuesFound: 0,
          overallStatus: 'good'
        }
      });

      await tool.toMCPTool().handler(args);

      expect(mockExecuteCommand).toHaveBeenCalledWith({
        type: 'actor.placement_validate',
        params: {
          actors: ['Wall_1', 'Wall_2'],
          tolerance: 10,
          checkAlignment: true,
          modularSize: 300
        }
      });
    });

    it('should handle multiple critical overlaps', async () => {
      const args = {
        actors: ['Wall_1', 'Wall_2', 'Wall_3']
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        gaps: [],
        overlaps: [
          {
            location: [100, 100, 0],
            amount: 50.0,
            actors: ['Wall_1', 'Wall_2'],
            severity: 'critical'
          },
          {
            location: [200, 200, 0],
            amount: 35.0,
            actors: ['Wall_2', 'Wall_3'],
            severity: 'critical'
          },
          {
            location: [150, 150, 0],
            amount: 5.0,
            actors: ['Wall_1', 'Wall_3'],
            severity: 'minor'
          }
        ],
        alignmentIssues: [],
        summary: {
          totalActors: 3,
          gapsFound: 0,
          overlapsFound: 3,
          alignmentIssuesFound: 0,
          overallStatus: 'critical_issues'
        }
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('OVERLAPS DETECTED (3):');
      expect(result.content[0].text).toContain('• URGENT: Fix 2 critical overlaps immediately');
      expect(result.content[0].text).toContain('🔴 CRITICAL overlap of 50.0 units');
      expect(result.content[0].text).toContain('🔴 CRITICAL overlap of 35.0 units');
      expect(result.content[0].text).toContain('🟢 MINOR overlap of 5.0 units');
    });

    it('should handle zero values correctly', async () => {
      const args = {
        actors: ['Wall_1']
      };

      mockExecuteCommand.mockResolvedValue({
        success: true,
        gaps: [
          {
            location: [0, 0, 0],
            distance: 0.0,
            actors: ['Wall_1', 'Wall_2'],
            direction: 'None'
          }
        ],
        overlaps: [
          {
            location: [0, 0, 0],
            amount: 0.0,
            actors: ['Wall_1', 'Wall_2'],
            severity: 'minor'
          }
        ],
        alignmentIssues: [
          {
            actor: 'Wall_1',
            currentLocation: [0, 0, 0],
            suggestedLocation: [0, 0, 0],
            offset: [0, 0, 0],
            axis: 'None'
          }
        ],
        summary: {
          totalActors: 1,
          gapsFound: 1,
          overlapsFound: 1,
          alignmentIssuesFound: 1,
          overallStatus: 'minor_issues'
        },
        executionTime: 0.00
      });

      const result = await tool.toMCPTool().handler(args);

      expect(result.content[0].text).toContain('Gap of 0.0 units');
      expect(result.content[0].text).toContain('Location: [0.0, 0.0, 0.0]');
      expect(result.content[0].text).toContain('MINOR overlap of 0.0 units');
      expect(result.content[0].text).toContain('Current: [0.0, 0.0, 0.0]');
      expect(result.content[0].text).toContain('Suggested: [0.0, 0.0, 0.0]');
      expect(result.content[0].text).toContain('Offset needed: [0.0, 0.0, 0.0] on None axis');
      expect(result.content[0].text).toContain('Validation completed in 0.00 seconds');
    });

    it('should handle status with underscores correctly', async () => {
      const args = {
        actors: ['Wall_1']
      };

      const statuses = ['good', 'minor_issues', 'major_issues', 'critical_issues'];
      const expectedTexts = ['GOOD', 'MINOR ISSUES', 'MAJOR ISSUES', 'CRITICAL ISSUES'];

      for (let i = 0; i < statuses.length; i++) {
        mockExecuteCommand.mockResolvedValue({
          success: true,
          gaps: [],
          overlaps: [],
          alignmentIssues: [],
          summary: {
            totalActors: 1,
            gapsFound: 0,
            overlapsFound: 0,
            alignmentIssuesFound: 0,
            overallStatus: statuses[i]
          }
        });

        const result = await tool.toMCPTool().handler(args);
        expect(result.content[0].text).toContain(`Overall status: ${expectedTexts[i]}`);
      }
    });

    it('should throw error when Python command fails', async () => {
      const args = {
        actors: ['Wall_1']
      };

      mockExecuteCommand.mockResolvedValue({
        success: false,
        error: 'Failed to analyze actor placement: Actors not found'
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Failed to analyze actor placement: Actors not found'
      );
    });

    it('should throw error when Python command fails without error message', async () => {
      const args = {
        actors: ['Wall_1']
      };

      mockExecuteCommand.mockResolvedValue({
        success: false
      });

      await expect(tool.toMCPTool().handler(args)).rejects.toThrow(
        'Failed to execute placement_validate: Command actor.placement_validate failed'
      );
    });
  });
});