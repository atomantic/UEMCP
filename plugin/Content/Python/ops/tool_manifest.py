"""
Tool Manifest Generator for Dynamic MCP Registration

Generates complete tool definitions from Python implementations,
allowing Node.js MCP server to dynamically register tools without
maintaining duplicate definitions.
"""

import inspect
from typing import Any, Dict, List, Union, get_args, get_origin

from utils.general import log_debug, log_error


class ManifestGenerator:
    """Generates MCP tool manifest from Python command registry."""

    # Type mapping from Python to JSON Schema
    TYPE_MAPPING = {
        str: "string",
        int: "number",
        float: "number",
        bool: "boolean",
        list: "array",
        dict: "object",
        type(None): "null",
    }

    # Known parameter descriptions for better documentation
    PARAM_DESCRIPTIONS = {
        "assetPath": "Asset path (e.g., /Game/Meshes/SM_Wall01)",
        "location": "World location [X, Y, Z] where X-=North, Y-=East, Z+=Up",
        "rotation": "Rotation [Roll, Pitch, Yaw] in degrees",
        "scale": "Scale [X, Y, Z]",
        "name": "Name for the entity",
        "folder": "World Outliner folder path",
        "validate": "Validate operation success",
        "actorName": "Name of the actor",
        "materialPath": "Path to the material",
        "blueprintPath": "Path to the Blueprint asset",
        "width": "Width in pixels",
        "height": "Height in pixels",
        "code": "Python code to execute",
        "context": "Optional context variables",
        "filter": "Filter pattern",
        "limit": "Maximum number of results",
        "path": "Path to search",
        "recursive": "Search recursively",
        "offset": "Position offset",
        "distance": "Distance value",
        "mode": "Operation mode",
        "compress": "Enable compression",
        "quality": "Quality level (1-100)",
        "screenPercentage": "Screen percentage for rendering",
        "focusActor": "Actor to focus on",
        "targetActor": "Target actor",
        "sourceActor": "Source actor",
        "targetSocket": "Target socket name",
        "sourceSocket": "Source socket name",
        "slotIndex": "Material slot index",
    }

    def __init__(self):
        self.registry = None

    def python_type_to_json_schema(self, python_type: Any) -> Dict[str, Any]:
        """Convert Python type hint to JSON Schema type."""

        # Handle None type
        if python_type is type(None):
            return {"type": "null"}

        # Handle basic types
        if python_type in self.TYPE_MAPPING:
            return {"type": self.TYPE_MAPPING[python_type]}

        # Handle Optional types (Union with None)
        origin = get_origin(python_type)
        if origin is Union:
            args = get_args(python_type)
            # Check if it's Optional (Union with None)
            non_none_types = [t for t in args if t is not type(None)]
            if len(non_none_types) == 1:
                # It's Optional[T], recurse on T
                return self.python_type_to_json_schema(non_none_types[0])
            # Handle other unions
            return {"type": "string"}  # Fallback for complex unions

        # Handle List/list types
        if origin in (list, List):
            args = get_args(python_type)
            if args:
                item_type = self.python_type_to_json_schema(args[0])
                return {"type": "array", "items": item_type}
            return {"type": "array", "items": {"type": "string"}}

        # Handle Dict/dict types
        if origin in (dict, Dict):
            return {"type": "object"}

        # Default fallback
        return {"type": "string"}

    def extract_parameter_info(self, param_name: str, param: inspect.Parameter) -> Dict[str, Any]:
        """Extract parameter information for JSON Schema."""

        schema = {}

        # Get type from annotation
        if param.annotation != inspect.Parameter.empty:
            schema = self.python_type_to_json_schema(param.annotation)
        else:
            schema = {"type": "string"}  # Default type

        # Add description if known
        if param_name in self.PARAM_DESCRIPTIONS:
            schema["description"] = self.PARAM_DESCRIPTIONS[param_name]
        else:
            schema["description"] = f"Parameter {param_name}"

        # Handle default values
        if param.default != inspect.Parameter.empty:
            if param.default is not None:
                # Special handling for list/array defaults
                if isinstance(param.default, (list, tuple)):
                    schema["default"] = list(param.default)
                elif param.default is True or param.default is False:
                    schema["default"] = param.default
                else:
                    schema["default"] = param.default

        # Add array constraints for known coordinate arrays
        if param_name in ["location", "rotation", "scale"] and schema.get("type") == "array":
            schema["minItems"] = 3
            schema["maxItems"] = 3
            schema["items"] = {"type": "number"}

        return schema

    def extract_tool_definition(self, command_name: str, handler, params: List[str]) -> Dict[str, Any]:
        """Extract complete tool definition from handler."""

        # Get function signature and docstring
        sig = inspect.signature(handler)
        docstring = inspect.getdoc(handler) or ""

        # Parse description from docstring
        lines = docstring.strip().split("\n") if docstring else []
        description = lines[0] if lines else f"Execute {command_name}"

        # Clean up description - remove trailing period if present
        description = description.rstrip(".")

        # Build JSON Schema properties
        properties = {}
        required = []

        for param_name in params:
            if param_name in sig.parameters:
                param = sig.parameters[param_name]
                properties[param_name] = self.extract_parameter_info(param_name, param)

                # Check if required (no default value)
                if param.default == inspect.Parameter.empty:
                    required.append(param_name)

        # Determine category from command prefix
        prefix = command_name.split("_")[0]
        category_map = {
            "actor": "actors",
            "asset": "assets",
            "blueprint": "blueprints",
            "material": "materials",
            "viewport": "viewport",
            "level": "level",
            "placement": "actors",
            "batch": "system",
            "help": "system",
            "test": "system",
            "restart": "system",
            "ue": "system",
            "python": "system",
        }
        category = category_map.get(prefix, "system")

        return {
            "name": command_name,
            "description": description,
            "category": category,
            "inputSchema": {
                "type": "object",
                "properties": properties,
                "required": required,
                "additionalProperties": False,
            },
        }

    def generate_manifest(self) -> Dict[str, Any]:
        """Generate complete tool manifest from registry."""

        from uemcp_command_registry import get_registry

        try:
            self.registry = get_registry()
            tools = []
            categories = {}

            # Process each registered command
            for command_name, (handler, params, _has_validate) in self.registry.handlers.items():
                tool_def = self.extract_tool_definition(command_name, handler, params)
                tools.append(tool_def)

                # Add to category
                category = tool_def["category"]
                if category not in categories:
                    categories[category] = []
                categories[category].append(command_name)

            # Sort tools by name for consistency
            tools.sort(key=lambda t: t["name"])

            return {
                "success": True,
                "version": "1.1.0",
                "totalTools": len(tools),
                "tools": tools,
                "categories": categories,
            }

        except Exception as e:
            log_error(f"Failed to generate manifest: {str(e)}")
            import traceback

            return {"success": False, "error": str(e), "traceback": traceback.format_exc()}


# Global manifest generator instance
_generator = None


def get_generator() -> ManifestGenerator:
    """Get or create the global manifest generator."""
    global _generator
    if _generator is None:
        _generator = ManifestGenerator()
    return _generator


def get_tool_manifest() -> Dict[str, Any]:
    """
    Entry point for MCP server to get tool manifest.
    Called by Node.js on startup to discover available tools.
    """
    generator = get_generator()
    manifest = generator.generate_manifest()

    if manifest.get("success"):
        log_debug(f"Generated manifest with {manifest['totalTools']} tools")
    else:
        log_error(f"Manifest generation failed: {manifest.get('error')}")

    return manifest


# Register the manifest command
def register_manifest_operations():
    """Register manifest operations with the command registry."""
    from uemcp_command_registry import get_registry

    registry = get_registry()
    registry.register_command("get_tool_manifest", get_tool_manifest, [])
    log_debug("Registered manifest operations")
