# UEMCP Implementation Plan

## Overview

This document outlines the implementation plan for the Unreal Engine Model Context Protocol (UEMCP) server. The project has evolved from initial scaffolding to a working implementation with full MCP integration.

## Current Status (Updated)

✅ **Phase 1: Foundation & Scaffolding** - COMPLETE
✅ **Phase 2: Basic MCP Implementation** - COMPLETE  
✅ **Phase 3: Python-UE Bridge** - COMPLETE
🚧 **Phase 4: House Building Experiment** - IN PROGRESS

### Implemented Features

- **Working MCP Server** with TypeScript implementation
- **Content-only UE Plugin** (no C++ compilation required)
- **Python HTTP Listener** running inside UE on port 8765
- **Full bidirectional communication** between Claude and UE
- **11 working MCP tools** for UE control
- **Hot reload support** via `restart_listener()`
- **Comprehensive error handling** and diagnostics
- **CI/CD pipeline** with automated testing

### Architecture Changes

The final architecture differs from the original plan:
- **No C++ compilation needed** - Plugin is content-only with Python scripts
- **HTTP bridge instead of direct Python** - More reliable communication
- **Simplified deployment** - Just copy plugin folder to UE project

## Phase 4: House Building Experiment - MCP Enhancement Through Practical Application

### Experiment Overview

**Objective**: Build an elaborate house on top of the HouseFoundation in the Home Unreal Project using ModularOldTown assets and other free Fab assets. The primary mission is to discover MCP limitations and enhance the plugin/server capabilities to match what a human can do with the Unreal Engine editor.

**Key Principles**:
1. **MCP-First Development**: When encountering limitations, prioritize fixing/extending MCP functionality over working around constraints
2. **Visual Verification**: Have human operator verify progress at key stages through screenshots
3. **Iterative Enhancement**: Each blocker becomes an opportunity to improve MCP
4. **Minimal Human Intervention**: Only ask user to perform actions that cannot be automated via MCP

### House Building Progress

**Current Status**: Ground floor in progress ⚠️

The detailed house building plan and progress tracking has been moved to:
📁 **[house-building-scripts/PLAN.md](house-building-scripts/PLAN.md)**

This includes:
- Current build status with identified issues
- Actor naming and folder organization requirements
- Architectural specifications and layout
- Key lessons learned (pivot points, viewport control, asset paths)
- ModularOldTown asset reference with dimensions
- Technical fixes and solutions
- Completion plan for remaining floors
- Helper scripts documentation

### Summary of House Building Phases

#### ⚠️ Phase 4.1: Foundation & Ground Floor - IN PROGRESS
- Multiple wall and corner pieces placed but with issues:
  - Wall gaps between segments
  - Corner rotation problems
  - Generic actor names (UEMCP_Actor_*)
  - No folder organization
- Created comprehensive helper scripts and verification tools
- Identified need for actor naming and organization features

#### ⏳ Phase 4.2: Multi-Story Construction - NEXT
- Add floor/ceiling separator (80 tiles)
- Duplicate ground floor pattern for second story
- Add more windows on upper floor

#### 📋 Phase 4.3-4.5: Remaining Work
- Roof structure with proper angles
- Interior walls and stairs
- Exterior details and environment

See the detailed plan for specific coordinates, scripts, and implementation details.

### MCP Enhancement Priority List

**Critical Features** (Block house construction):
1. **Asset Snapping System**: Detect and use socket points for precise placement
2. **Asset Query Enhancement**: Get dimensions, sockets, collision bounds
3. **Batch Operations**: Place multiple similar assets efficiently
4. **Undo/Redo System**: Recover from placement errors
5. **Asset Search**: Find compatible assets by type/tag/socket

**Important Features** (Improve workflow):
1. **Blueprint Actor Spawning**: Spawn interactive elements
2. **Material Instance Creation**: Customize asset appearance
3. **Viewport Navigation**: Better camera control for inspection
4. **Selection Groups**: Work with multiple actors together
5. **Copy/Paste/Duplicate**: Repeat successful patterns

**Nice-to-Have Features** (Polish):
1. **Lighting Preview**: See lighting changes in real-time
2. **Physics Simulation**: Test structural integrity
3. **Weather/Time of Day**: Environmental testing
4. **Performance Metrics**: Track frame rate and complexity
5. **Export/Import**: Save house as reusable asset

