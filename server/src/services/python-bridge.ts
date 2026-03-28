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
      let errorText: string;
      try {
        errorText = await response.text();
      } catch (bodyError) {
        // If the timer fired while reading the error body, rethrow as timeout
        // rather than masking it as an HTTP error
        if (bodyError instanceof Error && bodyError.name === 'AbortError') {
          clearTimeout(timer);
          throw bodyError;
        }
        errorText = 'No error body';
      } finally {
        clearTimeout(timer);
      }
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

    let data: PythonResponse;
    try {
      data = await response.json() as PythonResponse;
    } catch (error) {
      clearTimeout(timer);
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      logger.error(isTimeout ? 'Python bridge response timeout' : 'Python bridge response body error', {
        command: command.type,
        endpoint: this.httpEndpoint,
        error: error instanceof Error ? error.message : String(error),
        isTimeout,
      });
      throw error;
    }
    clearTimeout(timer);
    logger.debug('Python command response', { response: data });
    return data;
  }

  async isUnrealEngineAvailable(): Promise<boolean> {
    const AVAILABILITY_CHECK_TIMEOUT_MS = 3000;
    const checkStart = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AVAILABILITY_CHECK_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(`${this.httpEndpoint}/`, {
          method: 'GET',
          signal: controller.signal,
        });

        if (response.ok) {
          const status = await response.json() as { ready?: boolean };
          return status.ready === true;
        }
      } finally {
        clearTimeout(timer);
      }

      // Fallback to command execution; use remaining budget from the 3s total
      const elapsedS = (Date.now() - checkStart) / 1000;
      const remainingS = Math.max(1, (AVAILABILITY_CHECK_TIMEOUT_MS / 1000) - elapsedS);
      const cmdResponse = await this.executeCommand({
        type: 'project.info',
        params: {},
        timeout: remainingS,
      });
      return cmdResponse.success;
    } catch {
      return false;
    }
  }
}
