#!/usr/bin/env node

/**
 * Demo Project Coverage Test Suite
 * 
 * This test exercises all MCP tools against the Demo UE project
 * to provide comprehensive code coverage and validate real functionality.
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
    
    // Track MCP tool coverage
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
      
      // Advanced
      'python_proxy': false
    };
  }

  async sendCommand(command) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(command);
      
      const options = {
        hostname: 'localhost',
        port: 8765,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
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
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.write(data);
      req.end();
    });
  }

  async test(name, testFn) {
    try {
      console.log(`🧪 Testing: ${name}`);
      await testFn();
      this.passed++;
      console.log(`✅ ${name} - PASSED`);
      return true;
    } catch (error) {
      this.failed++;
      console.log(`❌ ${name} - FAILED: ${error.message}`);
      return false;
    }
  }

  async checkConnection() {
    await this.test('UE Connection Check', async () => {
      const response = await fetch(this.pythonBridge);
      const status = await response.json();
      
      if (!status.project || !status.engine_version) {
        throw new Error('Invalid UE status response');
      }
      
      console.log(`   📦 Project: ${status.project}`);
      console.log(`   🎮 Engine: ${status.engine_version}`);
    });
  }

  async testProjectInfo() {
    await this.test('project_info', async () => {
      const result = await this.sendCommand({
        type: 'project.info',
        params: {}
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Project info failed');
      }
      
      this.toolCoverage.project_info = true;
      console.log(`   📁 Project Path: ${result.projectPath || 'Unknown'}`);
    });
  }

  async testAssetOperations() {
    await this.test('asset_list', async () => {
      const result = await this.sendCommand({
        type: 'asset.list',
        params: { path: '/Game', limit: 10 }
      });
      
      if (!result.success || !Array.isArray(result.assets)) {
        throw new Error(result.error || 'Asset list failed');
      }
      
      this.toolCoverage.asset_list = true;
      console.log(`   📦 Found ${result.assets.length} assets`);
    });

    await this.test('asset_info', async () => {
      // Test with a basic engine asset that should exist
      const result = await this.sendCommand({
        type: 'asset.info',
        params: { assetPath: '/Engine/BasicShapes/Cube' }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Asset info failed');
      }
      
      this.toolCoverage.asset_info = true;
      console.log(`   📊 Asset Type: ${result.assetType || 'Unknown'}`);
    });
  }

  async testLevelOperations() {
    await this.test('level_actors', async () => {
      const result = await this.sendCommand({
        type: 'level.actors',
        params: {}
      });
      
      if (!result.success || !Array.isArray(result.actors)) {
        throw new Error(result.error || 'Level actors failed');
      }
      
      this.toolCoverage.level_actors = true;
      console.log(`   🎭 Found ${result.actors.length} actors in level`);
    });

    await this.test('actor_spawn', async () => {
      const result = await this.sendCommand({
        type: 'actor.spawn',
        params: {
          assetPath: '/Engine/BasicShapes/Cube',
          location: [500, 500, 100],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          name: 'CoverageTestCube'
        }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Actor spawn failed');
      }
      
      this.toolCoverage.actor_spawn = true;
      console.log(`   🎯 Spawned actor: ${result.actorName || 'Unknown'}`);
      
      // Store for cleanup
      this.testActorName = result.actorName;
    });

    if (this.testActorName) {
      await this.test('actor_modify', async () => {
        const result = await this.sendCommand({
          type: 'actor.modify',
          params: {
            actorName: this.testActorName,
            location: [600, 600, 150]
          }
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Actor modify failed');
        }
        
        this.toolCoverage.actor_modify = true;
        console.log(`   🔧 Modified actor location`);
      });

      await this.test('actor_delete', async () => {
        const result = await this.sendCommand({
          type: 'actor.delete',
          params: {
            actorName: this.testActorName
          }
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Actor delete failed');
        }
        
        this.toolCoverage.actor_delete = true;
        console.log(`   🗑️  Deleted test actor`);
      });
    }
  }

  async testViewportOperations() {
    await this.test('viewport_screenshot', async () => {
      const result = await this.sendCommand({
        type: 'viewport.screenshot',
        params: { width: 320, height: 240 }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Screenshot failed');
      }
      
      this.toolCoverage.viewport_screenshot = true;
      console.log(`   📸 Screenshot: ${result.screenshotPath || 'Generated'}`);
    });

    await this.test('viewport_camera', async () => {
      const result = await this.sendCommand({
        type: 'viewport.camera',
        params: {
          location: [1000, 1000, 500],
          rotation: [0, -30, -45]
        }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Camera positioning failed');
      }
      
      this.toolCoverage.viewport_camera = true;
      console.log(`   🎥 Camera positioned`);
    });

    await this.test('viewport_mode', async () => {
      const result = await this.sendCommand({
        type: 'viewport.mode',
        params: { mode: 'top' }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Viewport mode failed');
      }
      
      this.toolCoverage.viewport_mode = true;
      console.log(`   📐 Viewport mode: top`);
    });

    await this.test('viewport_render_mode', async () => {
      const result = await this.sendCommand({
        type: 'viewport.render_mode',
        params: { mode: 'wireframe' }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Render mode failed');
      }
      
      this.toolCoverage.viewport_render_mode = true;
      console.log(`   🔲 Render mode: wireframe`);
    });

    // Reset to normal view
    await this.sendCommand({
      type: 'viewport.render_mode',
      params: { mode: 'lit' }
    });
  }

  async testAdvancedOperations() {
    await this.test('python_proxy', async () => {
      const result = await this.sendCommand({
        type: 'python.proxy',
        params: {
          code: `
# Test Python proxy with simple operation
import unreal
editor_actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
num_actors = len(editor_actor_subsystem.get_all_level_actors())
result = {'actor_count': num_actors, 'test': 'success'}
          `.trim()
        }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Python proxy failed');
      }
      
      this.toolCoverage.python_proxy = true;
      console.log(`   🐍 Python proxy executed: ${result.actor_count || 0} actors`);
    });
  }

  printCoverageReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 MCP Tool Coverage Report');
    console.log('='.repeat(50));
    
    const categories = {
      'Project & System': ['project_info', 'test_connection'],
      'Asset Management': ['asset_list', 'asset_info'],
      'Level Editing': ['level_actors', 'actor_spawn', 'actor_modify', 'actor_delete', 'batch_spawn'],
      'Viewport Control': ['viewport_screenshot', 'viewport_camera', 'viewport_mode', 'viewport_render_mode'],
      'Advanced': ['python_proxy']
    };
    
    let totalTools = 0;
    let coveredTools = 0;
    
    for (const [category, tools] of Object.entries(categories)) {
      console.log(`\n${category}:`);
      
      for (const tool of tools) {
        const covered = this.toolCoverage[tool];
        const status = covered ? '✅' : '❌';
        console.log(`  ${status} ${tool}`);
        
        totalTools++;
        if (covered) coveredTools++;
      }
    }
    
    const coveragePercent = ((coveredTools / totalTools) * 100).toFixed(1);
    console.log(`\n📈 Coverage: ${coveredTools}/${totalTools} tools (${coveragePercent}%)`);
    console.log('='.repeat(50));
  }

  async run() {
    console.log('🚀 Starting Demo Project Coverage Test Suite\n');
    console.log(`📁 Demo Project: ${this.demoProjectPath}`);
    console.log(`🔌 Python Bridge: ${this.pythonBridge}\n`);
    
    try {
      // Check UE connection
      await this.checkConnection();
      
      // Test all MCP tool categories
      await this.testProjectInfo();
      await this.testAssetOperations();
      await this.testLevelOperations();
      await this.testViewportOperations();
      await this.testAdvancedOperations();
      
      // Print results
      console.log('\n' + '='.repeat(50));
      console.log(`🎯 Test Results: ${this.passed} passed, ${this.failed} failed`);
      
      this.printCoverageReport();
      
      if (this.failed === 0) {
        console.log('\n🎉 All coverage tests passed!');
        return true;
      } else {
        console.log(`\n💥 ${this.failed} test(s) failed.`);
        return false;
      }
      
    } catch (error) {
      console.error(`\n❌ Coverage test suite failed: ${error.message}`);
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