### Development Workflow

1. **Attempt Task**: Try to accomplish house building goal with current MCP
2. **Identify Blocker**: Document what MCP cannot currently do
3. **Design Solution**: Plan MCP enhancement to address limitation
4. **Implement Enhancement**: Update MCP server/plugin with new capability
5. **Test Enhancement**: Verify new feature works correctly
6. **Resume Building**: Continue house construction with enhanced MCP
7. **Human Verification**: Screenshot and confirm progress

### Success Metrics

- **MCP Completeness**: Can build entire house without manual UE editor intervention
- **Feature Coverage**: Number of new MCP tools/capabilities added
- **Workflow Efficiency**: Time to complete common building tasks
- **Visual Quality**: House looks professional and properly constructed
- **Code Quality**: MCP enhancements are well-tested and documented

### Current Focus Areas

Based on available assets in `/Game/ModularOldTown/Meshes/`:
- Wall pieces with various configurations
- Window and door variants  
- Roof components
- Decorative elements
- Structural supports

### House Building Experiment Status

The house building experiment has yielded valuable insights and improvements:

**✅ Completed**:
- Ground floor fully constructed with proper alignment
- Critical viewport control issues fixed
- Actor placement mathematics corrected for center pivots
- Comprehensive helper scripts created
- All gaps eliminated between modular pieces

**📊 Discovered Issues & Solutions**:
1. **Viewport rotation bug** - Fixed Roll/Pitch confusion
2. **Actor naming not applied** - Documented workaround
3. **Asset paths missing subfolders** - Added /Walls/, /Ground/ paths
4. **Mathematical placement failures** - Corrected for center pivots
5. **Screenshot detection timing** - Identified file system lag

**📁 Resources Created**:
- `house-building-scripts/` - All helper scripts and data files
- `house-building-scripts/PLAN.md` - Detailed build documentation
- `modular_dimensions.json` - Asset dimension database
- Multiple verification and fix scripts

For detailed implementation, coordinates, and next steps, see:
📄 **[house-building-scripts/PLAN.md](house-building-scripts/PLAN.md)**

## Phase 1: Foundation & Scaffolding (Week 1-2)

### 1.1 Project Structure Setup

**Deliverable**: Complete project directory structure with build tooling

```bash
UEMCP/
├── package.json                 # Node.js MCP server
├── tsconfig.json               # TypeScript configuration
├── requirements.txt            # Python dependencies
├── pytest.ini                 # Python test configuration
├── .github/workflows/          # CI/CD workflows
├── server/
│   ├── src/
│   │   ├── index.ts           # MCP server entry point
│   │   ├── server.ts          # MCP server implementation
│   │   ├── tools/             # Tool implementations
│   │   └── utils/             # Utility functions
│   └── tests/                 # Server tests
├── plugin/
│   ├── UEMCP.uplugin          # UE plugin descriptor
│   ├── Source/
│   │   └── UEMCP/
│   │       ├── Private/       # C++ implementation
│   │       ├── Public/        # C++ headers
│   │       └── UEMCP.Build.cs # Build configuration
│   └── Content/               # Plugin assets
├── python/
│   ├── uemcp/
│   │   ├── __init__.py
│   │   ├── api.py             # UE Python API wrappers
│   │   ├── tools.py           # Python tool implementations
│   │   └── utils.py           # Utility functions
│   └── tests/                 # Python tests
├── scripts/
│   ├── setup.py               # Project setup script
│   ├── build.py               # Build automation
│   └── test.py                # Test runner
└── docs/
    ├── API.md                 # API documentation
    ├── DEVELOPMENT.md         # Development guide
    └── TESTING.md             # Testing guide
```

**Tasks**:
- [ ] Initialize Node.js project with TypeScript
- [ ] Set up Python virtual environment and packaging
- [ ] Create UE plugin structure
- [ ] Configure build tools (npm scripts, Python setup.py)
- [ ] Set up testing frameworks (Jest for TS, pytest for Python)
- [ ] Create basic CI/CD workflow

### 1.2 MCP Server Foundation

**Deliverable**: Basic MCP server that can accept connections and respond to capability requests

**Implementation**:
```typescript
// server/src/server.ts
export class UEMCPServer {
  private tools: Map<string, MCPTool> = new Map();
  private ueConnection: UEConnection | null = null;
  
  async initialize() {
    // Initialize UE connection
    // Register basic tools
    // Set up error handling
  }
  
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    // Route requests to appropriate handlers
  }
}
```

