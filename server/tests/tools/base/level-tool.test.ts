// Mock the Python bridge
const mockExecuteCommand = jest.fn();

jest.mock('../../../src/services/python-bridge.js', () => ({
  PythonBridge: jest.fn().mockImplementation(() => ({
    executeCommand: mockExecuteCommand
  }))
}));

import { LevelTool } from '../../../src/tools/base/level-tool.js';
import { ResponseFormatter } from '../../../src/utils/response-formatter.js';

// Create a concrete implementation for testing
class TestLevelTool extends LevelTool<{ testParam: string }> {
  get definition() {
    return {
      name: 'test_level_tool',
      description: 'Test level tool',
      inputSchema: {
        type: 'object' as const,
        properties: {
          testParam: { type: 'string' }
        }
      }
    };
  }

  protected async execute(): Promise<ReturnType<typeof ResponseFormatter.success>> {
    return ResponseFormatter.success('test result');
  }

  // Expose protected methods for testing
  public testGetLevelCommands() {
    return this.levelCommands;
  }

  public testFormatActorList(actors: Parameters<LevelTool['formatActorList']>[0], totalCount: number) {
    return this.formatActorList(actors, totalCount);
  }

  public testFormatOutlinerStructure(structure: Parameters<LevelTool['formatOutlinerStructure']>[0]) {
    return this.formatOutlinerStructure(structure);
  }
}

