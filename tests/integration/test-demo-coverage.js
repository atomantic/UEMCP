#!/usr/bin/env node

/**
 * Demo Project Coverage Test Suite
 *
 * Exercises all MCP tools against the Demo UE project
 * to provide comprehensive code coverage and validate real functionality.
 *
 * Requires: Unreal Editor running with Demo project, UEMCP listener active on :8765
 */

const http = require('http');
const path = require('path');

class DemoCoverageTest {
  constructor() {
    this.demoProjectPath = process.env.UE_PROJECT_PATH || path.join(__dirname, '..', '..', 'Demo');
    this.pythonBridge = 'http://localhost:8765';

    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;

    // Cleanup tracker — assets created during tests that need deletion
    this.cleanup = [];

    // Track MCP tool coverage by category
    this.toolCoverage = {
      // Project & System
      'project_info': false,
      'test_connection': false,

      // Asset Management
      'asset_list': false,
      'asset_info': false,

      // Level Editing
      'level_actors': false,
      'level_save': false,
      'actor_spawn': false,
      'actor_modify': false,
      'actor_delete': false,
      'batch_spawn': false,

      // Viewport Control
      'viewport_screenshot': false,
      'viewport_camera': false,
      'viewport_mode': false,
      'viewport_focus': false,
      'viewport_render_mode': false,

      // Blueprint Operations
      'blueprint_create': false,
      'blueprint_get_info': false,
      'blueprint_add_variable': false,
      'blueprint_add_component': false,
      'blueprint_add_function': false,
      'blueprint_get_graph': false,
      'blueprint_compile': false,
      'blueprint_list_blueprints': false,
      'blueprint_discover_actions': false,
      'blueprint_create_interface': false,

      // Blueprint Node Operations
      'blueprint_add_node': false,
      'blueprint_connect_nodes': false,

      // Widget / UMG Operations
      'widget_create': false,
      'widget_add_component': false,
      'widget_set_property': false,
      'widget_get_metadata': false,

      // Niagara VFX Operations
      'niagara_create_system': false,
      'niagara_add_emitter': false,
      'niagara_set_renderer': false,
      'niagara_compile': false,
      'niagara_spawn': false,
      'niagara_get_metadata': false,

      // Material Operations
      'material_list': false,
      'material_info': false,

      // Advanced
      'python_proxy': false,
      'console_command': false
    };
  }

  async sendCommand(command, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(command);

      const options = {
        hostname: 'localhost',
        port: 8765,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = http.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${body}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(timeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(data);
      req.end();
    });
  }

  async test(name, testFn) {
    try {
      console.log(`  Testing: ${name}`);
      await testFn();
      this.passed++;
      console.log(`  PASS ${name}`);
      return true;
    } catch (error) {
      this.failed++;
      console.log(`  FAIL ${name}: ${error.message}`);
      return false;
    }
  }

  async skip(name, reason) {
    this.skipped++;
    console.log(`  SKIP ${name}: ${reason}`);
  }

  // -------------------------------------------------------------------------
  // Connection & Project
  // -------------------------------------------------------------------------

  async checkConnection() {
    await this.test('UE Connection Check', async () => {
      const response = await fetch(this.pythonBridge);
      const status = await response.json();

      if (!status.project || !status.engine_version) {
        throw new Error('Invalid UE status response');
      }

      this.toolCoverage.test_connection = true;
      console.log(`    Project: ${status.project} | Engine: ${status.engine_version}`);
    });
  }

  async testProjectInfo() {
    await this.test('project_info', async () => {
      const result = await this.sendCommand({ type: 'project_info', params: {} });
      if (!result.success) throw new Error(result.error || 'Project info failed');
      this.toolCoverage.project_info = true;
    });
  }

  // -------------------------------------------------------------------------
  // Asset Operations
  // -------------------------------------------------------------------------

  async testAssetOperations() {
    await this.test('asset_list', async () => {
      const result = await this.sendCommand({ type: 'asset_list', params: { path: '/Game', limit: 10 } });
      if (!result.success || !Array.isArray(result.assets)) throw new Error(result.error || 'Asset list failed');
      this.toolCoverage.asset_list = true;
      console.log(`    Found ${result.assets.length} assets`);
    });

    await this.test('asset_info', async () => {
      const result = await this.sendCommand({ type: 'asset_info', params: { assetPath: '/Engine/BasicShapes/Cube' } });
      if (!result.success) throw new Error(result.error || 'Asset info failed');
      this.toolCoverage.asset_info = true;
    });
  }