**Test Strategy**:
- Unit tests for server initialization
- Mock MCP client for testing tool registration
- Integration tests with simple ping/pong operations

**Tasks**:
- [ ] Implement basic MCP protocol handlers
- [ ] Create tool registration system
- [ ] Add logging and error handling
- [ ] Write comprehensive unit tests
- [ ] Create mock UE environment for testing

### 1.3 UE Python Bridge

**Deliverable**: Python module that can communicate with UE Editor and execute basic commands

**Implementation**:
```python
# python/uemcp/api.py
class UEPythonBridge:
    def __init__(self):
        self.editor_subsystem = None
        self._initialize_ue_connection()
    
    def _initialize_ue_connection(self):
        """Initialize connection to UE Editor Python API"""
        try:
            import unreal
            self.editor_subsystem = unreal.EditorSubsystem()
        except ImportError:
            # Fallback for testing without UE
            self.editor_subsystem = MockEditorSubsystem()
    
    def execute_command(self, command: str, **kwargs):
        """Execute UE Python command"""
        pass
    
    def get_project_info(self):
        """Get basic project information"""
        pass
```

**Test Strategy**:
- Mock unreal module for local development
- Integration tests with actual UE Editor
- Command execution validation

**Tasks**:
- [ ] Create UE Python API wrapper
- [ ] Implement mock UE environment for testing
- [ ] Add command validation and error handling
- [ ] Write unit tests with mocks
- [ ] Create integration test suite

## Phase 2: Core Tools Implementation (Week 3-4)

### 2.1 Essential MCP Tools

**Priority 1 Tools** (Must have for MVP):
1. `ue_project_info` - Get project details
2. `ue_list_assets` - Browse project assets
3. `ue_create_blueprint` - Basic Blueprint creation
4. `ue_import_asset` - Simple asset import

**Implementation Pattern**:
```typescript
// server/src/tools/project-info.ts
export class ProjectInfoTool implements MCPTool {
  name = "ue_project_info";
  description = "Get comprehensive project information";
  
  async execute(args: ProjectInfoArgs): Promise<MCPToolResult> {
    const pythonBridge = new PythonBridge();
    const result = await pythonBridge.call('get_project_info', args);
    return { content: result };
  }
}
```

**Test Strategy**:
- Tool-specific unit tests
- End-to-end tests with mock UE project
- Validation of MCP protocol compliance

**Tasks**:
- [ ] Implement Priority 1 tools
- [ ] Create comprehensive test suite for each tool
- [ ] Add input validation and error handling
- [ ] Document tool APIs
- [ ] Create example usage scripts

### 2.2 Python-UE Integration Layer

**Deliverable**: Robust Python layer that handles all UE operations

**Key Components**:
- Asset management operations
- Blueprint manipulation
- Project queries
- Error handling and validation

**Implementation**:
```python
# python/uemcp/tools.py
class UEToolExecutor:
    def __init__(self, bridge: UEPythonBridge):
        self.bridge = bridge
        self.validators = {}
    
    def execute_tool(self, tool_name: str, **kwargs):
        """Execute a UE tool with validation"""
        if tool_name not in self.validators:
            raise ValueError(f"Unknown tool: {tool_name}")
        
        # Validate inputs
        self.validators[tool_name].validate(kwargs)
        
        # Execute tool
        return getattr(self, f"_execute_{tool_name}")(**kwargs)
```

**Tasks**:
- [ ] Implement tool execution framework
- [ ] Add comprehensive input validation
- [ ] Create result serialization system
- [ ] Add error recovery mechanisms
- [ ] Write integration tests

### 2.3 UE Plugin Foundation (Optional for MVP)

**Deliverable**: Basic C++ plugin that can be loaded in UE Editor

**Purpose**: 
- Extend Python API capabilities
- Provide performance-critical operations
- Future advanced features

**Minimal Implementation**:
```cpp
// plugin/Source/UEMCP/Private/UEMCPSubsystem.cpp
UCLASS()
class UEMCP_API UUEMCPSubsystem : public UEditorSubsystem {
    GENERATED_BODY()
    
public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    
    UFUNCTION(BlueprintCallable, Category = "UEMCP")
    FString GetProjectInfo();
    
    UFUNCTION(BlueprintCallable, Category = "UEMCP")
    bool ExecutePythonScript(const FString& Script);
};
```

