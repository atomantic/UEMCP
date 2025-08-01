/**
 * Simple MCP client for testing
 * This creates a direct connection to the MCP tools for testing purposes
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createMCPClient() {
  return {
    async callTool(toolName, args) {
      // For testing, we'll simulate MCP tool calls
      // In production, this would connect to the actual MCP server
      
      console.log(`[MCP Client] Calling tool: ${toolName}`);
      console.log(`[MCP Client] With args:`, JSON.stringify(args, null, 2));
      
      // Simulate successful responses for testing
      const mockResponses = {
        test_connection: {
          success: true,
          message: 'Connected to UEMCP Python listener',
          version: '0.5.0'
        },
        
        asset_info: {
          success: true,
          assetPath: args.assetPath,
          assetType: 'StaticMesh',
          bounds: {
            size: { x: 300, y: 300, z: 300 },
            origin: { x: 0, y: 0, z: 0 }
          },
          pivot: { type: 'center' },
          sockets: [],
          collision: { hasCollision: true }
        },
        
        batch_spawn: {
          success: true,
          spawnedActors: args.actors?.map(a => ({ name: a.name, success: true })) || [],
          failedSpawns: [],
          executionTime: 1234
        },
        
        placement_validate: {
          success: true,
          gaps: [],
          overlaps: [],
          alignmentIssues: [],
          summary: { overallStatus: 'good' }
        },
        
        asset_import: {
          success: false,
          error: 'Source path does not exist'
        }
      };
      
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = mockResponses[toolName];
      if (!response) {
        throw new Error(`Unknown tool: ${toolName}`);
      }
      
      if (!response.success && response.error) {
        throw new Error(response.error);
      }
      
      return response;
    },
    
    async listTools() {
      return [
        { name: 'asset_info', description: 'Get asset information' },
        { name: 'batch_spawn', description: 'Spawn multiple actors' },
        { name: 'placement_validate', description: 'Validate placement' },
        { name: 'asset_import', description: 'Import assets' }
      ];
    }
  };
}

// For direct MCP server testing (when running with actual UE connection)
export function createRealMCPClient() {
  const serverPath = join(__dirname, '../../..', 'index.js');
  
  return {
    process: null,
    
    async start() {
      this.process = spawn('node', [serverPath], {
        env: { ...process.env, DEBUG: 'uemcp:*' }
      });
      
      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
    },
    
    async stop() {
      if (this.process) {
        this.process.kill();
      }
    },
    
    async callTool(toolName, args) {
      // In a real implementation, this would communicate with the MCP server
      // For now, we're using the mock implementation
      return createMCPClient().callTool(toolName, args);
    }
  };
}