# Claude Sub-Agents for UEMCP

This directory contains specialized Claude sub-agents designed to enhance UEMCP development and usage. Each agent has specific expertise and can be invoked using slash commands.

## Available Agents

### 1. `/uemcp-test-runner` - Automated Testing
Runs comprehensive test suites to validate UEMCP functionality.
- Tests all MCP tools
- Validates Python bridge
- Checks error handling
- Generates test reports

**Example**: `/uemcp-test-runner --quick`

### 2. `/ue-builder` - Smart Building Construction
Expert in constructing complex structures using modular assets.
- Understands UE coordinate system
- Handles rotations correctly
- Detects and fixes gaps
- Generates building plans

**Example**: `/ue-builder "Create a two-story tavern with balcony"`

### 3. `/mcp-tool-developer` - Tool Development
Creates new MCP tools and enhances existing ones.
- Analyzes UE Python API
- Generates tool implementations
- Writes comprehensive tests
- Updates documentation

**Example**: `/mcp-tool-developer "Add material management tools"`

### 4. `/ue-debugger` - Visual Debugging
Diagnoses and fixes issues in UE projects.
- Visual gap detection
- Rotation debugging
- Performance profiling
- State analysis

**Example**: `/ue-debugger "Debug wall alignment issues"`

### 5. `/project-scaffolder` - Project Setup
Creates new UE projects with UEMCP integration.
- Project templates
- Asset organization
- Configuration files
- Initial test scenes

**Example**: `/project-scaffolder --template "architectural-viz"`

## Usage Pattern

Each agent follows a consistent invocation pattern:
```
/agent-name [command] [--options]
```

### Common Options
- `--help` - Show agent-specific help
- `--verbose` - Detailed output
- `--dry-run` - Preview without executing
- `--output [format]` - Specify output format

## Integration with UEMCP

These agents are designed to work seamlessly with UEMCP:

1. **They use UEMCP tools** - Agents utilize the MCP tools for their operations
2. **They understand the codebase** - Each agent has deep knowledge of UEMCP structure
3. **They follow conventions** - Naming, organization, and code style
4. **They generate compatible code** - Output works with existing UEMCP

## Creating Custom Agents

To create a new agent:

1. Copy the template:
```bash
cp agent-template.md my-new-agent.md
```

2. Define the agent's:
   - Purpose and capabilities
   - Usage examples
   - Core knowledge
   - Output formats

3. Key sections to include:
   - Purpose
   - Capabilities
   - Usage
   - Core Knowledge/Features
   - Output Examples
   - Integration Notes

## Best Practices

### For Agent Development
1. **Single Responsibility** - Each agent should excel at one thing
2. **Clear Documentation** - Usage should be self-evident
3. **Error Handling** - Gracefully handle edge cases
4. **Testability** - Provide ways to verify agent output

### For Agent Usage
1. **Use the right agent** - Each has specific strengths
2. **Provide context** - More detail = better results
3. **Iterate** - Agents can refine their output
4. **Combine agents** - They work well together

## Example Workflows

### Building a House
```bash
# 1. Plan the structure
/ue-builder --plan-only "Two story house, 4 bedrooms"

# 2. Build it
/ue-builder "Execute the plan"

# 3. Debug any issues
/ue-debugger --visual "Check for gaps"

# 4. Run tests
/uemcp-test-runner --focus "building-integrity"
```

### Adding New Features
```bash
# 1. Develop new tool
/mcp-tool-developer "Create landscape painting tools"

# 2. Test the implementation
/uemcp-test-runner --tool "landscape_paint"

# 3. Debug if needed
/ue-debugger --trace "landscape_paint execution"
```

## Future Agents

Potential agents to develop:
- `/material-wizard` - Advanced material creation
- `/blueprint-assistant` - Blueprint logic helper
- `/performance-optimizer` - Scene optimization
- `/asset-librarian` - Asset organization
- `/animation-choreographer` - Animation sequencing

## Notes

- Agents are Markdown files describing Claude's specialized behavior
- They don't require code changes to UEMCP
- They can be updated independently
- They share knowledge through CLAUDE.md