"""
Port management utilities for UEMCP
"""

import platform
import socket
import subprocess
import time

import unreal


def is_port_in_use(port):
    """Check if a port is currently in use"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(("localhost", port))
    sock.close()
    return result == 0


def find_all_processes_using_port(port):
    """Find all processes using a specific port"""
    system = platform.system()
    processes = []

    try:
        if system == "Darwin":  # macOS
            # Use lsof to find process
            result = subprocess.run(["lsof", "-i", f":{port}", "-t"], capture_output=True, text=True)
            if result.stdout:
                # Get all PIDs
                pids = [pid.strip() for pid in result.stdout.strip().split("\n") if pid.strip()]
                for pid in pids:
                    try:
                        # Get process name
                        name_result = subprocess.run(["ps", "-p", pid, "-o", "comm="], capture_output=True, text=True)
                        process_name = name_result.stdout.strip()
                        processes.append((pid, process_name))
                    except Exception:
                        processes.append((pid, "Unknown"))
        elif system == "Windows":
            # Use netstat for Windows
            result = subprocess.run(["netstat", "-ano", "-p", "tcp"], capture_output=True, text=True)
            for line in result.stdout.split("\n"):
                if f":{port}" in line and "LISTENING" in line:
                    parts = line.split()
                    pid = parts[-1]
                    processes.append((pid, "Unknown (use Task Manager to check)"))
    except Exception as e:
        unreal.log_warning(f"Could not check port usage: {e}")

    return processes


def find_process_using_port(port):
    """Find which process is using a specific port (returns first one)"""
    processes = find_all_processes_using_port(port)
    if processes:
        return processes[0]
    return None, None


def kill_process_on_port(port):
    """Kill all processes using a specific port"""
    processes = find_all_processes_using_port(port)

    if not processes:
        return False

    success = True
    for pid, process_name in processes:
        unreal.log(f"UEMCP: Killing process {process_name} (PID: {pid}) using port {port}")
        try:
            if platform.system() == "Darwin":
                subprocess.run(["kill", "-9", str(pid)], check=True)
                unreal.log(f"UEMCP: Killed process {pid}")
            elif platform.system() == "Windows":
                subprocess.run(["taskkill", "/F", "/PID", str(pid)], check=True)
                unreal.log(f"UEMCP: Killed process {pid}")
        except Exception as e:
            unreal.log_error(f"Failed to kill process {pid}: {e}")
            success = False

    return success


def is_port_available(port):
    """Check if a port is available"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind(("localhost", port))
        return True
    except OSError:
        return False
    finally:
        sock.close()


def check_port_available(port):
    """Alias for is_port_available - check if a port is available for binding"""
    return is_port_available(port)


def wait_for_port_available(port, timeout=5):
    """Wait for a port to become available"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        if is_port_available(port):
            return True
        time.sleep(0.1)
    return False


def force_free_port(port):
    """Force free a port by killing the process using it"""
    if is_port_available(port):
        unreal.log(f"UEMCP: Port {port} is already available")
        return True

    pid, process_name = find_process_using_port(port)
    if not pid:
        unreal.log_warning(f"Port {port} is in use but could not find process")
        return False

    unreal.log(f"UEMCP: Port {port} is used by {process_name} (PID: {pid})")

    # Ask user for confirmation with dialog
    dialog_result = unreal.EditorDialog.show_message(
        "UEMCP Port Conflict",
        f"Port {port} is being used by:\n{process_name} (PID: {pid})\n\nDo you want to kill this process?",
        unreal.AppMsgType.YES_NO,
    )

    if dialog_result == unreal.AppReturnType.YES:
        if kill_process_on_port(port):
            # Wait for port to be freed
            if wait_for_port_available(port):
                unreal.log(f"UEMCP: Successfully freed port {port}")
                return True
            else:
                unreal.log_error(f"Killed process but port {port} is still in use")
                return False
        else:
            unreal.log_error("Failed to kill process")
            return False
    else:
        unreal.log("UEMCP: User cancelled port cleanup")
        return False


def force_free_port_silent(port):
    """Force free a port without user prompts"""
    if is_port_available(port):
        return True

    # Kill all processes using the port
    if kill_process_on_port(port):
        # Wait for port to be freed
        return wait_for_port_available(port, timeout=3)

    return False