**Tasks**:
- [ ] Create basic plugin structure
- [ ] Implement essential subsystem
- [ ] Add Blueprint function library
- [ ] Create plugin packaging script
- [ ] Write C++ unit tests

## Phase 3: Testing & Validation (Week 4-5)

### 3.1 Comprehensive Test Suite

**Test Categories**:

1. **Unit Tests** (90%+ coverage target)
   - MCP server components
   - Python tools and utilities
   - C++ plugin functions
   - Input validation

2. **Integration Tests**
   - MCP client-server communication
   - Python-UE Editor interaction
   - Tool execution workflows
   - Error handling scenarios

3. **End-to-End Tests**
   - Complete workflow testing
   - AI client integration
   - Performance benchmarks
   - User scenario validation

**Test Infrastructure**:
```python
# python/tests/conftest.py
@pytest.fixture
def mock_ue_project():
    """Create mock UE project for testing"""
    return MockUEProject(
        name="TestProject",
        assets=["BP_TestActor", "M_TestMaterial"],
        levels=["TestLevel"]
    )

@pytest.fixture
def mcp_server():
    """Create MCP server instance for testing"""
    server = UEMCPServer()
    server.initialize(mock_mode=True)
    return server
```

**Tasks**:
- [ ] Set up test infrastructure
- [ ] Write comprehensive unit tests
- [ ] Create integration test suite
- [ ] Add performance benchmarks
- [ ] Set up automated testing in CI

### 3.2 Mock Environment Setup

**Purpose**: Enable development and testing without requiring UE Editor

**Components**:
- Mock UE Python API
- Sample project structure
- Fake asset database
- Simulated Editor operations

**Implementation**:
```python
# python/uemcp/mocks.py
class MockUnrealModule:
    """Mock unreal module for testing"""
    
    class EditorAssetLibrary:
        @staticmethod
        def list_assets(path: str):
            return MOCK_ASSETS.get(path, [])
    
    class BlueprintLibrary:
        @staticmethod
        def create_blueprint(name: str, parent_class: str):
            return MockBlueprint(name, parent_class)
```

**Tasks**:
- [ ] Create comprehensive mock system
- [ ] Add sample test data
- [ ] Implement mock UE behaviors
- [ ] Create test project templates
- [ ] Document mock usage

### 3.3 Documentation & Examples

**Deliverables**:
- API documentation
- Usage examples
- Development guide
- Testing guide
- Troubleshooting guide

**Tasks**:
- [ ] Generate API documentation
- ✅ Create usage examples
- ✅ Write development setup guide
- ✅ Document testing procedures
- ✅ Create troubleshooting guide

## Integration & Deployment

### Supported AI Clients

- ✅ Claude Desktop (auto-configured by init.js)
- ✅ Claude Code (claude.ai/code) via claude-mcp CLI
- ✅ Cursor IDE
- ✅ Generic MCP clients

### Installation Methods

- **Quick Start**: `node init.js` (2 minutes)
- **Platform Scripts**: init.sh (macOS/Linux), init.ps1 (Windows)
- **Manual Setup**: Available for custom configurations

## Known Limitations & Future Work

### Current Limitations

1. **Asset Snapping**: No automatic socket-based placement
2. **Batch Operations**: Single actor operations only
3. **Blueprint Editing**: Creation only, no graph editing
4. **Material Editing**: No material instance creation
5. **Undo/Redo**: No operation history

### Architecture Benefits

- **No C++ Compilation**: Content-only plugin
- **Hot Reload**: Change code without restarting UE
- **Simple Deployment**: Just copy plugin folder
- **Python-Only**: All logic in Python for easy modification

## Development Workflow Summary

### Adding New Features

1. **Edit Python listener** in `plugin/Content/Python/uemcp_listener.py`
2. **Add MCP tool** in `server/src/tools/`
3. **Test in UE** using `restart_listener()`
4. **Run tests** with `./test-ci-locally.sh`
5. **Commit changes** when tests pass

### Key Files

- **Python Listener**: `plugin/Content/Python/uemcp_listener.py`
- **MCP Tools**: `server/src/tools/*.ts`
- **Integration**: `server/src/services/python-bridge.ts`
- **Tests**: `server/tests/` and `python/tests/`
