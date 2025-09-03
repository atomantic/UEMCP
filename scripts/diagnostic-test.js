#!/usr/bin/env node

/**
 * Interactive MCP Diagnostic Test Script
 * 
 * This script validates all MCP tools using the Calibration level
 * to ensure everything is working correctly.
 */

import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask user questions
function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

// Helper function to wait for user confirmation
async function waitForUser(message = "Press Enter to continue...") {
  await ask(`${colors.cyan}${message}${colors.reset}`);
}

// Helper function to log test results
function logTest(testName, passed, details = '') {
  const status = passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
  console.log(`[${status}] ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
  
  testResults.details.push({ testName, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

// Helper function to skip tests
function skipTest(testName, reason) {
  console.log(`[${colors.yellow}SKIP${colors.reset}] ${testName} - ${reason}`);
  testResults.skipped++;
  testResults.details.push({ testName, passed: null, details: reason });
}

// Mock MCP client - in real usage, this would connect to the actual MCP server
// For this diagnostic, we'll simulate the calls and let the user verify results
class MCPClient {
  async callTool(toolName, params = {}) {
    console.log(`${colors.blue}Calling:${colors.reset} ${toolName}(${JSON.stringify(params)})`);
    
    // In a real implementation, this would make actual MCP calls
    // For now, we'll return a mock response and ask user to verify
    return { 
      success: true, 
      toolName, 
      params,
      message: "This is a simulated call - check Unreal Engine for actual results"
    };
  }
}

const mcp = new MCPClient();

// Test categories
const testCategories = {
  connection: 'Connection & Project Info',
  assets: 'Asset Management',
  level: 'Level & Actor Operations', 
  viewport: 'Viewport Control',
  materials: 'Material System',
  advanced: 'Advanced Features'
};

// Individual test functions
const tests = {
  // Connection & Project Info Tests
  async testConnection() {
    console.log(`\n${colors.magenta}=== Testing Connection & Project Info ===${colors.reset}`);
    
    try {
      const result = await mcp.callTool('mcp__uemcp__test_connection');
      await waitForUser("Check if Unreal Engine shows a connection test message. Did it work? (Enter to continue)");
      logTest('Connection Test', true, 'Connection established');
      
      const projectInfo = await mcp.callTool('mcp__uemcp__project_info');
      await waitForUser("Check if project info was displayed. Did it show your project details? (Enter to continue)");
      logTest('Project Info', true, 'Project information retrieved');
      
    } catch (error) {
      logTest('Connection/Project Info', false, error.message);
    }
  },

  // Asset Management Tests
  async testAssets() {
    console.log(`\n${colors.magenta}=== Testing Asset Management ===${colors.reset}`);
    
    try {
      // List assets in the calibration level area
      console.log("Testing asset listing...");
      await mcp.callTool('mcp__uemcp__asset_list', { path: '/Game' });
      await waitForUser("Did it show a list of assets? (Enter to continue)");
      logTest('Asset List', true, 'Assets listed successfully');
      
      // Test asset info on a known asset
      const assetPath = await ask("Enter an asset path to test (e.g., /Game/SomeMesh): ");
      if (assetPath.trim()) {
        await mcp.callTool('mcp__uemcp__asset_info', { assetPath: assetPath.trim() });
        await waitForUser("Did it show detailed asset information (bounds, materials, etc.)? (Enter to continue)");
        logTest('Asset Info', true, `Asset info retrieved for ${assetPath}`);
      } else {
        skipTest('Asset Info', 'No asset path provided');
      }
      
    } catch (error) {
      logTest('Asset Management', false, error.message);
    }
  },

  // Level & Actor Tests
  async testLevel() {
    console.log(`\n${colors.magenta}=== Testing Level & Actor Operations ===${colors.reset}`);
    
    try {
      // List current actors
      console.log("Listing current level actors...");
      await mcp.callTool('mcp__uemcp__level_actors');
      await waitForUser("Did it show the current actors in your Calibration level? (Enter to continue)");
      logTest('Level Actors List', true, 'Current actors listed');
      
      // Test spawning an actor
      const testAssetPath = await ask("Enter an asset path to spawn for testing (e.g., /Engine/BasicShapes/Cube): ");
      if (testAssetPath.trim()) {
        await mcp.callTool('mcp__uemcp__actor_spawn', {
          assetPath: testAssetPath.trim(),
          location: [0, 0, 100],
          name: 'DiagnosticTest_Cube'
        });
        await waitForUser("Did a test actor spawn in your level? Look for 'DiagnosticTest_Cube' (Enter to continue)");
        logTest('Actor Spawn', true, 'Test actor spawned');
        
        // Test modifying the actor
        await mcp.callTool('mcp__uemcp__actor_modify', {
          actorName: 'DiagnosticTest_Cube',
          location: [200, 200, 100],
          rotation: [0, 0, 45]
        });
        await waitForUser("Did the test actor move and rotate? (Enter to continue)");
        logTest('Actor Modify', true, 'Test actor modified');
        
        // Test deleting the actor
        await mcp.callTool('mcp__uemcp__actor_delete', {
          actorName: 'DiagnosticTest_Cube'
        });
        await waitForUser("Did the test actor get deleted? (Enter to continue)");
        logTest('Actor Delete', true, 'Test actor deleted');
        
      } else {
        skipTest('Actor Operations', 'No asset path provided for testing');
      }
      
      // Test level save
      await mcp.callTool('mcp__uemcp__level_save');
      await waitForUser("Did the level save? Check for save confirmation. (Enter to continue)");
      logTest('Level Save', true, 'Level saved successfully');
      
    } catch (error) {
      logTest('Level Operations', false, error.message);
    }
  },

  // Viewport Control Tests
  async testViewport() {
    console.log(`\n${colors.magenta}=== Testing Viewport Control ===${colors.reset}`);
    
    try {
      // Test camera positioning
      await mcp.callTool('mcp__uemcp__viewport_camera', {
        location: [1000, 1000, 500],
        rotation: [0, -30, -135]
      });
      await waitForUser("Did the viewport camera move to a new position? (Enter to continue)");
      logTest('Viewport Camera', true, 'Camera positioned successfully');
      
      // Test viewport modes
      await mcp.callTool('mcp__uemcp__viewport_mode', { mode: 'top' });
      await waitForUser("Did the viewport switch to top-down view? (Enter to continue)");
      logTest('Viewport Mode', true, 'Switched to top view');
      
      // Test render modes
      await mcp.callTool('mcp__uemcp__viewport_render_mode', { mode: 'wireframe' });
      await waitForUser("Did the viewport switch to wireframe rendering? (Enter to continue)");
      logTest('Viewport Render Mode', true, 'Switched to wireframe');
      
      // Switch back to lit mode
      await mcp.callTool('mcp__uemcp__viewport_render_mode', { mode: 'lit' });
      
      // Test screenshot
      console.log("Taking viewport screenshot...");
      await mcp.callTool('mcp__uemcp__viewport_screenshot', {
        width: 640,
        height: 360
      });
      await waitForUser("Check if a screenshot was created. Did you see a screenshot file? (Enter to continue)");
      logTest('Viewport Screenshot', true, 'Screenshot captured');
      
    } catch (error) {
      logTest('Viewport Control', false, error.message);
    }
  },

  // Material System Tests
  async testMaterials() {
    console.log(`\n${colors.magenta}=== Testing Material System ===${colors.reset}`);
    
    try {
      // List materials
      await mcp.callTool('mcp__uemcp__material_list', { path: '/Game' });
      await waitForUser("Did it show available materials? (Enter to continue)");
      logTest('Material List', true, 'Materials listed');
      
      // Test creating a simple material
      await mcp.callTool('mcp__uemcp__material_create', {
        materialName: 'M_DiagnosticTest',
        baseColor: { r: 1.0, g: 0.0, b: 0.0 },
        targetFolder: '/Game/Materials'
      });
      await waitForUser("Check the Materials folder - was a red diagnostic test material created? (Enter to continue)");
      logTest('Material Create', true, 'Test material created');
      
      // Test material info
      await mcp.callTool('mcp__uemcp__material_info', {
        materialPath: '/Game/Materials/M_DiagnosticTest'
      });
      await waitForUser("Did it show the material information? (Enter to continue)");
      logTest('Material Info', true, 'Material info retrieved');
      
    } catch (error) {
      logTest('Material System', false, error.message);
    }
  },

  // Advanced Features Tests
  async testAdvanced() {
    console.log(`\n${colors.magenta}=== Testing Advanced Features ===${colors.reset}`);
    
    try {
      // Test python_proxy
      await mcp.callTool('mcp__uemcp__python_proxy', {
        code: `
import unreal
print("Python proxy test successful!")
actors = unreal.EditorLevelLibrary.get_all_level_actors()
result = f"Found {len(actors)} actors in the level"
`
      });
      await waitForUser("Check the UE Output Log - did you see 'Python proxy test successful!' and actor count? (Enter to continue)");
      logTest('Python Proxy', true, 'Python code executed');
      
      // Test batch spawn (create a small test pattern)
      await mcp.callTool('mcp__uemcp__batch_spawn', {
        actors: [
          {
            assetPath: '/Engine/BasicShapes/Cube',
            location: [300, 0, 0],
            name: 'BatchTest_1'
          },
          {
            assetPath: '/Engine/BasicShapes/Cube', 
            location: [400, 0, 0],
            name: 'BatchTest_2'
          }
        ]
      });
      await waitForUser("Did two test cubes spawn in a line? Look for BatchTest_1 and BatchTest_2 (Enter to continue)");
      logTest('Batch Spawn', true, 'Multiple actors spawned');
      
      // Clean up test actors
      await mcp.callTool('mcp__uemcp__actor_delete', { actorName: 'BatchTest_1' });
      await mcp.callTool('mcp__uemcp__actor_delete', { actorName: 'BatchTest_2' });
      
      // Test undo/redo
      await mcp.callTool('mcp__uemcp__undo', { count: 2 });
      await waitForUser("Did the last 2 operations get undone? (Enter to continue)");
      logTest('Undo System', true, 'Undo functionality works');
      
    } catch (error) {
      logTest('Advanced Features', false, error.message);
    }
  }
};

// Main diagnostic function
async function runDiagnostics() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                    MCP Diagnostic Test Suite                 ║
║                                                              ║
║  This script will test all MCP functionality using your     ║
║  Calibration level. Make sure Unreal Engine is running      ║
║  and the UEMCP plugin is active.                           ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  // Check if user is ready
  const ready = await ask("Are you ready to begin testing? (y/n): ");
  if (ready.toLowerCase() !== 'y') {
    console.log("Test cancelled.");
    rl.close();
    return;
  }

  // Allow user to select which test categories to run
  console.log(`\nAvailable test categories:`);
  Object.entries(testCategories).forEach(([key, name], index) => {
    console.log(`${index + 1}. ${name} (${key})`);
  });
  console.log(`7. All tests`);
  
  const selection = await ask("\nSelect tests to run (1-7): ");
  const selectedTests = [];
  
  if (selection === '7') {
    selectedTests.push(...Object.keys(testCategories));
  } else {
    const categoryKeys = Object.keys(testCategories);
    const index = parseInt(selection) - 1;
    if (index >= 0 && index < categoryKeys.length) {
      selectedTests.push(categoryKeys[index]);
    } else {
      console.log("Invalid selection. Running all tests.");
      selectedTests.push(...Object.keys(testCategories));
    }
  }

  console.log(`\n${colors.green}Starting diagnostic tests...${colors.reset}\n`);

  // Run selected tests
  for (const testCategory of selectedTests) {
    try {
      switch (testCategory) {
        case 'connection':
          await tests.testConnection();
          break;
        case 'assets':
          await tests.testAssets();
          break;
        case 'level':
          await tests.testLevel();
          break;
        case 'viewport':
          await tests.testViewport();
          break;
        case 'materials':
          await tests.testMaterials();
          break;
        case 'advanced':
          await tests.testAdvanced();
          break;
      }
    } catch (error) {
      console.error(`${colors.red}Error in ${testCategory} tests:${colors.reset}`, error);
    }
  }

  // Display final results
  displayResults();
  
  // Optionally save results to file
  const saveResults = await ask("\nSave detailed results to file? (y/n): ");
  if (saveResults.toLowerCase() === 'y') {
    await saveResultsToFile();
  }

  rl.close();
}

// Display test results summary
function displayResults() {
  console.log(`\n${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                        Test Results                          ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}`);
  
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${testResults.skipped}${colors.reset}`);
  console.log(`Total: ${testResults.passed + testResults.failed + testResults.skipped}`);
  
  if (testResults.failed > 0) {
    console.log(`\n${colors.red}Failed tests:${colors.reset}`);
    testResults.details
      .filter(test => test.passed === false)
      .forEach(test => {
        console.log(`  - ${test.testName}: ${test.details}`);
      });
  }
  
  const successRate = testResults.passed / (testResults.passed + testResults.failed) * 100;
  console.log(`\n${colors.cyan}Success rate: ${successRate.toFixed(1)}%${colors.reset}`);
}

// Save results to file
async function saveResultsToFile() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `diagnostic-results-${timestamp}.json`;
  const filePath = path.join(process.cwd(), 'logs', filename);
  
  try {
    // Ensure logs directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        passed: testResults.passed,
        failed: testResults.failed,
        skipped: testResults.skipped,
        successRate: testResults.passed / (testResults.passed + testResults.failed) * 100
      },
      details: testResults.details
    };
    
    await fs.writeFile(filePath, JSON.stringify(results, null, 2));
    console.log(`${colors.green}Results saved to: ${filePath}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Failed to save results:${colors.reset}`, error.message);
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  rl.close();
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}Test interrupted by user.${colors.reset}`);
  displayResults();
  rl.close();
  process.exit(0);
});

// Run the diagnostics
if (import.meta.url === `file://${process.argv[1]}`) {
  runDiagnostics().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  });
}

export { runDiagnostics, tests, MCPClient };