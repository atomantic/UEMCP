"""
UEMCP Bridge - Python bridge between MCP server and Unreal Engine
This script runs inside Unreal Engine's Python environment
"""
import unreal
import json
import sys
import os
import subprocess
import threading
import queue
import time
from typing import Dict, Any, Optional, List

class UEMCPBridge:
    """Bridge between MCP server and Unreal Engine"""
    
    def __init__(self):
        self.command_queue = queue.Queue()
        self.response_queue = queue.Queue()
        self.running = False
        self.worker_thread = None
        
    def start(self):
        """Start the bridge worker thread"""
        if self.running:
            unreal.log_warning("[UEMCP] Bridge already running")
            return
            
        self.running = True
        self.worker_thread = threading.Thread(target=self._worker_loop)
        self.worker_thread.daemon = True
        self.worker_thread.start()
        unreal.log("[UEMCP] Bridge started")
        
    def stop(self):
        """Stop the bridge worker thread"""
        self.running = False
        if self.worker_thread:
            self.worker_thread.join(timeout=5)
        unreal.log("[UEMCP] Bridge stopped")
        
    def _worker_loop(self):
        """Main worker loop processing commands"""
        while self.running:
            try:
                # Check for commands (non-blocking with timeout)
                command = self.command_queue.get(timeout=0.1)
                response = self._process_command(command)
                self.response_queue.put(response)
            except queue.Empty:
                continue
            except Exception as e:
                unreal.log_error(f"[UEMCP] Worker error: {str(e)}")
                
    def _process_command(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single command from MCP server"""
        try:
            cmd_type = command.get('type')
            params = command.get('params', {})
            
            if cmd_type == 'project.create':
                return self._create_project(params)
            elif cmd_type == 'project.open':
                return self._open_project(params)
            elif cmd_type == 'asset.import':
                return self._import_asset(params)
            elif cmd_type == 'asset.list':
                return self._list_assets(params)
            elif cmd_type == 'blueprint.create':
                return self._create_blueprint(params)
            else:
                return {'success': False, 'error': f'Unknown command: {cmd_type}'}
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
            
    def _create_project(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new Unreal Engine project"""
        # Note: Project creation typically requires UnrealBuildTool
        # This is a placeholder for the actual implementation
        project_name = params.get('projectName')
        project_path = params.get('projectPath')
        
        unreal.log(f"[UEMCP] Creating project: {project_name} at {project_path}")
        
        # For now, return mock success
        return {
            'success': True,
            'projectPath': os.path.join(project_path, project_name),
            'message': f'Project {project_name} created (mock)'
        }
        
    def _open_project(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Open an existing project"""
        project_file = params.get('projectFile')
        
        # Get current project info
        current_project = unreal.SystemLibrary.get_project_name()
        
        return {
            'success': True,
            'currentProject': current_project,
            'message': 'Project info retrieved'
        }
        
    def _import_asset(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Import an asset into the project"""
        file_path = params.get('filePath')
        destination_path = params.get('destinationPath', '/Game/Imported')
        
        # Create import task
        task = unreal.AssetImportTask()
        task.filename = file_path
        task.destination_path = destination_path
        task.automated = True
        task.save = True
        
        # Execute import
        asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
        asset_tools.import_asset_tasks([task])
        
        # Check if import was successful
        imported_assets = task.imported_object_paths
        
        return {
            'success': len(imported_assets) > 0,
            'importedAssets': [str(path) for path in imported_assets],
            'message': f'Imported {len(imported_assets)} assets'
        }
        
    def _list_assets(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List assets in the project"""
        path = params.get('path', '/Game')
        asset_type = params.get('assetType', None)
        
        # Get asset registry
        asset_registry = unreal.AssetRegistryHelpers.get_asset_registry()
        
        # Build filter
        filter_args = unreal.ARFilter()
        filter_args.package_paths = [path]
        filter_args.recursive_paths = True
        
        if asset_type:
            filter_args.class_names = [asset_type]
            
        # Get assets
        assets = asset_registry.get_assets(filter_args)
        
        # Format asset data
        asset_list = []
        for asset in assets:
            asset_list.append({
                'name': str(asset.asset_name),
                'path': str(asset.object_path),
                'class': str(asset.asset_class),
                'package': str(asset.package_name)
            })
            
        return {
            'success': True,
            'assets': asset_list,
            'count': len(asset_list)
        }
        
    def _create_blueprint(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new Blueprint"""
        blueprint_name = params.get('name')
        blueprint_path = params.get('path', '/Game/Blueprints')
        parent_class = params.get('parentClass', 'Actor')
        
        # Get the parent class
        if parent_class == 'Actor':
            parent = unreal.Actor
        elif parent_class == 'Pawn':
            parent = unreal.Pawn
        elif parent_class == 'Character':
            parent = unreal.Character
        else:
            parent = unreal.Actor
            
        # Create blueprint
        asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
        bp_factory = unreal.BlueprintFactory()
        bp_factory.set_editor_property("parent_class", parent)
        
        # Create the asset
        created_asset = asset_tools.create_asset(
            asset_name=blueprint_name,
            package_path=blueprint_path,
            asset_class=unreal.Blueprint,
            factory=bp_factory
        )
        
        if created_asset:
            return {
                'success': True,
                'blueprintPath': f"{blueprint_path}/{blueprint_name}",
                'message': f'Blueprint {blueprint_name} created successfully'
            }
        else:
            return {
                'success': False,
                'error': 'Failed to create blueprint'
            }

# Global bridge instance
_bridge = None

def get_bridge():
    """Get or create the global bridge instance"""
    global _bridge
    if _bridge is None:
        _bridge = UEMCPBridge()
    return _bridge

def start_bridge():
    """Start the UEMCP bridge"""
    bridge = get_bridge()
    bridge.start()
    
def stop_bridge():
    """Stop the UEMCP bridge"""
    bridge = get_bridge()
    bridge.stop()

# Auto-start bridge when module is imported
if __name__ != "__main__":
    unreal.log("[UEMCP] Bridge module loaded")