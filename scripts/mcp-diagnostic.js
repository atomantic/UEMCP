#!/usr/bin/env node

/**
 * Simple MCP Diagnostic Script
 * 
 * Run this script in Claude Code to test MCP functionality.
 * This version is designed to work with the actual MCP tools.
 */

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    MCP Diagnostic Test                       ║
║                                                              ║
║  This script will guide you through testing MCP tools       ║
║  Run each test manually in Claude Code for best results     ║
╚══════════════════════════════════════════════════════════════╝

🔧 SETUP CHECKLIST:
- Unreal Engine is running with your project loaded
- Calibration level is open
- UEMCP plugin is active (check Python console for listener)

📋 TESTS TO RUN:

1. CONNECTION TEST:
   Run: mcp__uemcp__test_connection({})
   Expected: Connection confirmation message

2. PROJECT INFO:
   Run: mcp__uemcp__project_info({})
   Expected: Project name, version, engine info

3. LEVEL ACTORS:
   Run: mcp__uemcp__level_actors({})
   Expected: List of current actors in Calibration level

4. ASSET LIST:
   Run: mcp__uemcp__asset_list({ path: "/Game" })
   Expected: Available project assets

5. VIEWPORT SCREENSHOT:
   Run: mcp__uemcp__viewport_screenshot({ width: 640, height: 360 })
   Expected: Screenshot file created

6. SPAWN TEST ACTOR:
   Run: mcp__uemcp__actor_spawn({ 
     assetPath: "/Engine/BasicShapes/Cube", 
     location: [0, 0, 100], 
     name: "DiagTest_Cube" 
   })
   Expected: Cube spawns in level

7. MODIFY TEST ACTOR:
   Run: mcp__uemcp__actor_modify({ 
     actorName: "DiagTest_Cube", 
     location: [200, 0, 100], 
     rotation: [0, 0, 45] 
   })
   Expected: Cube moves and rotates

8. DELETE TEST ACTOR:
   Run: mcp__uemcp__actor_delete({ actorName: "DiagTest_Cube" })
   Expected: Cube is removed from level

9. PYTHON PROXY TEST:
   Run: mcp__uemcp__python_proxy({ 
     code: "import unreal; print('Python test successful!')" 
   })
   Expected: Message in UE Output Log

10. VIEWPORT CAMERA:
    Run: mcp__uemcp__viewport_camera({ 
      location: [1000, 1000, 500], 
      rotation: [0, -30, -135] 
    })
    Expected: Viewport camera moves

11. RENDER MODE TEST:
    Run: mcp__uemcp__viewport_render_mode({ mode: "wireframe" })
    Then: mcp__uemcp__viewport_render_mode({ mode: "lit" })
    Expected: Render mode changes

✅ VERIFICATION:
- All commands execute without errors
- Visual changes appear in Unreal Engine
- Screenshots are created
- Test actors spawn/move/delete correctly
- Python messages appear in Output Log

🔍 TROUBLESHOOTING:
If any test fails:
1. Check UE Output Log for Python errors
2. Verify UEMCP plugin is loaded: restart_listener() in UE Python console
3. Ensure project is saved and level is active
4. Check that asset paths exist in your project

📊 EXPECTED SUCCESS RATE: 100% for a properly configured system
`);

export default {
  description: "MCP Diagnostic Test Guide",
  tests: [
    "mcp__uemcp__test_connection({})",
    "mcp__uemcp__project_info({})",
    "mcp__uemcp__level_actors({})",
    'mcp__uemcp__asset_list({ path: "/Game" })',
    "mcp__uemcp__viewport_screenshot({ width: 640, height: 360 })",
    'mcp__uemcp__actor_spawn({ assetPath: "/Engine/BasicShapes/Cube", location: [0, 0, 100], name: "DiagTest_Cube" })',
    'mcp__uemcp__actor_modify({ actorName: "DiagTest_Cube", location: [200, 0, 100], rotation: [0, 0, 45] })',
    'mcp__uemcp__actor_delete({ actorName: "DiagTest_Cube" })',
    'mcp__uemcp__python_proxy({ code: "import unreal; print(\\"Python test successful!\\")" })',
    "mcp__uemcp__viewport_camera({ location: [1000, 1000, 500], rotation: [0, -30, -135] })",
    'mcp__uemcp__viewport_render_mode({ mode: "wireframe" })',
    'mcp__uemcp__viewport_render_mode({ mode: "lit" })'
  ]
};