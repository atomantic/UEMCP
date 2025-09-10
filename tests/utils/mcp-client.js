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
      // System tools - these use custom registrations
      'python_proxy': 'python_proxy',
      'test_connection': 'test_connection',
      'help': 'help',
      'ue_logs': 'ue_logs',
      'restart_listener': 'restart_listener',
      'undo': 'undo',
      'redo': 'redo', 
      'history_list': 'history_list',
      'checkpoint_create': 'checkpoint_create',
      'checkpoint_restore': 'checkpoint_restore',
      'batch_operations': 'batch_operations',
      
      // Project tools - from LevelOperations class
      'project_info': 'level_get_project_info',
      
      // Actor tools - from ActorOperations class
      'actor_spawn': 'actor_spawn',
      'actor_delete': 'actor_delete', 
      'actor_modify': 'actor_modify',
      'actor_duplicate': 'actor_duplicate',
      'actor_organize': 'actor_organize',
      'actor_snap_to_socket': 'actor_snap_to_socket',
      'batch_spawn': 'batch_spawn',
      'placement_validate': 'placement_validate',
      
      // Asset tools - from AssetOperations class  
      'asset_list': 'asset_list_assets',
      'asset_info': 'asset_get_info',
      'asset_import': 'asset_import_assets',
      
      // Material tools - from MaterialOperations class
      'material_list': 'material_list_materials',
      'material_info': 'material_get_info',
      'material_create': 'material_create_material',
      'material_apply': 'material_apply_to_actor',
      
      // Blueprint tools
      'blueprint_create': 'blueprint_create',
      
      // Level tools - from LevelOperations class
      'level_actors': 'level_get_level_actors',
      'level_save': 'level_save_level',
      'level_outliner': 'level_get_outliner',
      
      // Viewport tools - from ViewportOperations class
      'viewport_screenshot': 'viewport_take_screenshot',
      'viewport_camera': 'viewport_set_camera',
      'viewport_mode': 'viewport_set_mode',
      'viewport_focus': 'viewport_focus_on_actor',
      'viewport_render_mode': 'viewport_set_render_mode',
      'viewport_bounds': 'viewport_get_bounds',
      'viewport_fit': 'viewport_fit_actors',
      'viewport_look_at': 'viewport_look_at_target'
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