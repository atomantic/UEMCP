"""
UEMCP Command Registry - Manages command registration and dispatch
"""

import inspect
from typing import Any, Callable, Dict, List, Optional, Tuple

from utils import log_debug, log_error


class CommandRegistry:
    """Registry for all MCP commands with automatic handler discovery."""

    def __init__(self):
        self.handlers: Dict[str, Tuple[Callable, List[str], bool]] = {}
        self._operation_classes = {}

    def register_operations(self, operations_instance, prefix: str = ""):
        """Register all methods from an operations class.

        Args:
            operations_instance: Instance of an operations class
            prefix: Optional prefix for command names
        """
        class_name = operations_instance.__class__.__name__
        self._operation_classes[class_name] = operations_instance

        # Get all public methods that don't start with underscore
        for method_name in dir(operations_instance):
            if method_name.startswith("_"):
                continue

            method = getattr(operations_instance, method_name)
            if not callable(method):
                continue

            # Build command name
            if prefix:
                command_name = f"{prefix}_{method_name}"
            else:
                # Extract prefix from class name (e.g., ActorOperations -> actor)
                prefix_from_class = class_name.replace("Operations", "").lower()
                command_name = f"{prefix_from_class}_{method_name}"

            # Get method signature for parameter validation
            sig = inspect.signature(method)
            params = list(sig.parameters.keys())
            # Remove 'self' parameter
            if params and params[0] == "self":
                params = params[1:]

            # Check if validate parameter exists
            has_validate = "validate" in params

            self.handlers[command_name] = (method, params, has_validate)
            log_debug(f"Registered command: {command_name} with params: {params}")

    def register_command(self, name: str, handler: Callable, params: List[str] = None):
        """Register a single command handler.

        Args:
            name: Command name
            handler: Function to handle the command
            params: List of parameter names (auto-detected if None)
        """
        if params is None:
            sig = inspect.signature(handler)
            params = list(sig.parameters.keys())

        has_validate = "validate" in params
        self.handlers[name] = (handler, params, has_validate)
        log_debug(f"Registered command: {name}")

    def dispatch(self, command: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Dispatch a command to its handler.

        Args:
            command: Command name
            params: Parameters for the command

        Returns:
            Result from the command handler
        """
        if command not in self.handlers:
            return {"success": False, "error": f"Unknown command: {command}"}

        handler, expected_params, has_validate = self.handlers[command]

        try:
            # Filter parameters to only include expected ones
            filtered_params = {}
            for param in expected_params:
                if param in params:
                    filtered_params[param] = params[param]

            # Call the handler with filtered parameters
            result = handler(**filtered_params)

            # Ensure result is a dictionary
            if not isinstance(result, dict):
                result = {"success": True, "result": result}

            return result

        except TypeError:
            # Parameter mismatch
            missing_params = [p for p in expected_params if p not in params and p != "validate"]
            return {
                "success": False,
                "error": f"Missing required parameters: {missing_params}",
                "expected": expected_params,
            }
        except Exception as e:
            log_error(f"Command {command} failed: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_command_info(self, command: str) -> Optional[Dict[str, Any]]:
        """Get information about a command.

        Args:
            command: Command name

        Returns:
            Command information or None if not found
        """
        if command not in self.handlers:
            return None

        handler, params, has_validate = self.handlers[command]

        # Get docstring
        doc = handler.__doc__ or "No description available"
        # Clean up docstring
        doc_lines = doc.strip().split("\n")
        description = doc_lines[0].strip()

        return {
            "command": command,
            "description": description,
            "parameters": params,
            "has_validate": has_validate,
            "handler": handler.__name__,
            "module": handler.__module__,
        }

    def list_commands(self) -> List[Dict[str, Any]]:
        """List all registered commands.

        Returns:
            List of command information dictionaries
        """
        commands = []
        for command_name in sorted(self.handlers.keys()):
            info = self.get_command_info(command_name)
            if info:
                commands.append(info)
        return commands


# Global registry instance
_registry = None


def get_registry() -> CommandRegistry:
    """Get or create the global command registry.

    Returns:
        The global CommandRegistry instance
    """
    global _registry
    if _registry is None:
        _registry = CommandRegistry()
    return _registry


def register_all_operations():
    """Register all operation classes with the global registry."""
    registry = get_registry()

    try:
        # Import and register all operations from ops package
        from ops import ActorOperations, AssetOperations, LevelOperations, MaterialOperations, ViewportOperations

        # Register actor operations
        actor_ops = ActorOperations()
        registry.register_operations(actor_ops)

        # Register viewport operations
        viewport_ops = ViewportOperations()
        registry.register_operations(viewport_ops)

        # Register asset operations
        asset_ops = AssetOperations()
        registry.register_operations(asset_ops)

        # Register level operations
        level_ops = LevelOperations()
        registry.register_operations(level_ops)

        # Register material operations
        material_ops = MaterialOperations()
        registry.register_operations(material_ops)

        # Register batch operations
        from ops.batch_operations import execute_batch_operations

        registry.register_command("batch_operations", execute_batch_operations)

        log_debug(f"Registered {len(registry.handlers)} commands")

    except ImportError as e:
        log_error(f"Failed to import operation modules: {str(e)}")
        raise


def dispatch_command(command: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function to dispatch commands through the global registry.

    Args:
        command: Command name
        params: Command parameters

    Returns:
        Command result
    """
    registry = get_registry()
    return registry.dispatch(command, params)