describe('LevelTool', () => {
  let tool: TestLevelTool;

  beforeEach(() => {
    tool = new TestLevelTool();
    jest.clearAllMocks();
  });

  describe('levelCommands', () => {
    it('should return standard level commands', () => {
      const commands = tool.testGetLevelCommands();

      expect(commands).toEqual({
        actors: 'level.actors',
        save: 'level.save',
        outliner: 'level.outliner',
        info: 'project.info'
      });
    });
  });

  describe('formatActorList', () => {
    it('should format empty actor list', () => {
      const actors: Parameters<TestLevelTool['testFormatActorList']>[0] = [];
      const result = tool.testFormatActorList(actors, 0);

      expect(result).toContain('Found 0 actors');
      expect(result).not.toContain('showing');
    });

    it('should format single actor with minimal info', () => {
      const actors = [{
        name: 'Wall_01',
        class: 'StaticMeshActor',
        location: { x: 100, y: 200, z: 0 }
      }];
      const result = tool.testFormatActorList(actors, 1);

      expect(result).toContain('Found 1 actor');
      expect(result).toContain('Wall_01 (StaticMeshActor)');
      expect(result).toContain('Location: [100, 200, 0]');
    });

    it('should format multiple actors', () => {
      const actors = [
        {
          name: 'Wall_01',
          class: 'StaticMeshActor',
          location: { x: 100, y: 200, z: 0 }
        },
        {
          name: 'Light_01',
          class: 'DirectionalLight',
          location: { x: 0, y: 0, z: 300 }
        }
      ];
      const result = tool.testFormatActorList(actors, 2);

      expect(result).toContain('Found 2 actors');
      expect(result).toContain('Wall_01 (StaticMeshActor)');
      expect(result).toContain('Light_01 (DirectionalLight)');
      expect(result).toContain('Location: [100, 200, 0]');
      expect(result).toContain('Location: [0, 0, 300]');
    });

    it('should show partial results when actors length is less than total', () => {
      const actors = [{
        name: 'Wall_01',
        class: 'StaticMeshActor',
        location: { x: 100, y: 200, z: 0 }
      }];
      const result = tool.testFormatActorList(actors, 10);

      expect(result).toContain('Found 10 actors (showing 1)');
    });

    it('should include rotation when non-zero', () => {
      const actors = [{
        name: 'Wall_01',
        class: 'StaticMeshActor',
        location: { x: 100, y: 200, z: 0 },
        rotation: { roll: 0, pitch: 0, yaw: 90 }
      }];
      const result = tool.testFormatActorList(actors, 1);

      expect(result).toContain('Rotation: [0, 0, 90]°');
    });

    it('should not include rotation when all values are zero', () => {
      const actors = [{
        name: 'Wall_01',
        class: 'StaticMeshActor',
        location: { x: 100, y: 200, z: 0 },
        rotation: { roll: 0, pitch: 0, yaw: 0 }
      }];
      const result = tool.testFormatActorList(actors, 1);

      expect(result).not.toContain('Rotation:');
    });

    it('should include rotation when any value is non-zero', () => {
      const actors = [
        {
          name: 'Wall_01',
          class: 'StaticMeshActor',
          location: { x: 100, y: 200, z: 0 },
          rotation: { roll: 5, pitch: 0, yaw: 0 }
        },
        {
          name: 'Wall_02',
          class: 'StaticMeshActor',
          location: { x: 200, y: 200, z: 0 },
          rotation: { roll: 0, pitch: 10, yaw: 0 }
        },
        {
          name: 'Wall_03',
          class: 'StaticMeshActor',
          location: { x: 300, y: 200, z: 0 },
          rotation: { roll: 0, pitch: 0, yaw: 45 }
        }
      ];
      const result = tool.testFormatActorList(actors, 3);

      expect(result).toContain('Rotation: [5, 0, 0]°');
      expect(result).toContain('Rotation: [0, 10, 0]°');
      expect(result).toContain('Rotation: [0, 0, 45]°');
    });

    it('should include scale when non-unit', () => {
      const actors = [{
        name: 'Wall_01',
        class: 'StaticMeshActor',
        location: { x: 100, y: 200, z: 0 },
        scale: { x: 2, y: 1, z: 1 }
      }];
      const result = tool.testFormatActorList(actors, 1);

      expect(result).toContain('Scale: [2, 1, 1]');
    });

    it('should not include scale when all values are 1', () => {
      const actors = [{
        name: 'Wall_01',
        class: 'StaticMeshActor',
        location: { x: 100, y: 200, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      }];
      const result = tool.testFormatActorList(actors, 1);

      expect(result).not.toContain('Scale:');
    });

    it('should include scale when any value is not 1', () => {
      const actors = [
        {
          name: 'Wall_01',
          class: 'StaticMeshActor',
          location: { x: 100, y: 200, z: 0 },
          scale: { x: 2, y: 1, z: 1 }
        },
        {
          name: 'Wall_02',
          class: 'StaticMeshActor',
          location: { x: 200, y: 200, z: 0 },
          scale: { x: 1, y: 0.5, z: 1 }
        },
        {
          name: 'Wall_03',
          class: 'StaticMeshActor',
          location: { x: 300, y: 200, z: 0 },
          scale: { x: 1, y: 1, z: 3 }
        }
      ];
      const result = tool.testFormatActorList(actors, 3);

      expect(result).toContain('Scale: [2, 1, 1]');
      expect(result).toContain('Scale: [1, 0.5, 1]');
      expect(result).toContain('Scale: [1, 1, 3]');
    });

    it('should include asset path when provided', () => {
      const actors = [{
        name: 'Wall_01',
        class: 'StaticMeshActor',
        location: { x: 100, y: 200, z: 0 },
        assetPath: '/Game/Meshes/SM_Wall'
      }];
      const result = tool.testFormatActorList(actors, 1);

      expect(result).toContain('Asset: /Game/Meshes/SM_Wall');
    });

    it('should format complete actor information', () => {
      const actors = [{
        name: 'ComplexWall_01',
        class: 'BP_ModularWall_C',
        location: { x: 500, y: 1000, z: 150 },
        rotation: { roll: 5, pitch: 10, yaw: 45 },
        scale: { x: 1.5, y: 2, z: 0.8 },
        assetPath: '/Game/Blueprints/BP_ModularWall'
      }];
      const result = tool.testFormatActorList(actors, 1);

      expect(result).toContain('ComplexWall_01 (BP_ModularWall_C)');
      expect(result).toContain('Location: [500, 1000, 150]');
      expect(result).toContain('Rotation: [5, 10, 45]°');
      expect(result).toContain('Scale: [1.5, 2, 0.8]');
      expect(result).toContain('Asset: /Game/Blueprints/BP_ModularWall');
    });

    it('should properly separate multiple actors with newlines', () => {
      const actors = [
        {
          name: 'Wall_01',
          class: 'StaticMeshActor',
          location: { x: 100, y: 200, z: 0 }
        },
        {
          name: 'Wall_02',
          class: 'StaticMeshActor',
          location: { x: 200, y: 200, z: 0 }
        }
      ];
      const result = tool.testFormatActorList(actors, 2);

      // Should have a blank line between actors
      expect(result).toMatch(/Wall_01.*\n.*Location.*\n\nWall_02.*\n.*Location/);
    });
  });

  describe('formatOutlinerStructure', () => {
    it('should format empty outliner structure', () => {
      const structure = {};
      const result = tool.testFormatOutlinerStructure(structure);

      expect(result).toContain('World Outliner Structure:');
    });

    it('should format structure with root children', () => {
      const structure = {
        root: {
          children: [
            {
              name: 'Building',
              actorCount: 5
            },
            {
              name: 'Landscape',
              actorCount: 1
            }
          ]
        }
      };
      const result = tool.testFormatOutlinerStructure(structure);

      expect(result).toContain('World Outliner Structure:');
      expect(result).toContain('Building (5 actors)');
      expect(result).toContain('Landscape (1 actor)'); // singular for 1
    });

    it('should format nested folder structure', () => {
      const structure = {
        root: {
          children: [
            {
              name: 'Building',
              actorCount: 10,
              children: [
                {
                  name: 'Walls',
                  actorCount: 6
                },
                {
                  name: 'Doors',
                  actorCount: 4,
                  children: [
                    {
                      name: 'Interior',
                      actorCount: 2
                    },
                    {
                      name: 'Exterior',
                      actorCount: 2
                    }
                  ]
                }
              ]
            }
          ]
        }
      };
      const result = tool.testFormatOutlinerStructure(structure);

      expect(result).toContain('Building (10 actors)');
      expect(result).toContain('  Walls (6 actors)');
      expect(result).toContain('  Doors (4 actors)');
      expect(result).toContain('    Interior (2 actors)');
      expect(result).toContain('    Exterior (2 actors)');
    });

    it('should handle folders without actor counts', () => {
      const structure = {
        root: {
          children: [
            {
              name: 'EmptyFolder'
            },
            {
              name: 'FolderWithZero',
              actorCount: 0
            }
          ]
        }
      };
      const result = tool.testFormatOutlinerStructure(structure);

      expect(result).toContain('EmptyFolder');
      expect(result).not.toContain('EmptyFolder (');
      expect(result).toContain('FolderWithZero');
      expect(result).not.toContain('FolderWithZero (');
    });

    it('should include total counts when provided', () => {
      const structure = {
        root: {
          children: [
            {
              name: 'Building',
              actorCount: 5
            }
          ]
        },
        totalFolders: 3,
        totalActors: 15
      };
      const result = tool.testFormatOutlinerStructure(structure);

      expect(result).toContain('Total Folders: 3');
      expect(result).toContain('Total Actors: 15');
    });

    it('should handle only totalFolders provided', () => {
      const structure = {
        root: {
          children: []
        },
        totalFolders: 5
      };
      const result = tool.testFormatOutlinerStructure(structure);

      expect(result).toContain('Total Folders: 5');
      expect(result).not.toContain('Total Actors:');
    });

    it('should handle only totalActors provided', () => {
      const structure = {
        root: {
          children: []
        },
        totalActors: 25
      };
      const result = tool.testFormatOutlinerStructure(structure);

      expect(result).toContain('Total Actors: 25');
      expect(result).not.toContain('Total Folders:');
    });

    it('should handle complex nested structure', () => {
      const structure = {
        root: {
          children: [
            {
              name: 'Environment',
              children: [
                {
                  name: 'Buildings',
                  actorCount: 20,
                  children: [
                    {
                      name: 'Residential',
                      actorCount: 12
                    },
                    {
                      name: 'Commercial',
                      actorCount: 8
                    }
                  ]
                },
                {
                  name: 'Landscape',
                  actorCount: 5
                }
              ]
            },
            {
              name: 'Lighting',
              actorCount: 15
            }
          ]
        },
        totalFolders: 6,
        totalActors: 40
      };
      const result = tool.testFormatOutlinerStructure(structure);

      expect(result).toContain('World Outliner Structure:');
      expect(result).toContain('Environment');
      expect(result).toContain('  Buildings (20 actors)');
      expect(result).toContain('    Residential (12 actors)');
      expect(result).toContain('    Commercial (8 actors)');
      expect(result).toContain('  Landscape (5 actors)');
      expect(result).toContain('Lighting (15 actors)');
      expect(result).toContain('Total Folders: 6');
      expect(result).toContain('Total Actors: 40');
    });

    it('should handle structure with no root or empty children', () => {
      const structure = {
        root: {
          children: []
        }
      };
      const result = tool.testFormatOutlinerStructure(structure);

      expect(result).toEqual('World Outliner Structure:');
    });

    it('should handle undefined root children', () => {
      const structure = {
        root: {}
      };
      const result = tool.testFormatOutlinerStructure(structure);

      expect(result).toEqual('World Outliner Structure:');
    });
  });
});