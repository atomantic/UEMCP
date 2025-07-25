#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { projectCreateTool } from './tools/project.js';
import { projectInfoTool } from './tools/project-info.js';
import { assetListTool } from './tools/asset-list.js';
import { assetInfoTool } from './tools/asset-info.js';
import { actorSpawnTool } from './tools/actor-spawn.js';
import { actorDeleteTool } from './tools/actor-delete.js';
import { actorModifyTool } from './tools/actor-modify.js';
import { levelActorsTool } from './tools/level-actors.js';
import { levelSaveTool } from './tools/level-save.js';
import { viewportScreenshotTool } from './tools/viewport-screenshot.js';
import { viewportCameraTool } from './tools/viewport-camera.js';
import { logger } from './utils/logger.js';
import { PythonBridge } from './services/python-bridge.js';
import * as os from 'os';

// Log startup information
logger.info('='.repeat(60));
logger.info('UEMCP Server Starting...');
logger.info('='.repeat(60));
logger.info(`Version: 0.1.0`);
logger.info(`Node.js: ${process.version}`);
logger.info(`Platform: ${os.platform()} ${os.release()}`);
logger.info(`Process ID: ${process.pid}`);
logger.info(`Working Directory: ${process.cwd()}`);
logger.info('-'.repeat(60));

// Log configuration
if (process.env.UE_PROJECT_PATH) {
  logger.info(`UE Project Path: ${process.env.UE_PROJECT_PATH}`);
} else {
  logger.warn('UE_PROJECT_PATH not set - some features may be limited');
}

const listenerPort = process.env.UEMCP_LISTENER_PORT || '8765';
logger.info(`Python Listener Port: ${listenerPort}`);

if (process.env.DEBUG) {
  logger.info(`Debug Mode: ${process.env.DEBUG}`);
}

logger.info('='.repeat(60));

const server = new Server(
  {
    name: 'uemcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, () => {
  return {
    tools: [
      projectCreateTool.definition,
      projectInfoTool.definition,
      assetListTool.definition,
      assetInfoTool.definition,
      actorSpawnTool.definition,
      actorDeleteTool.definition,
      actorModifyTool.definition,
      levelActorsTool.definition,
      levelSaveTool.definition,
      viewportScreenshotTool.definition,
      viewportCameraTool.definition,
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params as { name: string; arguments: unknown };
  
  logger.info(`Tool called: ${name}`, { arguments: args });
  const startTime = Date.now();

  try {
    let result;
    switch (name) {
      case 'project_create':
        result = await projectCreateTool.handler(args);
        break;
      case 'project_info':
        result = await projectInfoTool.handler(args);
        break;
      case 'asset_list':
        result = await assetListTool.handler(args);
        break;
      case 'asset_info':
        result = await assetInfoTool.handler(args);
        break;
      case 'actor_spawn':
        result = await actorSpawnTool.handler(args);
        break;
      case 'actor_delete':
        result = await actorDeleteTool.handler(args);
        break;
      case 'actor_modify':
        result = await actorModifyTool.handler(args);
        break;
      case 'level_actors':
        result = await levelActorsTool.handler(args);
        break;
      case 'level_save':
        result = await levelSaveTool.handler(args);
        break;
      case 'viewport_screenshot':
        result = await viewportScreenshotTool.handler(args);
        break;
      case 'viewport_camera':
        result = await viewportCameraTool.handler(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    
    const duration = Date.now() - startTime;
    logger.info(`Tool completed: ${name} (${duration}ms)`);
    return result;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const duration = Date.now() - startTime;
    logger.error(`Tool failed: ${name} (${duration}ms)`, { error: errorMessage });
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
    };
  }
});

async function main(): Promise<void> {
  try {
    // Initialize Python bridge and check connection
    const pythonBridge = new PythonBridge();
    logger.info('Checking Python listener connection...');
    
    let wasConnected = false;
    const checkConnection = async (): Promise<boolean> => {
      const isAvailable = await pythonBridge.isUnrealEngineAvailable();
      if (isAvailable && !wasConnected) {
        logger.info('✓ Python listener connected at http://localhost:' + (process.env.UEMCP_LISTENER_PORT || '8765'));
        wasConnected = true;
      } else if (!isAvailable && wasConnected) {
        logger.warn('✗ Python listener disconnected - Unreal Engine may have stopped');
        wasConnected = false;
      }
      return isAvailable;
    };
    
    // Initial connection check
    const initiallyConnected = await checkConnection();
    if (!initiallyConnected) {
      logger.warn('✗ Python listener not responding - Unreal Engine may not be running');
      logger.warn('  Start Unreal Engine with the UEMCP plugin to enable full functionality');
    }
    
    // Connect MCP transport
    const transport = new StdioServerTransport();
    logger.info('Connecting MCP transport...');
    
    await server.connect(transport);
    
    logger.info('='.repeat(60));
    logger.info('✓ UEMCP Server Ready');
    logger.info('  MCP Protocol: stdio');
    logger.info('  Available Tools: ' + [
      'project_create',
      'project_info',
      'asset_list',
      'actor_spawn',
      'level_actors',
      'level_save'
    ].join(', '));
    logger.info('='.repeat(60));
    
    // Set up periodic health check (every 30 seconds)
    const healthCheckInterval = setInterval(() => {
      checkConnection().catch(err => {
        logger.debug('Health check failed', { error: err instanceof Error ? err.message : String(err) });
      });
    }, 30000);
    
    // Set up graceful shutdown
    const shutdown = (): void => {
      clearInterval(healthCheckInterval);
      logger.info('\nShutting down gracefully...');
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed during initialization', { error: errorMessage });
    throw error;
  }
}

main().catch((error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error('Server failed to start', { error: errorMessage });
  process.exit(1);
});