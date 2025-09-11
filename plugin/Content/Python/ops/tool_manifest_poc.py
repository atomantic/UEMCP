"""
Proof of Concept: Dynamic Tool Manifest Generation

This demonstrates how Python could generate a complete tool manifest
that Node.js MCP server could use to dynamically register tools.
"""

import inspect
import json
from typing import Any, Dict, List


def python_type_to_json_schema_type(python_type: Any) -> Dict[str, Any]:
    """Convert Python type hint to JSON Schema type."""
    # Handle Optional types
    if hasattr(python_type, "__origin__"):
        if python_type.__origin__ is list or python_type.__origin__ is List:
            return {"type": "array", "items": {"type": "number"}}

    # Handle basic types
    type_mapping = {
        str: "string",
        int: "number",
        float: "number",
        bool: "boolean",
        list: "array",
        dict: "object",
        type(None): "null",
    }

    # For Optional types, extract the actual type
    if hasattr(python_type, "__args__"):
        # Filter out NoneType
        actual_types = [t for t in python_type.__args__ if t is not type(None)]
        if actual_types:
            return python_type_to_json_schema_type(actual_types[0])

    return {"type": type_mapping.get(python_type, "string")}


def extract_tool_metadata(handler, command_name: str) -> Dict[str, Any]:
    """Extract complete metadata from a tool handler function."""

    # Get function signature and docstring
    sig = inspect.signature(handler)
    docstring = inspect.getdoc(handler) or ""

    # Parse description from docstring (first line)
    lines = docstring.strip().split("\n")
    description = lines[0] if lines else f"Execute {command_name}"

    # Generate JSON Schema for parameters
    properties = {}
    required = []

    for param_name, param in sig.parameters.items():
        if param_name in ("self", "cls"):
            continue

        # Get type annotation
        param_type = param.annotation if param.annotation != inspect.Parameter.empty else str

        # Convert to JSON Schema type
        schema_type = python_type_to_json_schema_type(param_type)

        properties[param_name] = {**schema_type, "description": f"Parameter {param_name}"}

        # Check if required (no default value)
        if param.default == inspect.Parameter.empty:
            required.append(param_name)
        elif param.default is not None:
            properties[param_name]["default"] = param.default

    # Build complete tool definition
    return {
        "name": command_name,
        "description": description,
        "inputSchema": {
            "type": "object",
            "properties": properties,
            "required": required,
            "additionalProperties": False,
        },
    }


def generate_tool_manifest() -> Dict[str, Any]:
    """Generate complete tool manifest for all registered commands."""

    from uemcp_command_registry import get_registry

    registry = get_registry()
    tools = []

    # Categorize tools
    categories = {
        "actors": [],
        "assets": [],
        "blueprints": [],
        "materials": [],
        "viewport": [],
        "level": [],
        "system": [],
    }

    for command_name, (handler, _params, _has_validate) in registry.handlers.items():
        # Extract metadata
        tool_def = extract_tool_metadata(handler, command_name)

        # Add to tools list
        tools.append(tool_def)

        # Categorize based on command prefix
        prefix = command_name.split("_")[0]
        category = prefix if prefix in categories else "system"
        categories[category].append(command_name)

    return {"version": "1.1.0", "tools": tools, "categories": categories, "totalTools": len(tools)}


def get_manifest_for_mcp() -> Dict[str, Any]:
    """
    Entry point for MCP server to get tool manifest.
    This would be called by Node.js on startup.
    """
    try:
        manifest = generate_tool_manifest()
        return {"success": True, "manifest": manifest}
    except Exception as e:
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    # Test the manifest generation
    import os
    import sys

    # Add plugin Python path
    plugin_path = os.path.join(os.path.dirname(__file__), "..")
    sys.path.insert(0, plugin_path)

    # Register all operations first
    from ops.system import register_system_operations
    from uemcp_command_registry import register_all_operations

    register_all_operations()
    register_system_operations()

    # Generate and print manifest
    manifest = generate_tool_manifest()
    print(json.dumps(manifest, indent=2))
    print(f"\nTotal tools discovered: {manifest['totalTools']}")
