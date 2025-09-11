/**
 * Version utility for UEMCP Node.js components
 * Provides centralized access to version information
 */

import packageJson from '../../package.json';

/**
 * Get the current UEMCP version from package.json
 */
export function getVersion(): string {
  return packageJson.version;
}

/**
 * Get version with additional metadata
 */
export function getVersionInfo(): { version: string; name: string; description: string } {
  return {
    version: packageJson.version,
    name: packageJson.name,
    description: packageJson.description
  };
}