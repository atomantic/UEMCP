/**
 * Configuration Manager
 * Handles environment configuration and startup logging
 */

import * as os from 'os';
import { logger } from '../utils/logger.js';

export interface ServerConfig {
  version: string;
  name: string;
  ueProjectPath?: string;
  listenerPort: string;
  debugMode?: string;
  processId: number;
  workingDirectory: string;
  nodeVersion: string;
  platform: string;
  osRelease: string;
}

/**
 * Service for managing server configuration and environment
 */
export class ConfigManager {
  private config: ServerConfig;

  constructor(version = '0.2.0', name = 'uemcp') {
    this.config = this.loadConfiguration(version, name);
  }

  /**
   * Load configuration from environment and system
   */
  private loadConfiguration(version: string, name: string): ServerConfig {
    return {
      version,
      name,
      ueProjectPath: process.env.UE_PROJECT_PATH,
      listenerPort: process.env.UEMCP_LISTENER_PORT || '8765',
      debugMode: process.env.DEBUG,
      processId: process.pid,
      workingDirectory: process.cwd(),
      nodeVersion: process.version,
      platform: os.platform(),
      osRelease: os.release(),
    };
  }

  /**
   * Get current configuration
   */
  public getConfig(): ServerConfig {
    return { ...this.config };
  }

  /**
   * Get server name
   */
  public getServerName(): string {
    return this.config.name;
  }

  /**
   * Get server version
   */
  public getServerVersion(): string {
    return this.config.version;
  }

  /**
   * Get UE project path
   */
  public getUEProjectPath(): string | undefined {
    return this.config.ueProjectPath;
  }

  /**
   * Get listener port
   */
  public getListenerPort(): string {
    return this.config.listenerPort;
  }

  /**
   * Check if debug mode is enabled
   */
  public isDebugMode(): boolean {
    return !!this.config.debugMode;
  }

  /**
   * Get debug mode configuration
   */
  public getDebugMode(): string | undefined {
    return this.config.debugMode;
  }

  /**
   * Log startup banner and configuration
   */
  public logStartupBanner(): void {
    logger.info('='.repeat(60));
    logger.info('UEMCP Server Starting...');
    logger.info('='.repeat(60));
    logger.info(`Version: ${this.config.version}`);
    logger.info(`Node.js: ${this.config.nodeVersion}`);
    logger.info(`Platform: ${this.config.platform} ${this.config.osRelease}`);
    logger.info(`Process ID: ${this.config.processId}`);
    logger.info(`Working Directory: ${this.config.workingDirectory}`);
    logger.info('-'.repeat(60));
  }

  /**
   * Log configuration details
   */
  public logConfiguration(): void {
    if (this.config.ueProjectPath) {
      logger.info(`UE Project Path: ${this.config.ueProjectPath}`);
    } else {
      logger.warn('UE_PROJECT_PATH not set - some features may be limited');
    }

    logger.info(`Python Listener Port: ${this.config.listenerPort}`);

    if (this.config.debugMode) {
      logger.info(`Debug Mode: ${this.config.debugMode}`);
    }

    logger.info('='.repeat(60));
  }

  /**
   * Validate required configuration
   */
  public validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for required environment variables
    if (!this.config.listenerPort) {
      errors.push('UEMCP_LISTENER_PORT is required');
    }

    // Validate port is a number
    const port = parseInt(this.config.listenerPort, 10);
    if (isNaN(port) || port <= 0 || port >= 65536) {
      errors.push(`Invalid listener port: ${this.config.listenerPort}`);
    }

    // Check Node.js version (require Node 18+)
    const nodeVersion = parseInt(process.version.substring(1), 10);
    if (nodeVersion < 18) {
      errors.push(`Node.js 18+ required, current: ${process.version}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update configuration value
   */
  public updateConfig(key: keyof ServerConfig, value: string | number): void {
    (this.config as any)[key] = value;
    logger.info(`Configuration updated: ${key} = ${value}`);
  }

  /**
   * Get environment summary for logging
   */
  public getEnvironmentSummary(): string {
    return [
      `UEMCP Server ${this.config.version}`,
      `Node.js ${this.config.nodeVersion}`,
      `${this.config.platform} ${this.config.osRelease}`,
      `PID: ${this.config.processId}`,
      `Port: ${this.config.listenerPort}`,
    ].join(' | ');
  }

  /**
   * Check if UE project path is configured
   */
  public hasUEProjectPath(): boolean {
    return !!this.config.ueProjectPath;
  }

  /**
   * Get system information
   */
  public getSystemInfo(): {
    nodeVersion: string;
    platform: string;
    osRelease: string;
    processId: number;
    workingDirectory: string;
    arch: string;
    totalMemory: number;
    freeMemory: number;
  } {
    return {
      nodeVersion: this.config.nodeVersion,
      platform: this.config.platform,
      osRelease: this.config.osRelease,
      processId: this.config.processId,
      workingDirectory: this.config.workingDirectory,
      arch: os.arch(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
    };
  }
}