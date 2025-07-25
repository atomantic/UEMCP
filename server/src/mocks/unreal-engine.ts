import * as path from 'path';
import { logger } from '../utils/logger.js';

export interface ProjectConfig {
  projectName: string;
  projectPath: string;
  engineVersion: string;
  template: string;
}

export interface ProjectResult {
  projectName: string;
  fullPath: string;
  projectFile: string;
  engineVersion: string;
}

export class MockUnrealEngine {
  private projects: Map<string, ProjectResult> = new Map();

  createProject(config: ProjectConfig): ProjectResult {
    const { projectName, projectPath, engineVersion, template } = config;
    
    // Validate project name
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(projectName)) {
      throw new Error('Project name must start with a letter and contain only letters, numbers, and underscores');
    }
    
    // Create project directory structure
    const fullPath = path.join(projectPath, projectName);
    const projectFile = path.join(fullPath, `${projectName}.uproject`);
    
    logger.debug('Mock: Creating project directory structure', { fullPath });
    
    // Simulate project creation - in real implementation, this would create actual files
    
    const result: ProjectResult = {
      projectName,
      fullPath,
      projectFile,
      engineVersion,
    };
    
    // Store in memory for testing
    this.projects.set(projectName, result);
    
    logger.info(`Mock: Created project ${projectName} with template ${template}`);
    
    return result;
  }
  
  openProject(projectPath: string): void {
    logger.debug('Mock: Opening project', { projectPath });
    // Simulate project opening
  }
  
  listProjects(): ProjectResult[] {
    return Array.from(this.projects.values());
  }
  
  getProject(projectName: string): ProjectResult | undefined {
    return this.projects.get(projectName);
  }
  
  clearProjects(): void {
    this.projects.clear();
  }
}