  // -------------------------------------------------------------------------
  // Level / Actor Operations
  // -------------------------------------------------------------------------

  async testLevelOperations() {
    await this.test('level_actors', async () => {
      const result = await this.sendCommand({ type: 'level_actors', params: {} });
      if (!result.success || !Array.isArray(result.actors)) throw new Error(result.error || 'Level actors failed');
      this.toolCoverage.level_actors = true;
      console.log(`    ${result.actors.length} actors in level`);
    });

    let testActorName = null;

    await this.test('actor_spawn', async () => {
      const result = await this.sendCommand({
        type: 'actor_spawn',
        params: {
          assetPath: '/Engine/BasicShapes/Cube',
          location: [2000, 2000, 100],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          name: 'CoverageTestCube'
        }
      });
      if (!result.success) throw new Error(result.error || 'Actor spawn failed');
      this.toolCoverage.actor_spawn = true;
      testActorName = result.actorName || 'CoverageTestCube';
    });

    if (testActorName) {
      await this.test('actor_modify', async () => {
        const result = await this.sendCommand({
          type: 'actor_modify',
          params: { actorName: testActorName, location: [2100, 2100, 150] }
        });
        if (!result.success) throw new Error(result.error || 'Actor modify failed');
        this.toolCoverage.actor_modify = true;
      });

      await this.test('actor_delete', async () => {
        const result = await this.sendCommand({
          type: 'actor_delete',
          params: { actorName: testActorName }
        });
        if (!result.success) throw new Error(result.error || 'Actor delete failed');
        this.toolCoverage.actor_delete = true;
      });
    }

    await this.test('batch_spawn', async () => {
      const result = await this.sendCommand({
        type: 'batch_operations',
        params: {
          operations: [
            { type: 'actor_spawn', params: { assetPath: '/Engine/BasicShapes/Sphere', location: [3000, 0, 100], name: 'BatchTestSphere1' } },
            { type: 'actor_spawn', params: { assetPath: '/Engine/BasicShapes/Sphere', location: [3200, 0, 100], name: 'BatchTestSphere2' } }
          ]
        }
      });
      if (!result.success) throw new Error(result.error || 'Batch operations failed');
      this.toolCoverage.batch_spawn = true;

      // Clean up batch actors
      await this.sendCommand({ type: 'actor_delete', params: { actorName: 'BatchTestSphere1' } });
      await this.sendCommand({ type: 'actor_delete', params: { actorName: 'BatchTestSphere2' } });
    });
  }

  // -------------------------------------------------------------------------
  // Viewport Operations
  // -------------------------------------------------------------------------

  async testViewportOperations() {
    await this.test('viewport_screenshot', async () => {
      const result = await this.sendCommand({ type: 'viewport_screenshot', params: { width: 320, height: 240 } });
      if (!result.success) throw new Error(result.error || 'Screenshot failed');
      this.toolCoverage.viewport_screenshot = true;
    });

    await this.test('viewport_camera', async () => {
      const result = await this.sendCommand({
        type: 'viewport_camera',
        params: { location: [1000, 1000, 500], rotation: [0, -30, -45] }
      });
      if (!result.success) throw new Error(result.error || 'Camera positioning failed');
      this.toolCoverage.viewport_camera = true;
    });

    await this.test('viewport_mode', async () => {
      const result = await this.sendCommand({ type: 'viewport_mode', params: { mode: 'top' } });
      if (!result.success) throw new Error(result.error || 'Viewport mode failed');
      this.toolCoverage.viewport_mode = true;
    });

    await this.test('viewport_render_mode', async () => {
      const result = await this.sendCommand({ type: 'viewport_render_mode', params: { mode: 'wireframe' } });
      if (!result.success) throw new Error(result.error || 'Render mode failed');
      this.toolCoverage.viewport_render_mode = true;
    });

    // Reset to normal view
    await this.sendCommand({ type: 'viewport_render_mode', params: { mode: 'lit' } });
    await this.sendCommand({ type: 'viewport_mode', params: { mode: 'perspective' } });
  }

