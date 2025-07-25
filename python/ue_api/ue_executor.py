"""
Unreal Engine Command Executor
This script is called by the MCP server to execute commands in Unreal Engine
"""
import sys
import json
import subprocess
import os
from typing import Dict, Any, Optional

class UnrealEngineExecutor:
    """Execute commands in Unreal Engine via Python"""
    
    def __init__(self, project_path: Optional[str] = None):
        self.project_path = project_path
        self.ue_python_exe = self._find_ue_python()
        
    def _find_ue_python(self) -> Optional[str]:
        """Find Unreal Engine's Python executable"""
        # Common UE installation paths
        possible_paths = [
            "/Users/Shared/Epic Games/UE_5.6/Engine/Binaries/ThirdParty/Python3/Mac/bin/python3",
            "/Applications/Epic Games/UE_5.6/Engine/Binaries/ThirdParty/Python3/Mac/bin/python3",
            # Add more paths as needed
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
                
        # Try to find from environment variable
        ue_install = os.environ.get('UE_INSTALL_LOCATION')
        if ue_install:
            python_path = os.path.join(ue_install, 'Engine/Binaries/ThirdParty/Python3/Mac/bin/python3')
            if os.path.exists(python_path):
                return python_path
                
        return None
        
    def execute_in_editor(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a command in Unreal Editor"""
        if not self.ue_python_exe:
            return {
                'success': False,
                'error': 'Unreal Engine Python not found. Please set UE_INSTALL_LOCATION environment variable.'
            }
            
        # Build the Python command to execute in UE
        script = f"""
import unreal
import json

# Command to execute
command = {json.dumps(command)}

# Try to import and use UEMCP bridge
try:
    import uemcp_bridge
    bridge = uemcp_bridge.get_bridge()
    bridge.command_queue.put(command)
    
    # Wait for response (with timeout)
    import time
    timeout = 10
    start_time = time.time()
    
    while True:
        if not bridge.response_queue.empty():
            response = bridge.response_queue.get()
            print(json.dumps(response))
            break
        elif time.time() - start_time > timeout:
            print(json.dumps({{'success': False, 'error': 'Command timeout'}}))
            break
        time.sleep(0.1)
except Exception as e:
    print(json.dumps({{'success': False, 'error': str(e)}}))
"""
        
        # Execute the script
        try:
            # For now, return mock response since we need UE running
            # In production, this would use subprocess to run in UE
            if command.get('type') == 'project.create':
                return {
                    'success': True,
                    'message': 'Project creation would be executed in UE',
                    'mockMode': True
                }
            else:
                return {
                    'success': True,
                    'message': f"Command {command.get('type')} would be executed in UE",
                    'mockMode': True
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
            
    def execute_standalone(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a command that doesn't require the editor"""
        cmd_type = command.get('type')
        
        if cmd_type == 'project.create':
            # Use UnrealBuildTool to create project
            # This is a simplified version
            return self._create_project_standalone(command.get('params', {}))
            
        return {
            'success': False,
            'error': f'Standalone execution not supported for command: {cmd_type}'
        }
        
    def _create_project_standalone(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a project using UnrealBuildTool"""
        # This would use UBT to create the project
        # For now, return mock response
        return {
            'success': True,
            'message': 'Project creation via UBT not yet implemented',
            'mockMode': True
        }

def main() -> None:
    """Main entry point when called from MCP server"""
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No command provided'}))
        sys.exit(1)
        
    try:
        command = json.loads(sys.argv[1])
        executor = UnrealEngineExecutor()
        
        # Determine if command needs editor or can run standalone
        if command.get('type') in ['project.create']:
            result = executor.execute_standalone(command)
        else:
            result = executor.execute_in_editor(command)
            
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()