"""
UEMCP System Operations - System-level commands and utilities
"""

import unreal
import os
import sys
# import importlib
from utils import log_error
from uemcp_command_registry import get_registry


class SystemOperations:
    """Handles system-level operations like help, connection testing, etc."""

    def help(self, tool=None, category=None):
        """Get help information about UEMCP tools and commands.

        Args:
            tool: Specific tool to get help for
            category: Category of tools to list

        Returns:
            dict: Help information
        """
        try:
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
                        'python_proxy({ code: "result = len(unreal.EditorLevelLibrary.get_all_level_actors())" })',
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
                        'roughness: 0.8 })',
                        'material_create({ parentMaterialPath: "/Game/M_Master", instanceName: "MI_Custom", '
                        'parameters: { BaseColor: {r: 0.5, g: 0.5, b: 0.7} } })',
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
                        'slotIndex: 1 })',
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

        except Exception as e:
            log_error(f"Failed to get help: {str(e)}")
            return {"success": False, "error": str(e)}

    def test_connection(self):
        """Test the connection to the Python listener.

        Returns:
            dict: Connection test result
        """
        try:
            return {
                "success": True,
                "message": "Connection successful",
                "version": "1.0.0",
                "pythonVersion": sys.version.split()[0],
                "unrealVersion": unreal.SystemLibrary.get_engine_version(),
            }
        except Exception as e:
            log_error(f"Connection test failed: {str(e)}")
            return {"success": False, "error": str(e)}

    def restart_listener(self, force=False):
        """Restart the Python listener to reload code changes.

        Args:
            force: Force restart even if listener appears offline

        Returns:
            dict: Restart result
        """
        try:
            # Import the restart functionality
            try:
                from uemcp_helpers import restart_listener as helper_restart

                helper_restart()
                return {
                    "success": True,
                    "message": "Listener restart initiated. The listener will restart automatically.",
                }
            except ImportError:
                # Fallback to manual restart
                return {
                    "success": False,
                    "error": "Restart helper not available. Please restart manually from UE Python console.",
                }

        except Exception as e:
            log_error(f"Failed to restart listener: {str(e)}")
            return {"success": False, "error": str(e)}

    def ue_logs(self, project="Home", lines=100):
        """Fetch recent lines from the Unreal Engine log file.

        Args:
            project: Project name
            lines: Number of lines to read

        Returns:
            dict: Log lines
        """
        try:
            # Construct log file path
            if sys.platform == "darwin":  # macOS
                log_path = os.path.expanduser(f"~/Library/Logs/Unreal Engine/{project}Editor/{project}.log")
            elif sys.platform == "win32":  # Windows
                log_path = os.path.join(
                    os.environ["LOCALAPPDATA"], "UnrealEngine", project, "Saved", "Logs", f"{project}.log"
                )
            else:  # Linux
                log_path = os.path.expanduser(f"~/.config/Epic/UnrealEngine/{project}/Saved/Logs/{project}.log")

            if not os.path.exists(log_path):
                return {"success": False, "error": f"Log file not found: {log_path}"}

            # Read last N lines
            with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                all_lines = f.readlines()
                recent_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines

            return {
                "success": True,
                "logPath": log_path,
                "lines": recent_lines,
                "totalLines": len(all_lines),
                "requestedLines": lines,
            }

        except Exception as e:
            log_error(f"Failed to read logs: {str(e)}")
            return {"success": False, "error": str(e)}

    def python_proxy(self, code, context=None):
        """Execute arbitrary Python code in Unreal Engine.

        Args:
            code: Python code to execute
            context: Optional context variables

        Returns:
            dict: Execution result
        """
        try:
            # Set up execution context
            exec_globals = {"unreal": unreal, "math": __import__("math"), "os": os, "sys": sys, "result": None}

            # Add context variables if provided
            if context:
                exec_globals.update(context)

            # Execute the code
            exec(code, exec_globals)

            # Get result
            result = exec_globals.get("result", None)

            # Convert result to serializable format
            if result is not None:
                # Handle Unreal types
                if hasattr(result, "__dict__"):
                    # Try to convert to dict
                    try:
                        result = {k: v for k, v in result.__dict__.items() if not k.startswith("_")}
                    except Exception:
                        result = str(result)
                elif isinstance(result, (list, tuple)):
                    # Convert any Unreal objects in lists
                    result = [str(item) if hasattr(item, "__dict__") else item for item in result]

            return {"success": True, "result": result, "message": "Code executed successfully"}

        except Exception as e:
            log_error(f"Python proxy execution failed: {str(e)}")
            return {"success": False, "error": str(e), "traceback": __import__("traceback").format_exc()}


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
