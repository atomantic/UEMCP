import { BaseTool } from './base-tool.js';

/**
 * Base class for level-related tools
 */
export abstract class LevelTool<TArgs = unknown> extends BaseTool<TArgs> {
  /**
   * Common level command types
   */
  protected get levelCommands(): Record<string, string> {
    return {
      actors: 'level.actors',
      save: 'level.save',
      outliner: 'level.outliner',
      info: 'project.info',
    };
  }

  /**
   * Format actor list for display
   */
  protected formatActorList(actors: Array<{
    name: string;
    class: string;
    location: { x: number; y: number; z: number };
    rotation?: { roll: number; pitch: number; yaw: number };
    scale?: { x: number; y: number; z: number };
    assetPath?: string;
  }>, totalCount: number): string {
    let text = `Found ${totalCount} actor${totalCount !== 1 ? 's' : ''}`;
    if (actors.length < totalCount) {
      text += ` (showing ${actors.length})`;
    }
    text += '\n\n';

    actors.forEach((actor, index) => {
      text += `${actor.name} (${actor.class})\n`;
      text += `  Location: [${actor.location.x}, ${actor.location.y}, ${actor.location.z}]\n`;
      if (actor.rotation && (actor.rotation.roll !== 0 || actor.rotation.pitch !== 0 || actor.rotation.yaw !== 0)) {
        text += `  Rotation: [${actor.rotation.roll}, ${actor.rotation.pitch}, ${actor.rotation.yaw}]°\n`;
      }
      if (actor.scale && (actor.scale.x !== 1 || actor.scale.y !== 1 || actor.scale.z !== 1)) {
        text += `  Scale: [${actor.scale.x}, ${actor.scale.y}, ${actor.scale.z}]\n`;
      }
      if (actor.assetPath) {
        text += `  Asset: ${actor.assetPath}\n`;
      }
      if (index < actors.length - 1) text += '\n';
    });

    return text.trimEnd();
  }

  /**
   * Format outliner structure
   */
  protected formatOutlinerStructure(structure: {
    root?: { children?: unknown[] };
    totalFolders?: number;
    totalActors?: number;
  }): string {
    let text = 'World Outliner Structure:\n\n';
    
    const formatNode = (node: {
      name: string;
      actorCount?: number;
      children?: unknown[];
    }, indent: string = ''): void => {
      text += `${indent}${node.name}`;
      if (node.actorCount && node.actorCount > 0) {
        text += ` (${node.actorCount} actor${node.actorCount !== 1 ? 's' : ''})`;
      }
      text += '\n';
      
      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => {
          formatNode(child as typeof node, indent + '  ');
        });
      }
    };
    
    if (structure.root && structure.root.children) {
      structure.root.children.forEach((child) => {
        formatNode(child as Parameters<typeof formatNode>[0]);
      });
    }
    
    if (structure.totalFolders !== undefined) {
      text += `\nTotal Folders: ${structure.totalFolders}`;
    }
    if (structure.totalActors !== undefined) {
      text += `\nTotal Actors: ${structure.totalActors}`;
    }
    
    return text.trimEnd();
  }
}