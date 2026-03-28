"""
UEMCP Command Registry - Manages command registration and dispatch
"""

import inspect
from typing import Any, Callable

from utils import log_debug, log_error


class CommandRegistry:
    """Registry for all MCP commands with automatic handler discovery."""

    def __init__(self):
        self.handlers: dict[str, tuple[Callable, list[str], bool]] = {}
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

    def register_command(self, name: str, handler: Callable, params: list[str] | None = None):
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

    def dispatch(self, command: str, params: dict[str, Any]) -> dict[str, Any]:
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

    def get_command_info(self, command: str) -> dict[str, Any] | None:
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

    def list_commands(self) -> list[dict[str, Any]]:
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

        # Register Blueprint operations (standalone functions)
        from ops import blueprint, blueprint_graph, blueprint_nodes

        registry.register_command("blueprint_create", blueprint.create)
        registry.register_command("blueprint_get_info", blueprint.get_info)
        registry.register_command("blueprint_list_blueprints", blueprint.list_blueprints)
        registry.register_command("blueprint_compile", blueprint.compile)
        registry.register_command("blueprint_document", blueprint.document)

        # Blueprint graph editing operations
        registry.register_command("blueprint_add_variable", blueprint_graph.add_variable)
        registry.register_command("blueprint_remove_variable", blueprint_graph.remove_variable)
        registry.register_command("blueprint_add_component", blueprint_graph.add_component)
        registry.register_command("blueprint_modify_component", blueprint_graph.modify_component)
        registry.register_command("blueprint_add_function", blueprint_graph.add_function)
        registry.register_command("blueprint_remove_function", blueprint_graph.remove_function)
        registry.register_command("blueprint_add_event_dispatcher", blueprint_graph.add_event_dispatcher)
        registry.register_command("blueprint_get_graph", blueprint_graph.get_graph)
        registry.register_command("blueprint_compile_enhanced", blueprint_graph.compile_enhanced)
        registry.register_command("blueprint_implement_interface", blueprint_graph.implement_interface)
        registry.register_command("blueprint_create_interface", blueprint_graph.create_interface)
        registry.register_command("blueprint_discover_actions", blueprint_graph.discover_actions)
        registry.register_command("blueprint_set_variable_default", blueprint_graph.set_variable_default)

        # Blueprint node manipulation operations
        registry.register_command("blueprint_add_node", blueprint_nodes.add_node)
        registry.register_command("blueprint_connect_nodes", blueprint_nodes.connect_nodes)
        registry.register_command("blueprint_disconnect_pin", blueprint_nodes.disconnect_pin)
        registry.register_command("blueprint_remove_node", blueprint_nodes.remove_node)
        registry.register_command("console_command", blueprint_nodes.execute_console_command)

        # Register Niagara VFX operations (standalone functions)
        from ops import niagara

        registry.register_command("niagara_create_system", niagara.create_system)
        registry.register_command("niagara_add_emitter", niagara.add_emitter)
        registry.register_command("niagara_add_module", niagara.add_module)
        registry.register_command("niagara_configure_module", niagara.configure_module)
        registry.register_command("niagara_set_renderer", niagara.set_renderer)
        registry.register_command("niagara_compile", niagara.compile)
        registry.register_command("niagara_spawn", niagara.spawn)
        registry.register_command("niagara_get_metadata", niagara.get_metadata)

        # Register batch operations
        from ops.batch_operations import execute_batch_operations

        registry.register_command("batch_operations", execute_batch_operations)

        log_debug(f"Registered {len(registry.handlers)} commands")

    except ImportError as e:
        log_error(f"Failed to import operation modules: {str(e)}")
        raise


def dispatch_command(command: str, params: dict[str, Any]) -> dict[str, Any]:
    """Convenience function to dispatch commands through the global registry.

    Args:
        command: Command name
        params: Command parameters

    Returns:
        Command result
    """
    registry = get_registry()
    return registry.dispatch(command, params)
