"""
UEMCP System Operations - System-level commands and utilities

Enhanced with improved error handling framework to eliminate try/catch boilerplate.
"""

import collections
import os
import re
import sys
from typing import Optional

# import importlib
import unreal

from uemcp_command_registry import get_registry

# Enhanced error handling framework
from utils.error_handling import (
    RequiredRule,
    TypeRule,
    handle_unreal_errors,
    safe_operation,
    validate_inputs,
)
from version import VERSION

# Module-level flag to prevent duplicate slate_post_tick_callback registrations
_restart_scheduled = False
# Module-level handle for the pending restart callback (used by force=True to cancel it)
_restart_pending_handle = None


class SystemOperations:
    """Handles system-level operations like help, connection testing, etc."""

    @validate_inputs({"tool": [TypeRule(str, allow_none=True)], "category": [TypeRule(str, allow_none=True)]})
    @handle_unreal_errors("get_help")
    @safe_operation("system")
    def help(self, tool: Optional[str] = None, category: Optional[str] = None):
        """Get help information about UEMCP tools and commands.

        Args:
            tool: Specific tool to get help for
            category: Category of tools to list

        Returns:
            dict: Help information
        """
        # Define tool categories
        tool_categories = {
            "project": ["project_info"],
            "asset": ["asset_list", "asset_info"],
            "actor": [
                "actor_spawn",
                "actor_duplicate",
                "actor_delete",
                "actor_modify",
                "actor_organize",
                "actor_snap_to_socket",
                "batch_spawn",
                "placement_validate",
            ],
            "level": ["level_actors", "level_save", "level_outliner"],
            "viewport": [
                "viewport_screenshot",
                "viewport_camera",
                "viewport_mode",
                "viewport_focus",
                "viewport_render_mode",
                "viewport_bounds",
                "viewport_fit",
                "viewport_look_at",
            ],
            "material": ["material_list", "material_info", "material_create", "material_apply"],
            "blueprint": [
                "blueprint_create",
                "blueprint_list",
                "blueprint_info",
                "blueprint_compile",
                "blueprint_document",
            ],
            "advanced": ["python_proxy"],
            "system": ["test_connection", "restart_listener", "ue_logs", "help"],
        }

        # Define detailed help for each tool
        tool_help = {
            "actor_spawn": {
                "description": "Spawn an actor in the level",
                "parameters": {
                    "assetPath": "Path to asset (e.g., /Game/Meshes/SM_Wall)",
                    "location": "[X, Y, Z] world position (default: [0, 0, 0])",
                    "rotation": "[Roll, Pitch, Yaw] in degrees (default: [0, 0, 0])",
                    "scale": "[X, Y, Z] scale factors (default: [1, 1, 1])",
                    "name": "Actor name (optional)",
                    "folder": "World Outliner folder path (optional)",
                    "validate": "Validate spawn success (default: true)",
                },
                "examples": [
                    'actor_spawn({ assetPath: "/Game/Meshes/SM_Cube" })',
                    'actor_spawn({ assetPath: "/Game/Wall", location: [100, 200, 0], rotation: [0, 0, 90] })',
                ],
            },
            "viewport_camera": {
                "description": "Set viewport camera position and rotation",
                "parameters": {
                    "location": "[X, Y, Z] camera position",
                    "rotation": "[Roll, Pitch, Yaw] camera angles",
                    "focusActor": "Actor name to focus on (overrides location/rotation)",
                    "distance": "Distance from focus actor (default: 500)",
                },
                "examples": [
                    "viewport_camera({ location: [1000, 1000, 500], rotation: [0, -30, 45] })",
                    'viewport_camera({ focusActor: "MyActor", distance: 1000 })',
                ],
            },
            "python_proxy": {
                "description": "Execute arbitrary Python code in Unreal Engine",
                "parameters": {"code": "Python code to execute", "context": "Optional context variables (dict)"},
                "examples": [
                    'python_proxy({ code: "import unreal\\nprint(unreal.SystemLibrary.get_project_name())" })',
                    'python_proxy({ code: "eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)\\n'
                    'result = len(eas.get_all_level_actors())" })',
                ],
            },
            "material_list": {
                "description": "List materials in the project with optional filtering",
                "parameters": {
                    "path": "Content browser path to search (default: /Game)",
                    "pattern": "Filter pattern for material names (optional)",
                    "limit": "Maximum number of materials to return (default: 50)",
                },
                "examples": [
                    'material_list({ path: "/Game/Materials" })',
                    'material_list({ pattern: "Wood", limit: 20 })',
                ],
            },
            "material_info": {
                "description": "Get detailed information about a material",
                "parameters": {"materialPath": "Path to the material (e.g., /Game/Materials/M_Wood)"},
                "examples": ['material_info({ materialPath: "/Game/Materials/M_Wood_Pine" })'],
            },
            "material_create": {
                "description": "Create a new material or material instance",
                "parameters": {
                    "materialName": "Name for new material (creates simple material)",
                    "parentMaterialPath": "Path to parent material (creates material instance)",
                    "instanceName": "Name for new material instance",
                    "targetFolder": "Destination folder (default: /Game/Materials)",
                    "baseColor": "RGB color values {r, g, b} in 0-1 range",
                    "metallic": "Metallic value (0-1)",
                    "roughness": "Roughness value (0-1)",
                    "emissive": "RGB emissive color {r, g, b}",
                    "parameters": "Parameter overrides for material instance",
                },
                "examples": [
                    'material_create({ materialName: "M_Sand", baseColor: {r: 0.8, g: 0.7, b: 0.5}, '
                    "roughness: 0.8 })",
                    'material_create({ parentMaterialPath: "/Game/M_Master", instanceName: "MI_Custom", '
                    "parameters: { BaseColor: {r: 0.5, g: 0.5, b: 0.7} } })",
                ],
            },
            "material_apply": {
                "description": "Apply a material to an actor",
                "parameters": {
                    "actorName": "Name of the actor to apply material to",
                    "materialPath": "Path to the material to apply",
                    "slotIndex": "Material slot index (default: 0)",
                },
                "examples": [
                    'material_apply({ actorName: "Floor_01", materialPath: "/Game/Materials/M_Sand" })',
                    'material_apply({ actorName: "Wall_01", materialPath: "/Game/Materials/M_Brick", '
                    "slotIndex: 1 })",
                ],
            },
            "actor_snap_to_socket": {
                "description": "Snap an actor to another actor's socket for precise modular placement",
                "parameters": {
                    "sourceActor": "Name of actor to snap (will be moved)",
                    "targetActor": "Name of target actor with socket",
                    "targetSocket": "Socket name on target actor",
                    "sourceSocket": "Optional socket on source actor (defaults to pivot)",
                    "offset": "Optional [X, Y, Z] offset from socket position",
                    "validate": "Validate snap operation (default: true)",
                },
                "examples": [
                    'actor_snap_to_socket({ sourceActor: "Door_01", targetActor: "Wall_01", '
                    'targetSocket: "DoorSocket" })',
                    'actor_snap_to_socket({ sourceActor: "Window_01", targetActor: "Wall_02", '
                    'targetSocket: "WindowSocket", offset: [0, 0, 10] })',
                ],
            },
        }

        # If specific tool requested
        if tool:
            if tool in tool_help:
                return {"success": True, "tool": tool, "help": tool_help[tool]}
            else:
                # Try to get info from command registry
                registry = get_registry()
                info = registry.get_command_info(tool)
                if info:
                    return {
                        "success": True,
                        "tool": tool,
                        "help": {
                            "description": info["description"],
                            "parameters": info["parameters"],
                            "has_validate": info["has_validate"],
                        },
                    }
                else:
                    return {"success": False, "error": f"Unknown tool: {tool}"}

        # If category requested
        if category:
            if category in tool_categories:
                return {"success": True, "category": category, "tools": tool_categories[category]}
            else:
                return {
                    "success": False,
                    "error": f'Unknown category: {category}. Valid categories: {", ".join(tool_categories.keys())}',
                }

        # General help
        return {
            "success": True,
            "overview": {
                "description": "UEMCP - Unreal Engine Model Context Protocol",
                "categories": tool_categories,
                "coordinate_system": {"X-": "North", "X+": "South", "Y-": "East", "Y+": "West", "Z+": "Up"},
                "rotation": {
                    "format": "[Roll, Pitch, Yaw] in degrees",
                    "Roll": "Rotation around forward X axis (tilt sideways)",
                    "Pitch": "Rotation around right Y axis (look up/down)",
                    "Yaw": "Rotation around up Z axis (turn left/right)",
                },
            },
        }

    @handle_unreal_errors("test_connection")
    @safe_operation("system")
    def test_connection(self):
        """Test the connection to the Python listener.

        Returns:
            dict: Connection test result
        """
        return {
            "message": "Connection successful",
            "version": VERSION,
            "pythonVersion": sys.version.split()[0],
            "unrealVersion": unreal.SystemLibrary.get_engine_version(),
        }

    @validate_inputs({"force": [TypeRule(bool)]})
    @handle_unreal_errors("restart_listener")
    @safe_operation("system")
    def restart_listener(self, force: bool = False):
        """Restart the Python listener to reload code changes.

        Args:
            force: Force restart even if a restart is already scheduled

        Returns:
            dict: Restart result
        """
        global _restart_scheduled, _restart_pending_handle
        if _restart_scheduled:
            if not force:
                return {
                    "success": True,
                    "message": "Listener restart already scheduled.",
                }
            # force=True: cancel the existing scheduled callback before re-scheduling
            if _restart_pending_handle is not None:
                try:
                    unreal.unregister_slate_post_tick_callback(_restart_pending_handle)
                except Exception:
                    pass
                _restart_pending_handle = None
            _restart_scheduled = False

        # We'll use a counter to ensure we only run once
        restart_counter = [0]  # Use list so we can modify in nested function

        def perform_restart(delta_time):
            global _restart_scheduled, _restart_pending_handle
            # Only run once
            if restart_counter[0] > 0:
                return
            restart_counter[0] += 1

            try:
                unreal.log("UEMCP: Performing scheduled restart...")
                import uemcp_listener

                # Then restart and capture success/failure
                restart_success = bool(uemcp_listener.restart_listener())
                if restart_success:
                    unreal.log("UEMCP: Listener restart completed successfully.")
                else:
                    unreal.log_error("UEMCP: Listener restart reported failure.")
            except Exception as e:
                unreal.log_error(f"UEMCP: Restart error: {str(e)}")
            finally:
                # Always unregister the callback so it doesn't persist on error
                if hasattr(perform_restart, "_handle"):
                    try:
                        unreal.unregister_slate_post_tick_callback(perform_restart._handle)
                    except Exception:
                        pass
                _restart_pending_handle = None
                _restart_scheduled = False

        # Register the callback to run on next tick
        # This ensures the response is sent before restart
        try:
            handle = unreal.register_slate_post_tick_callback(perform_restart)
        except Exception as e:
            _restart_scheduled = False
            unreal.log_error(f"UEMCP: Failed to schedule listener restart: {str(e)}")
            return {
                "success": False,
                "error": f"Failed to schedule listener restart: {str(e)}",
            }
        perform_restart._handle = handle
        _restart_pending_handle = handle
        _restart_scheduled = True

        return {
            "success": True,
            "message": "Listener restart scheduled for next tick.",
        }

    @validate_inputs({"project": [TypeRule(str)], "lines": [TypeRule(int)]})
    @handle_unreal_errors("read_ue_logs")
    @safe_operation("system")
    def ue_logs(self, project: str = "Home", lines: int = 100):
        """Fetch recent lines from the Unreal Engine log file.

        Args:
            project: Project name
            lines: Number of lines to read

        Returns:
            dict: Log lines
        """
        # Validate project name to prevent path traversal
        if not re.match(r"^[A-Za-z0-9_\-]+$", project):
            return {"success": False, "error": f"Invalid project name: {project}"}

        # Coerce and clamp lines to avoid TypeError or confusing behavior
        try:
            lines = int(lines)
        except (TypeError, ValueError):
            lines = 100
        lines = max(1, min(lines, 1000))

        # Construct log file path
        if sys.platform == "darwin":  # macOS
            log_path = os.path.expanduser(f"~/Library/Logs/Unreal Engine/{project}Editor/{project}.log")
        elif sys.platform == "win32":  # Windows
            local_appdata = os.environ.get("LOCALAPPDATA", "")
            if not local_appdata:
                return {"success": False, "error": "LOCALAPPDATA environment variable is not set"}
            log_path = os.path.join(local_appdata, "UnrealEngine", project, "Saved", "Logs", f"{project}.log")
        else:  # Linux
            log_path = os.path.expanduser(f"~/.config/Epic/UnrealEngine/{project}/Saved/Logs/{project}.log")

        if not os.path.exists(log_path):
            return {"success": False, "error": f"Log file not found: {log_path}"}

        # Read last N lines efficiently: single pass with a counter and fixed-size deque
        total_lines = 0
        tail = collections.deque(maxlen=lines)
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                total_lines += 1
                tail.append(line)

        return {
            "success": True,
            "logPath": log_path,
            "lines": list(tail),
            "totalLines": total_lines,
            "requestedLines": lines,
        }

    @validate_inputs({"code": [RequiredRule(), TypeRule(str)], "context": [TypeRule(dict, allow_none=True)]})
    @handle_unreal_errors("execute_python")
    @safe_operation("system")
    def python_proxy(self, code: str, context: Optional[dict] = None):
        """Execute arbitrary Python code in Unreal Engine.

        Args:
            code: Python code to execute
            context: Optional context variables

        Returns:
            dict: Execution result
        """
        # Check kill-switch (default on for backward compat)
        if os.environ.get("UEMCP_ALLOW_PYTHON_PROXY", "1").strip().lower() not in ("1", "true", "yes", "on"):
            return {"success": False, "error": "python_proxy is disabled (UEMCP_ALLOW_PYTHON_PROXY=0)"}

        # Audit log every invocation — walk the stack to skip decorator wrappers
        _DECORATOR_MODULES = {"utils.error_handling", "utils/error_handling", "error_handling", "functools"}
        caller = sys._getframe(1)
        depth = 1
        while depth < 10:
            fname = caller.f_code.co_filename
            if not any(mod in fname for mod in _DECORATOR_MODULES):
                break
            depth += 1
            caller = sys._getframe(depth)
        unreal.log(
            f"UEMCP: python_proxy | caller={caller.f_code.co_filename}:{caller.f_lineno} | code_length={len(code)}"
        )

        # Set up execution context
        _RESERVED_NAMES = frozenset({"unreal", "math", "os", "sys", "result"})
        exec_globals = {"unreal": unreal, "math": __import__("math"), "os": os, "sys": sys, "result": None}

        # Validate and add context variables
        if context:
            for k, v in context.items():
                if not isinstance(k, str):
                    return {"success": False, "error": f"Context keys must be strings, got {type(k).__name__!r}"}
                if k.startswith("__"):
                    return {"success": False, "error": f"Context key {k!r} is rejected: dunder keys are not allowed"}
                if k in _RESERVED_NAMES:
                    return {"success": False, "error": f"Context key {k!r} would overwrite a reserved name"}
                exec_globals[k] = v

        # Execute the code
        exec(code, exec_globals)

        # Get result
        result = exec_globals.get("result", None)

        # Convert result to serializable format
        if result is not None:
            # Handle Unreal types
            if hasattr(result, "__dict__"):
                # Convert to dict - __dict__ is always a dictionary if it exists
                result = {k: v for k, v in result.__dict__.items() if not k.startswith("_")}
            elif isinstance(result, (list, tuple)):
                # Convert any Unreal objects in lists
                result = [str(item) if hasattr(item, "__dict__") else item for item in result]

        return {"success": True, "result": result, "message": "Code executed successfully"}


def register_system_operations():
    """Register system operations with the command registry."""
    registry = get_registry()
    system_ops = SystemOperations()

    # Register with custom names to match existing API
    registry.register_command("help", system_ops.help, ["tool", "category"])
    registry.register_command("test_connection", system_ops.test_connection, [])
    registry.register_command("restart_listener", system_ops.restart_listener, ["force"])
    registry.register_command("ue_logs", system_ops.ue_logs, ["project", "lines"])
    registry.register_command("python_proxy", system_ops.python_proxy, ["code", "context"])