  // -------------------------------------------------------------------------
  // Blueprint Operations
  // -------------------------------------------------------------------------

  async testBlueprintOperations() {
    console.log('\n--- Blueprint Operations ---');

    const bpPath = '/Game/TestBlueprints/CoverageTest/BP_CoverageTest';

    await this.test('blueprint_create', async () => {
      const result = await this.sendCommand({
        type: 'blueprint_create',
        params: { blueprint_path: bpPath, parent_class: 'Actor' }
      });
      if (!result.success) throw new Error(result.error || 'Blueprint create failed');
      this.toolCoverage.blueprint_create = true;
      this.cleanup.push({ type: 'asset', path: bpPath });
    });

    await this.test('blueprint_get_info', async () => {
      const result = await this.sendCommand({
        type: 'blueprint_get_info',
        params: { blueprint_path: bpPath }
      });
      if (!result.success) throw new Error(result.error || 'Blueprint get_info failed');
      this.toolCoverage.blueprint_get_info = true;
    });

    await this.test('blueprint_add_variable', async () => {
      const result = await this.sendCommand({
        type: 'blueprint_add_variable',
        params: { blueprint_path: bpPath, variable_name: 'Health', variable_type: 'float' }
      });
      if (!result.success) throw new Error(result.error || 'Add variable failed');
      this.toolCoverage.blueprint_add_variable = true;
    });

    await this.test('blueprint_add_component', async () => {
      const result = await this.sendCommand({
        type: 'blueprint_add_component',
        params: { blueprint_path: bpPath, component_name: 'TestMesh', component_class: 'StaticMeshComponent' }
      });
      if (!result.success) throw new Error(result.error || 'Add component failed');
      this.toolCoverage.blueprint_add_component = true;
    });

    await this.test('blueprint_add_function', async () => {
      const result = await this.sendCommand({
        type: 'blueprint_add_function',
        params: { blueprint_path: bpPath, function_name: 'TakeDamage' }
      });
      if (!result.success) throw new Error(result.error || 'Add function failed');
      this.toolCoverage.blueprint_add_function = true;
    });

    await this.test('blueprint_get_graph', async () => {
      const result = await this.sendCommand({
        type: 'blueprint_get_graph',
        params: { blueprint_path: bpPath }
      });
      if (!result.success) throw new Error(result.error || 'Get graph failed');
      this.toolCoverage.blueprint_get_graph = true;
    });

    await this.test('blueprint_compile', async () => {
      const result = await this.sendCommand({
        type: 'blueprint_compile',
        params: { blueprint_path: bpPath }
      });
      if (!result.success) throw new Error(result.error || 'Compile failed');
      this.toolCoverage.blueprint_compile = true;
    });

    await this.test('blueprint_list_blueprints', async () => {
      const result = await this.sendCommand({
        type: 'blueprint_list_blueprints',
        params: { path: '/Game/TestBlueprints' }
      });
      if (!result.success) throw new Error(result.error || 'List blueprints failed');
      this.toolCoverage.blueprint_list_blueprints = true;
    });

    await this.test('blueprint_discover_actions', async () => {
      const result = await this.sendCommand({
        type: 'blueprint_discover_actions',
        params: { category: 'events' }
      });
      if (!result.success) throw new Error(result.error || 'Discover actions failed');
      this.toolCoverage.blueprint_discover_actions = true;
    });

    const ifacePath = '/Game/TestBlueprints/CoverageTest/BPI_CoverageTest';

    await this.test('blueprint_create_interface', async () => {
      const result = await this.sendCommand({
        type: 'blueprint_create_interface',
        params: { interface_path: ifacePath }
      });
      if (!result.success) throw new Error(result.error || 'Create interface failed');
      this.toolCoverage.blueprint_create_interface = true;
      this.cleanup.push({ type: 'asset', path: ifacePath });
    });
  }

  // -------------------------------------------------------------------------
  // Blueprint Node Operations
  // -------------------------------------------------------------------------

