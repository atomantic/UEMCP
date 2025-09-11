# Architecture Proposal: Dynamic Tool Discovery

## Overview

Move from static dual-definition of MCP tools to dynamic discovery where Python is the single source of truth.

## Current Problem

Currently, each tool is defined twice:
- **Python**: Implementation + validation decorators
- **Node.js**: MCP registration + JSON Schema + descriptions

This causes:
- Maintenance burden
- Potential drift between definitions
- Extra work when adding new tools
- Possible parameter mismatches

## Proposed Solution

### 1. Python Tool Manifest Endpoint

Python would expose a `/manifest` endpoint that returns complete tool definitions:

```python
# plugin/Content/Python/ops/tool_manifest.py
def get_tool_manifest():
    """Generate complete tool manifest for MCP registration."""
    tools = []
    
    for command_name, (handler, params, has_validate) in registry.handlers.items():
        # Extract metadata from function
        signature = inspect.signature(handler)
        docstring = inspect.getdoc(handler) or ""
        
        # Parse docstring for description and examples
        description, examples = parse_docstring(docstring)
        
        # Generate JSON Schema from type hints
        schema = generate_json_schema(signature)
        
        tools.append({
            "name": command_name,
            "description": description,
            "examples": examples,
            "inputSchema": schema,
            "parameters": params,
            "hasValidate": has_validate
        })
    
    return {
        "version": "1.1.0",
        "tools": tools,
        "categories": categorize_tools(tools)
    }
```

### 2. Enhanced Python Decorators

Decorators would capture all necessary metadata:

```python
from typing import List, Optional
from dataclasses import dataclass

@dataclass
class ToolMetadata:
    description: str
    examples: List[str]
    category: str = "general"

def mcp_tool(
    description: str,
    examples: List[str] = None,
    category: str = "actors"
):
    """Decorator to mark a function as an MCP tool with metadata."""
    def decorator(func):
        func._mcp_metadata = ToolMetadata(
            description=description,
            examples=examples or [],
            category=category
        )
        return func
    return decorator

# Usage example:
@mcp_tool(
    description="Spawn an actor in the level",
    examples=[
        'actor_spawn({ assetPath: "/Game/Meshes/Cube" })',
        'actor_spawn({ assetPath: "/Game/Wall", location: [1000, 500, 0] })'
    ],
    category="actors"
)
@validate_inputs({
    "assetPath": [RequiredRule(), AssetPathRule()],
    "location": [TypeRule(list, length=3)],
    "rotation": [TypeRule(list, length=3)],
    "scale": [TypeRule(list, length=3)],
    "name": [TypeRule(str)],
    "folder": [TypeRule(str)],
    "validate": [TypeRule(bool, default=True)]
})
def spawn(
    self,
    assetPath: str,
    location: Optional[List[float]] = None,
    rotation: Optional[List[float]] = None,
    scale: Optional[List[float]] = None,
    name: Optional[str] = None,
    folder: Optional[str] = None,
    validate: bool = True
) -> dict:
    """Spawn an actor in the level.
    
    Location [X,Y,Z] where X-=North/X+=South, Y-=East/Y+=West, Z+=Up.
    Rotation [Roll,Pitch,Yaw] in degrees.
    """
    # Implementation...
```

### 3. Dynamic Node.js MCP Server

The Node.js server becomes a thin proxy:

```typescript
// server/src/tools/dynamic-registry.ts
export class DynamicToolRegistry {
  private tools: Map<string, DynamicTool> = new Map();
  
  async initialize(pythonBridge: PythonBridge) {
    // Fetch manifest from Python
    const manifest = await pythonBridge.execute({
      type: 'get_tool_manifest',
      params: {}
    });
    
    // Dynamically create tool instances
    for (const toolDef of manifest.tools) {
      const tool = new DynamicTool(toolDef, pythonBridge);
      this.tools.set(toolDef.name, tool);
    }
  }
  
  getTools(): Tool[] {
    return Array.from(this.tools.values());
  }
}

class DynamicTool implements Tool {
  constructor(
    private definition: any,
    private bridge: PythonBridge
  ) {}
  
  async execute(args: any): Promise<any> {
    // Simply forward to Python
    return this.bridge.execute({
      type: this.definition.name,
      params: args
    });
  }
}
```

### 4. JSON Schema Generation from Python Types

```python
def generate_json_schema(signature: inspect.Signature) -> dict:
    """Generate JSON Schema from function signature."""
    properties = {}
    required = []
    
    for param_name, param in signature.parameters.items():
        if param_name == 'self':
            continue
            
        # Get type hint
        type_hint = param.annotation
        
        # Convert Python type to JSON Schema type
        schema_type = python_type_to_json_schema(type_hint)
        
        properties[param_name] = {
            "type": schema_type["type"],
            "description": get_param_description(param_name)
        }
        
        # Add constraints from validation rules
        if param_name in validation_rules:
            add_validation_constraints(properties[param_name], validation_rules[param_name])
        
        # Check if required
        if param.default is inspect.Parameter.empty:
            required.append(param_name)
        else:
            properties[param_name]["default"] = param.default
    
    return {
        "type": "object",
        "properties": properties,
        "required": required
    }
```

## Migration Path

1. **Phase 1**: Add manifest endpoint to Python
2. **Phase 2**: Create dynamic tool loader in Node.js  
3. **Phase 3**: Test with subset of tools
4. **Phase 4**: Migrate all tools to dynamic loading
5. **Phase 5**: Remove static tool definitions from Node.js

## Benefits

1. **Reduced Code**: ~60% less code in Node.js layer
2. **Faster Development**: Add tools in Python only
3. **Better Consistency**: Single definition ensures consistency
4. **Auto-documentation**: Python docstrings become MCP descriptions
5. **Type Safety**: Python type hints generate JSON schemas

## Challenges

1. **Type Safety in TypeScript**: Need to handle dynamic types carefully
2. **Error Handling**: Must gracefully handle manifest fetch failures
3. **Performance**: Initial connection might be slower
4. **Development Experience**: TypeScript IDE support for dynamic tools

## Conclusion

This architecture would significantly simplify UEMCP maintenance and development while ensuring consistency between Python implementation and MCP registration.