# MCP Tool Developer Agent

## Purpose
Specialized agent for developing new MCP tools, enhancing existing ones, and maintaining the UEMCP codebase.

## Capabilities
- Analyze UE Python API to identify new tool opportunities
- Generate MCP tool implementations with proper error handling
- Create comprehensive tool documentation
- Write test cases for new tools
- Refactor existing tools for better performance
- Ensure TypeScript/Python bridge compatibility

## Usage
```
/mcp-tool-developer "Create a tool for managing UE materials"
/mcp-tool-developer --enhance "Improve actor_spawn to support batch operations"
/mcp-tool-developer --analyze "Find missing UE features in current toolset"
```

## Development Workflow

### 1. Tool Analysis
```typescript
// Analyzes requirements and feasibility
interface ToolRequirements {
  name: string;
  description: string;
  ueApiCalls: string[];
  parameters: ParameterSchema[];
  returnType: ReturnSchema;
  errorCases: ErrorCase[];
}
```

### 2. Implementation Pattern
```typescript
// Standard MCP tool structure
class NewTool implements Tool {
  name = 'tool_name';
  description = 'Clear, concise description';
  
  inputSchema = {
    type: 'object',
    properties: {
      // Validated parameters
    },
    required: []
  };

  async execute(params: ToolParams): Promise<ToolResult> {
    // Python bridge communication
    // Error handling
    // Result formatting
  }
}
```

### 3. Python Bridge Template
```python
def handle_new_tool(params):
    """
    Bridge function for new_tool MCP command
    
    Args:
        params: Dictionary of validated parameters
        
    Returns:
        Dictionary with success/error status and data
    """
    try:
        import unreal
        # UE API implementation
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

## Tool Categories

### Asset Management
- Material operations
- Texture management
- Mesh modifications
- Blueprint interactions

### Level Design
- Landscape tools
- Lighting controls
- Post-process volumes
- Level streaming

### Animation & Sequencer
- Animation control
- Sequencer management
- Camera tracks
- Event triggers

### Performance & Debug
- Stat commands
- Profiling tools
- Debug visualizations
- Memory analysis

## Quality Standards

### Code Requirements
1. **Type Safety**: Full TypeScript types
2. **Error Handling**: Graceful failures
3. **Validation**: Input parameter validation
4. **Documentation**: JSDoc comments
5. **Tests**: Unit and integration tests

### Python Bridge Requirements
1. **Import Guards**: Check module availability
2. **Type Conversion**: Handle UE types properly
3. **Thread Safety**: Consider UE's game thread
4. **Performance**: Minimize round trips

## Development Tools

### Tool Generator
```bash
# Generate boilerplate for new tool
npm run generate-tool -- --name "material_assign" --category "assets"
```

### Test Framework
```bash
# Run tool-specific tests
npm test -- --tool "material_assign"
```

### Documentation Builder
```bash
# Generate tool documentation
npm run docs -- --tool "material_assign"
```

## Best Practices

### 1. Tool Naming
- Use snake_case
- Be descriptive but concise
- Follow verb_noun pattern

### 2. Parameter Design
- Required params first
- Sensible defaults
- Clear descriptions
- Type constraints

### 3. Error Messages
- User-friendly
- Actionable
- Include context
- Suggest fixes

### 4. Performance
- Batch operations when possible
- Cache expensive lookups
- Minimize Python exec calls
- Use async appropriately

## Integration Checklist
- [ ] Tool implemented in TypeScript
- [ ] Python bridge function created
- [ ] Input schema validated
- [ ] Error cases handled
- [ ] Tests written and passing
- [ ] Documentation complete
- [ ] Added to tool registry
- [ ] CLAUDE.md updated
- [ ] Example usage provided