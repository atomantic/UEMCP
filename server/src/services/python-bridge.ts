import { spawn } from 'child_process';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import fetch from 'node-fetch';

export interface PythonCommand {
  type: string;
  params: Record<string, unknown>;
}

export interface PythonResponse {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

export class PythonBridge {
  private pythonScriptPath: string;
  private httpEndpoint: string;
  private httpPort: number;

  constructor() {
    // Path to the Python executor script (for fallback)
    this.pythonScriptPath = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      'python',
      'ue_api',
      'ue_executor.py'
    );
    
    // HTTP endpoint for the Python listener in Unreal
    this.httpPort = parseInt(process.env.UEMCP_LISTENER_PORT || '8765');
    this.httpEndpoint = `http://localhost:${this.httpPort}`;
  }

  async executeCommand(command: PythonCommand): Promise<PythonResponse> {
    logger.debug('Executing Python command via HTTP', { command, endpoint: this.httpEndpoint });
    
    try {
      // Try HTTP endpoint first (Python listener in Unreal)
      const response = await fetch(this.httpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
        timeout: 10000, // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json() as PythonResponse;
      logger.debug('Python command response', { response: data });
      return data;
      
    } catch (httpError) {
      logger.warn('HTTP request failed, falling back to process spawn', { error: (httpError as Error).message });
      
      // Fallback to spawning Python process
      return new Promise((resolve) => {
        const commandJson = JSON.stringify(command);
        
        const pythonProcess = spawn('python3', [
          this.pythonScriptPath,
          commandJson
        ]);

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            logger.error('Python process failed', { code, stderr });
            resolve({
              success: false,
              error: `Python process exited with code ${code}: ${stderr}`
            });
            return;
          }

          try {
            const response = JSON.parse(stdout) as PythonResponse;
            logger.debug('Python command response', { response });
            resolve(response);
          } catch (error) {
            logger.error('Failed to parse Python response', { stdout, stderr });
            resolve({
              success: false,
              error: 'Failed to parse Python response'
            });
          }
        });

        pythonProcess.on('error', (error) => {
          logger.error('Failed to spawn Python process', { error: error.message });
          resolve({
            success: false,
            error: `Failed to spawn Python process: ${error.message}`
          });
        });
      });
    }
  }

  async isUnrealEngineAvailable(): Promise<boolean> {
    try {
      // First try HTTP endpoint status check
      const response = await fetch(`${this.httpEndpoint}/`, {
        method: 'GET',
        timeout: 2000,
      });
      
      if (response.ok) {
        const status = await response.json() as { ready?: boolean };
        return status.ready === true;
      }
      
      // Fallback to command execution
      const cmdResponse = await this.executeCommand({
        type: 'project.info',
        params: {}
      });
      return cmdResponse.success;
    } catch {
      return false;
    }
  }
}