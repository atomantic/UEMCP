import { logger } from '../utils/logger.js';

export interface PythonCommand {
  type: string;
  params: Record<string, unknown>;
  timeout?: number;
}

export interface PythonResponse {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

export class PythonBridge {
  private httpEndpoint: string;
  private httpPort: number;

  constructor(port?: number) {
    // HTTP endpoint for the Python listener in Unreal
    this.httpPort = port ?? parseInt(process.env.UEMCP_LISTENER_PORT || '8765', 10);
    this.httpEndpoint = `http://localhost:${this.httpPort}`;
  }

  async executeCommand(command: PythonCommand): Promise<PythonResponse> {
    logger.debug('Executing Python command via HTTP', { command, endpoint: this.httpEndpoint });

    const DEFAULT_BRIDGE_TIMEOUT_S = 10;
    const MAX_BRIDGE_TIMEOUT_S = 120; // must match Python listener max (uemcp_listener.py)
    const rawTimeout = command.timeout ?? DEFAULT_BRIDGE_TIMEOUT_S;
    const clampedTimeout = Number.isFinite(rawTimeout) && rawTimeout > 0
      ? Math.min(rawTimeout, MAX_BRIDGE_TIMEOUT_S)
      : DEFAULT_BRIDGE_TIMEOUT_S;
    const timeoutMs = clampedTimeout * 1000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(this.httpEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      // Log enriched context for diagnosability, then rethrow
      logger.error('Python bridge connection error', {
        command: command.type,
        endpoint: this.httpEndpoint,
        error: error instanceof Error ? error.message : String(error),
        isTimeout: error instanceof Error && error.name === 'AbortError',
      });
      throw error;
    }

    if (!response.ok) {
      clearTimeout(timer);
      const errorText = await response.text().catch(() => 'No error body');
      logger.error('Python listener HTTP error', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        command: command.type,
        endpoint: this.httpEndpoint
      });

      // HTTP 429 typically means "Too Many Requests" - rate limiting
      if (response.status === 429) {
        throw new Error(`Python listener rate limit (HTTP 429): Too many requests. Status: ${response.statusText}. Body: ${errorText}`);
      }
      throw new Error(`Python listener HTTP ${response.status}: ${response.statusText}. Body: ${errorText}`);
    }

    const data = await response.json() as PythonResponse;
    clearTimeout(timer);
    logger.debug('Python command response', { response: data });
    return data;
  }

  async isUnrealEngineAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      let response: Response;
      try {
        response = await fetch(`${this.httpEndpoint}/`, {
          method: 'GET',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (response.ok) {
        const status = await response.json() as { ready?: boolean };
        return status.ready === true;
      }

      // Fallback to command execution — use short timeout to cap total check time
      const cmdResponse = await this.executeCommand({
        type: 'project.info',
        params: {},
        timeout: 3,
      });
      return cmdResponse.success;
    } catch {
      return false;
    }
  }
}