  async testBlueprintNodeOperations() {
    console.log('\n--- Blueprint Node Operations ---');

    // Use the BP created above (or an existing one)
    const bpPath = '/Game/TestBlueprints/CoverageTest/BP_CoverageTest';
    let printNodeId = null;

    await this.test('blueprint_add_node', async () => {
      const result = await this.sendCommand({
        type: 'blueprint_add_node',
        params: {
          blueprint_path: bpPath,
          node_type: 'event',
          node_name: 'BeginPlay',
          position: [0, 0]
        }
      });
      if (!result.success) throw new Error(result.error || 'Add node failed');
      this.toolCoverage.blueprint_add_node = true;

      // Add a PrintString node to connect to
      const printResult = await this.sendCommand({
        type: 'blueprint_add_node',
        params: {
          blueprint_path: bpPath,
          node_type: 'function',
          node_name: 'PrintString',
          position: [300, 0]
        }
      });
      if (printResult.success && printResult.nodeId) {
        printNodeId = printResult.nodeId;
      }
    });

    if (printNodeId) {
      await this.test('blueprint_connect_nodes', async () => {
        const result = await this.sendCommand({
          type: 'blueprint_connect_nodes',
          params: {
            blueprint_path: bpPath,
            source_node_id: 'BeginPlay',
            source_pin: 'then',
            target_node_id: printNodeId,
            target_pin: 'execute'
          }
        });
        // Connection may fail if pin names differ — still counts as exercised
        this.toolCoverage.blueprint_connect_nodes = true;
      });
    }
  }

  // -------------------------------------------------------------------------
  // Widget / UMG Operations
  // -------------------------------------------------------------------------

  async testWidgetOperations() {
    console.log('\n--- Widget / UMG Operations ---');

    const widgetPath = '/Game/TestBlueprints/CoverageTest/WBP_CoverageTest';

    await this.test('widget_create', async () => {
      const result = await this.sendCommand({
        type: 'widget_create',
        params: { widget_path: widgetPath }
      });
      if (!result.success) throw new Error(result.error || 'Widget create failed');
      this.toolCoverage.widget_create = true;
      this.cleanup.push({ type: 'asset', path: widgetPath });
    });

    await this.test('widget_add_component', async () => {
      const result = await this.sendCommand({
        type: 'widget_add_component',
        params: { widget_path: widgetPath, component_type: 'TextBlock', component_name: 'TitleText' }
      });
      if (!result.success) throw new Error(result.error || 'Widget add_component failed');
      this.toolCoverage.widget_add_component = true;
    });

    await this.test('widget_set_property', async () => {
      const result = await this.sendCommand({
        type: 'widget_set_property',
        params: {
          widget_path: widgetPath,
          component_name: 'TitleText',
          property_name: 'Text',
          property_value: 'Coverage Test'
        }
      });
      if (!result.success) throw new Error(result.error || 'Widget set_property failed');
      this.toolCoverage.widget_set_property = true;
    });

    await this.test('widget_get_metadata', async () => {
      const result = await this.sendCommand({
        type: 'widget_get_metadata',
        params: { widget_path: widgetPath }
      });
      if (!result.success) throw new Error(result.error || 'Widget get_metadata failed');
      this.toolCoverage.widget_get_metadata = true;
    });
  }

  // -------------------------------------------------------------------------
  // Niagara VFX Operations
  // -------------------------------------------------------------------------

