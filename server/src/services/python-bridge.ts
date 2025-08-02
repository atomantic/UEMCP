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
  private httpEndpoint: string;
  private httpPort: number;

  constructor() {
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
        const errorText = await response.text().catch(() => 'No error body');
        logger.error('Python listener HTTP error', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          command: command.type,
          endpoint: this.httpEndpoint
        });
        
        // HTTP 529 typically means "Too Many Requests" - rate limiting
        if (response.status === 529) {
          throw new Error(`Python listener rate limit (HTTP 529): Too many requests. Status: ${response.statusText}. Body: ${errorText}`);
        }
        throw new Error(`Python listener HTTP ${response.status}: ${response.statusText}. Body: ${errorText}`);
      }
      
      const data = await response.json() as PythonResponse;
      logger.debug('Python command response', { response: data });
      return data;
      
    } catch (httpError) {
      const error = httpError as Error;
      logger.error('Failed to connect to Python listener', { 
        error: error.message,
        command: command.type,
        endpoint: this.httpEndpoint
      });
      
      // Return a clear error message
      return {
        success: false,
        error: `Failed to connect to Python listener at ${this.httpEndpoint}. Make sure Unreal Engine is running with the UEMCP plugin loaded.`
      };
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
    } catch (error) {
      return false;
    }
  }
}