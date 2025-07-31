/**
 * Central exports for all MCP tools
 * Organized by category for better maintainability
 */

// Actor tools
export {
  actorSpawnTool,
  actorDeleteTool,
  actorModifyTool,
  actorDuplicateTool,
  actorOrganizeTool,
  batchSpawnTool,
  placementValidateTool,
} from './actors/index.js';

// Viewport tools
export {
  viewportScreenshotTool,
  viewportCameraTool,
  viewportModeTool,
  viewportFocusTool,
  viewportRenderModeTool,
  viewportBoundsTool,
  viewportFitTool,
  viewportLookAtTool,
} from './viewport/index.js';

// Asset tools
export {
  assetListTool,
  assetInfoTool,
  assetImportTool,
} from './assets/index.js';

// Level tools
export {
  levelActorsTool,
  levelSaveTool,
  levelOutlinerTool,
} from './level/index.js';

// System tools
export {
  projectInfoTool,
  testConnectionTool,
  helpTool,
  pythonProxyTool,
  restartListenerTool,
  ueLogsTool,
} from './system/index.js';

// Re-export everything together for convenience
export * from './actors/index.js';
export * from './viewport/index.js';
export * from './assets/index.js';
export * from './level/index.js';
export * from './system/index.js';
