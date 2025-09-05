/**
 * MCP Client for Integration Testing
 * 
 * Provides a simple interface for testing MCP tools
 * without requiring full Claude Desktop integration.
 */

const http = require('http');

class MCPClient {
  constructor(baseUrl = 'http://localhost:8765') {
    this.baseUrl = baseUrl;
    this.timeout = 30000; // 30 second timeout
  }

  /**
   * Call an MCP tool via the Python bridge
   */
  async callTool(toolName, params = {}) {
    return new Promise((resolve, reject) => {
      const command = {
        type: this.mapToolName(toolName),
        params
      };
      
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
            const result = JSON.parse(body);
            resolve(result);
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${body}`));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(this.timeout, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.write(data);
      req.end();
    });
  }

  /**
   * Map friendly tool names to internal command types
   */
  mapToolName(toolName) {
    const mapping = {
      // System tools
      'python_proxy': 'python.proxy',
      'project_info': 'project.info',
      'test_connection': 'system.test_connection',
      'help': 'system.help',
      'ue_logs': 'system.ue_logs',
      'restart_listener': 'system.restart_listener',
      'undo': 'system.undo',
      'redo': 'system.redo',
      'history_list': 'system.history_list',
      'checkpoint_create': 'system.checkpoint_create',
      'checkpoint_restore': 'system.checkpoint_restore',
      'batch_operations': 'system.batch_operations',
      
      // Actor tools
      'actor_spawn': 'actor.spawn',
      'actor_delete': 'actor.delete',
      'actor_modify': 'actor.modify',
      'actor_duplicate': 'actor.duplicate',
      'actor_organize': 'actor.organize',
      'actor_snap_to_socket': 'actor.snap_to_socket',
      'batch_spawn': 'actor.batch_spawn',
      'placement_validate': 'placement.validate',
      
      // Asset tools
      'asset_list': 'asset.list',
      'asset_info': 'asset.info',
      'asset_import': 'asset.import',
      
      // Material tools
      'material_list': 'material.list',
      'material_info': 'material.info',
      'material_create': 'material.create',
      'material_apply': 'material.apply',
      
      // Blueprint tools
      'blueprint_create': 'blueprint.create',
      
      // Level tools
      'level_actors': 'level.actors',
      'level_save': 'level.save',
      'level_outliner': 'level.outliner',
      
      // Viewport tools
      'viewport_screenshot': 'viewport.screenshot',
      'viewport_camera': 'viewport.camera',
      'viewport_mode': 'viewport.mode',
      'viewport_focus': 'viewport.focus',
      'viewport_render_mode': 'viewport.render_mode',
      'viewport_bounds': 'viewport.bounds',
      'viewport_fit': 'viewport.fit',
      'viewport_look_at': 'viewport.look_at'
    };
    
    return mapping[toolName] || toolName;
  }

  /**
   * Check if the Python bridge is available
   */
  async checkConnection() {
    return new Promise((resolve) => {
      const req = http.get(this.baseUrl, (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Get status from the Python bridge
   */
  async getStatus() {
    return new Promise((resolve, reject) => {
      const req = http.get(this.baseUrl, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            resolve(result);
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${body}`));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }
}

module.exports = { MCPClient };