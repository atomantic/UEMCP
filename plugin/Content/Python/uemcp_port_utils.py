"""
UEMCP Port Utilities
Helper functions for managing port conflicts
"""

import socket
import subprocess
import platform
import unreal

def find_process_using_port(port):
    """Find which process is using a specific port"""
    system = platform.system()
    
    try:
        if system == "Darwin":  # macOS
            # Use lsof to find process
            result = subprocess.run(
                ['lsof', '-i', f':{port}', '-t'],
                capture_output=True,
                text=True
            )
            if result.stdout:
                pid = result.stdout.strip()
                # Get process name
                name_result = subprocess.run(
                    ['ps', '-p', pid, '-o', 'comm='],
                    capture_output=True,
                    text=True
                )
                process_name = name_result.stdout.strip()
                return pid, process_name
        elif system == "Windows":
            # Use netstat for Windows
            result = subprocess.run(
                ['netstat', '-ano', '-p', 'tcp'],
                capture_output=True,
                text=True
            )
            for line in result.stdout.split('\n'):
                if f':{port}' in line and 'LISTENING' in line:
                    parts = line.split()
                    pid = parts[-1]
                    return pid, "Unknown (use Task Manager to check)"
    except Exception as e:
        unreal.log_warning(f"Could not check port usage: {e}")
    
    return None, None

def kill_process_on_port(port):
    """Kill process using a specific port (use with caution)"""
    pid, process_name = find_process_using_port(port)
    
    if pid:
        unreal.log(f"Found process {process_name} (PID: {pid}) using port {port}")
        try:
            if platform.system() == "Darwin":
                subprocess.run(['kill', '-9', pid])
                unreal.log(f"Killed process {pid}")
                return True
            elif platform.system() == "Windows":
                subprocess.run(['taskkill', '/F', '/PID', pid])
                unreal.log(f"Killed process {pid}")
                return True
        except Exception as e:
            unreal.log_error(f"Failed to kill process: {e}")
    
    return False

def is_port_available(port):
    """Check if a port is available"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(('localhost', port))
        return True
    except OSError:
        return False
    finally:
        sock.close()

def force_free_port(port):
    """Try to free up a port by killing the process using it"""
    if is_port_available(port):
        unreal.log(f"Port {port} is already available")
        return True
    
    pid, process_name = find_process_using_port(port)
    if pid:
        unreal.log_warning(f"Port {port} is used by {process_name} (PID: {pid})")
        response = unreal.EditorDialog.show_message(
            "Port Conflict",
            f"Port {port} is being used by {process_name} (PID: {pid}).\n\nKill this process?",
            unreal.AppMsgType.YES_NO
        )
        if response == unreal.AppReturnType.YES:
            if kill_process_on_port(port):
                import time
                time.sleep(1)  # Give OS time to free the port
                return is_port_available(port)
    
    return False