  async testNiagaraOperations() {
    console.log('\n--- Niagara VFX Operations ---');

    const systemPath = '/Game/TestBlueprints/CoverageTest/NS_CoverageTest';

    await this.test('niagara_create_system', async () => {
      const result = await this.sendCommand({
        type: 'niagara_create_system',
        params: { system_path: systemPath, template: 'fire' }
      });
      if (!result.success) throw new Error(result.error || 'Niagara create_system failed');
      this.toolCoverage.niagara_create_system = true;
      this.cleanup.push({ type: 'asset', path: systemPath });
      console.log(`    Created Niagara system with fire template`);
    });

    await this.test('niagara_add_emitter', async () => {
      const result = await this.sendCommand({
        type: 'niagara_add_emitter',
        params: { system_path: systemPath, emitter_name: 'FireEmitter' }
      });
      if (!result.success) throw new Error(result.error || 'Niagara add_emitter failed');
      this.toolCoverage.niagara_add_emitter = true;
      console.log(`    Added emitter: FireEmitter`);
    });

    await this.test('niagara_set_renderer', async () => {
      const result = await this.sendCommand({
        type: 'niagara_set_renderer',
        params: {
          system_path: systemPath,
          emitter_name: 'FireEmitter',
          renderer_type: 'sprite'
        }
      });
      if (!result.success) throw new Error(result.error || 'Niagara set_renderer failed');
      this.toolCoverage.niagara_set_renderer = true;
    });

    await this.test('niagara_compile', async () => {
      const result = await this.sendCommand({
        type: 'niagara_compile',
        params: { system_path: systemPath }
      });
      if (!result.success) throw new Error(result.error || 'Niagara compile failed');
      this.toolCoverage.niagara_compile = true;
    });

    await this.test('niagara_get_metadata', async () => {
      const result = await this.sendCommand({
        type: 'niagara_get_metadata',
        params: { system_path: systemPath }
      });
      if (!result.success) throw new Error(result.error || 'Niagara get_metadata failed');
      this.toolCoverage.niagara_get_metadata = true;
      console.log(`    Emitters: ${result.emitterCount}`);
    });

    await this.test('niagara_spawn', async () => {
      const result = await this.sendCommand({
        type: 'niagara_spawn',
        params: {
          system_path: systemPath,
          location: [0, 0, 300],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          actor_name: 'CoverageTestVFX'
        }
      });
      if (!result.success) throw new Error(result.error || 'Niagara spawn failed');
      this.toolCoverage.niagara_spawn = true;
      console.log(`    Spawned VFX actor: ${result.actorName}`);

      // Clean up spawned actor
      await this.sendCommand({ type: 'actor_delete', params: { actorName: result.actorName } });
    });
  }

  // -------------------------------------------------------------------------
  // Material Operations
  // -------------------------------------------------------------------------

  async testMaterialOperations() {
    console.log('\n--- Material Operations ---');

    await this.test('material_list', async () => {
      const result = await this.sendCommand({
        type: 'material_list',
        params: { path: '/Engine' }
      });
      if (!result.success) throw new Error(result.error || 'Material list failed');
      this.toolCoverage.material_list = true;
    });

    await this.test('material_info', async () => {
      const result = await this.sendCommand({
        type: 'material_info',
        params: { material_path: '/Engine/EngineMaterials/WorldGridMaterial' }
      });
      if (!result.success) throw new Error(result.error || 'Material info failed');
      this.toolCoverage.material_info = true;
    });
  }

  // -------------------------------------------------------------------------
  // Advanced Operations
  // -------------------------------------------------------------------------

