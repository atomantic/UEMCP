#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from './utils/logger.js';
import { PythonBridge } from './services/python-bridge.js';
import * as os from 'os';

// Import all tools from centralized index
import {
  // Actor tools
  actorSpawnTool,
  actorDeleteTool,
  actorModifyTool,
  actorDuplicateTool,
  actorOrganizeTool,
  batchSpawnTool,
  placementValidateTool,
  // Viewport tools
  viewportScreenshotTool,
  viewportCameraTool,
  viewportModeTool,
  viewportFocusTool,
  viewportRenderModeTool,
  viewportBoundsTool,
  viewportFitTool,
  viewportLookAtTool,
  // Asset tools
  assetListTool,
  assetInfoTool,
  // Level tools
  levelActorsTool,
  levelSaveTool,
  levelOutlinerTool,
  // System tools
  projectInfoTool,
  testConnectionTool,
  helpTool,
  pythonProxyTool,
  restartListenerTool,
  ueLogsTool,
} from './tools/index.js';

// Create array of all tools
const allTools = [
  actorSpawnTool,
  actorDeleteTool,
  actorModifyTool,
  actorDuplicateTool,
  actorOrganizeTool,
  batchSpawnTool,
  placementValidateTool,
  viewportScreenshotTool,
  viewportCameraTool,
  viewportModeTool,
  viewportFocusTool,
  viewportRenderModeTool,
  viewportBoundsTool,
  viewportFitTool,
  viewportLookAtTool,
  assetListTool,
  assetInfoTool,
  levelActorsTool,
  levelSaveTool,
  levelOutlinerTool,
  projectInfoTool,
  testConnectionTool,
  helpTool,
  pythonProxyTool,
  restartListenerTool,
  ueLogsTool,
];

// Define tool type
interface MCPTool {
  definition: {
    name: string;
    description: string;
    inputSchema: unknown;
  };
  handler: (args: unknown) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

// Create a map of tool names to handlers for efficient lookup
const toolHandlers = new Map<string, MCPTool>();
allTools.forEach(tool => {
  toolHandlers.set(tool.definition.name, tool as MCPTool);
});

// Log startup information
logger.info('='.repeat(60));
logger.info('UEMCP Server Starting...');
logger.info('='.repeat(60));
logger.info(`Version: 0.2.0`);
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
    version: '0.2.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, () => {
  return {
    tools: Array.from(toolHandlers.values()).map(tool => tool.definition),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params as { name: string; arguments: unknown };
  
  logger.info(`Tool called: ${name}`, { arguments: args });
  const startTime = Date.now();

  try {
    const tool = toolHandlers.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    
    const result = await tool.handler(args);
    
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
    
    const toolNames = Array.from(toolHandlers.keys()).sort();
    logger.info('='.repeat(60));
    logger.info('✓ UEMCP Server Ready');
    logger.info('  MCP Protocol: stdio');
    logger.info(`  Available Tools: ${toolNames.length} tools`);
    logger.info('  ' + toolNames.join(', '));
    logger.info('='.repeat(60));
    
    // Set up periodic health check (every 5 seconds for faster reconnection)
    const healthCheckInterval = setInterval(() => {
      checkConnection().catch(err => {
        logger.debug('Health check failed', { error: err instanceof Error ? err.message : String(err) });
      });
    }, 5000);
    
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