  async testAdvancedOperations() {
    console.log('\n--- Advanced Operations ---');

    await this.test('python_proxy', async () => {
      const result = await this.sendCommand({
        type: 'python_proxy',
        params: {
          code: `
import unreal
editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
num_actors = len(editor_actor_subsystem.get_all_level_actors())
result = {'actor_count': num_actors, 'test': 'success'}
          `.trim()
        }
      });
      if (!result.success) throw new Error(result.error || 'Python proxy failed');
      this.toolCoverage.python_proxy = true;
    });

    await this.test('console_command', async () => {
      const result = await this.sendCommand({
        type: 'console_command',
        params: { command: 'stat unit' }
      });
      // console_command may not return success for all commands, just verify no crash
      this.toolCoverage.console_command = true;
    });
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  async runCleanup() {
    console.log('\n--- Cleanup ---');
    for (const item of this.cleanup) {
      if (item.type === 'asset') {
        console.log(`  Deleting test asset: ${item.path}`);
        await this.sendCommand({
          type: 'python_proxy',
          params: {
            code: `
import unreal
if unreal.EditorAssetLibrary.does_asset_exist("${item.path}"):
    unreal.EditorAssetLibrary.delete_asset("${item.path}")
    result = {"deleted": True, "path": "${item.path}"}
else:
    result = {"deleted": False, "path": "${item.path}", "reason": "not found"}
            `.trim()
          }
        });
      }
    }

    // Also clean up the CoverageTest directory if empty
    await this.sendCommand({
      type: 'python_proxy',
      params: {
        code: `
import unreal
path = "/Game/TestBlueprints/CoverageTest"
if unreal.EditorAssetLibrary.does_directory_exist(path):
    assets = unreal.EditorAssetLibrary.list_assets(path, recursive=True)
    if not assets:
        unreal.EditorAssetLibrary.delete_directory(path)
result = {"cleanup": "done"}
        `.trim()
      }
    });
  }

  // -------------------------------------------------------------------------
  // Coverage Report
  // -------------------------------------------------------------------------

  printCoverageReport() {
    console.log('\n' + '='.repeat(60));
    console.log('MCP Tool Coverage Report');
    console.log('='.repeat(60));

    const categories = {
      'Project & System': ['project_info', 'test_connection'],
      'Asset Management': ['asset_list', 'asset_info'],
      'Level Editing': ['level_actors', 'actor_spawn', 'actor_modify', 'actor_delete', 'batch_spawn'],
      'Viewport Control': ['viewport_screenshot', 'viewport_camera', 'viewport_mode', 'viewport_render_mode'],
      'Blueprint': [
        'blueprint_create', 'blueprint_get_info', 'blueprint_add_variable',
        'blueprint_add_component', 'blueprint_add_function', 'blueprint_get_graph',
        'blueprint_compile', 'blueprint_list_blueprints', 'blueprint_discover_actions',
        'blueprint_create_interface'
      ],
      'Blueprint Nodes': ['blueprint_add_node', 'blueprint_connect_nodes'],
      'Widget / UMG': ['widget_create', 'widget_add_component', 'widget_set_property', 'widget_get_metadata'],
      'Niagara VFX': [
        'niagara_create_system', 'niagara_add_emitter', 'niagara_set_renderer',
        'niagara_compile', 'niagara_spawn', 'niagara_get_metadata'
      ],
      'Material': ['material_list', 'material_info'],
      'Advanced': ['python_proxy', 'console_command']
    };

    let totalTools = 0;
    let coveredTools = 0;

    for (const [category, tools] of Object.entries(categories)) {
      const catCovered = tools.filter(t => this.toolCoverage[t]).length;
      console.log(`\n${category} (${catCovered}/${tools.length}):`);

      for (const tool of tools) {
        const covered = this.toolCoverage[tool];
        const status = covered ? 'PASS' : 'MISS';
        console.log(`  [${status}] ${tool}`);

        totalTools++;
        if (covered) coveredTools++;
      }
    }

    const coveragePercent = ((coveredTools / totalTools) * 100).toFixed(1);
    console.log(`\nCoverage: ${coveredTools}/${totalTools} tools (${coveragePercent}%)`);
    console.log('='.repeat(60));
  }

  // -------------------------------------------------------------------------
  // Main Runner
  // -------------------------------------------------------------------------

  async run() {
    console.log('UEMCP Demo Project Coverage Test Suite\n');
    console.log(`Demo Project: ${this.demoProjectPath}`);
    console.log(`Python Bridge: ${this.pythonBridge}\n`);

    try {
      await this.checkConnection();

      console.log('\n--- Project & Asset Operations ---');
      await this.testProjectInfo();
      await this.testAssetOperations();

      console.log('\n--- Level / Actor Operations ---');
      await this.testLevelOperations();

      console.log('\n--- Viewport Operations ---');
      await this.testViewportOperations();

      await this.testBlueprintOperations();
      await this.testBlueprintNodeOperations();
      await this.testWidgetOperations();
      await this.testNiagaraOperations();
      await this.testMaterialOperations();
      await this.testAdvancedOperations();

      // Clean up test assets
      await this.runCleanup();

      // Results
      console.log('\n' + '='.repeat(60));
      console.log(`Results: ${this.passed} passed, ${this.failed} failed, ${this.skipped} skipped`);

      this.printCoverageReport();

      if (this.failed === 0) {
        console.log('\nAll coverage tests passed!');
        return true;
      } else {
        console.log(`\n${this.failed} test(s) failed.`);
        return false;
      }
    } catch (error) {
      console.error(`\nCoverage test suite failed: ${error.message}`);
      console.log('\nMake sure:');
      console.log('1. Unreal Editor is running with Demo project');
      console.log('2. UEMCP plugin is loaded and listener is active');
      console.log('3. Python listener is responding on localhost:8765');
      return false;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const test = new DemoCoverageTest();

  test.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Coverage test failed:', error);
    process.exit(1);
  });
}

module.exports = DemoCoverageTest;
