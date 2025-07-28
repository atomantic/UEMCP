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
- **No C++ compilation needed** - Plugin is content-only with Python scripts. We will add C++ later when we need to control a built game/scene.
- **HTTP bridge instead of direct Python** - More reliable communication
- **Simplified deployment** - Just copy plugin folder to UE project

## Phase 4: House Building Experiment - MCP Enhancement Through Practical Application

### Experiment Overview

**Objective**: Build an elaborate house on top of the HouseFoundation in the Home Unreal Project using ModularOldTown assets and other free Fab assets. The primary mission is to discover MCP limitations and enhance the plugin/server capabilities to match what a human can do with the Unreal Engine editor.

**Key Principles**:
1. **MCP-First Development**: When encountering limitations, prioritize fixing/extending MCP functionality over working around constraints. Utilize mcp tools as much as possible, including the python_proxy tool to utilize the full Unreal Engine Python API. If these are insufficient or inefficient, make new custom mcp tool interfaces.
2. **Visual Verification**: Have human operator verify progress at key stages through screenshots
3. **Iterative Enhancement**: Each blocker becomes an opportunity to improve MCP
4. **Minimal Human Intervention**: Only ask user to perform actions that cannot be automated via MCP

### House Building Progress

**Current Status**: Ground floor complete with correct cardinal naming ✅

## House Building Plan and Details

### Map Reference: Content/Maps/HomeWorld
Our test project map is located at Content/Maps/HomeWorld. The HouseFoundation actor provides the base for our building construction.

### Important: Unreal Engine Coordinate System
**Note**: UE's coordinate system is counterintuitive!
- **X- = NORTH** (X decreases going North)
- **X+ = SOUTH** (X increases going South)  
- **Y- = EAST** (Y decreases going East)
- **Y+ = WEST** (Y increases going West)
- **Z+ = UP** (Z increases going Up)

### What's Been Built
- **4 corner pieces** properly positioned and named with cardinal directions:
  - Corner_F1_NE at [10260, 260] (North-East: X-, Y-)
  - Corner_F1_SE at [11260, 260] (South-East: X+, Y-)
  - Corner_F1_SW at [11260, 1060] (South-West: X+, Y+)
  - Corner_F1_NW at [10260, 1060] (North-West: X-, Y+)
- **11 wall pieces** but with gaps and placed incorrectly
- **1 door** not positioned correctly
- **Foundation** at [10760, 660, 80]
- **All actors properly named** (e.g., Wall_Front_1, Corner_F1_SE)
- **All actors organized** in Estate/House/GroundFloor folders
- **Correct corner rotations** with sharp angles pointing outward (SE=0°)

### Original Design Specification

#### House Parameters
- **Foundation Location**: [10760, 690, 80] (already placed in scene)
- **Total Size**: 10m x 8m (1000cm x 800cm)
- **Floors**: 2 stories + roof
- **Grid Unit**: 100cm (1 meter)
- **Wall Height**: 282cm per floor

#### Architectural Layout
```
Ground Floor Layout (Top View):

    Corner_F1_NW ------------ Wall_F1_N_* ------------ Corner_F1_NE
           |                                                |
     Wall_F1_W_*                                        Wall_F1_E_*
           |                                                |
    Corner_F1_SW -- Wall_F1_S_* + Door + Wall_F1_S_* -- Corner_F1_SE
```

### Key Lessons Learned

#### 1. Actor Pivot Points ⚠️
- **Critical Discovery**: ModularOldTown assets use CENTER pivot points, not corner pivots
- **Impact**: All placement calculations must account for half-dimensions
- **Example**: A 300x100 wall at position (X,Y) extends from (X-150, Y-50) to (X+150, Y+50)

#### 2. Actor Naming Requirements 🏷️
- **Problem**: Spawned actors get generic names like "UEMCP_Actor_1753576458"
- **Solution**: Must provide meaningful names when spawning
- **Naming Convention**:
  - Unique: `[Type]_F[FloorNumber]_[Cardinality]` (e.g. Corner_F1_SW)
  - Repeating: `[Type]_F[FloorNumber]_[Cardinality]_[Number]` (e.g. Wall_F1_S_1)

#### 3. Folder Organization Requirements 📁
- **Requirement**: All house actors must be organized in folder structure
- **Path**: `Estate/House/[Component]`
- **Structure**:
  ```
  Estate/
  └── House/
      ├── GroundFloor/
      │   ├── Walls/
      │   ├── Corners/
      │   └── Doors/
      ├── SecondFloor/
      └── Roof/
  ```
- **Implementation**: Use `folder` parameter in actor_spawn

#### 4. Viewport Camera Control 📸
- **Rotation Array**: [Pitch, Yaw, Roll] - NOT [X, Y, Z]
- **Common Mistake**: Using Roll instead of Pitch creates tilted horizon
- **Correct Views**:
  - Top-down: `[-90, 0, 0]` (Pitch=-90)
  - Perspective: `[-30, 45, 0]` (Pitch=-30, Yaw=45)
  - NEVER modify Roll unless creating Dutch angle

#### 5. Asset Path Discoveries 📁
- **Window walls**: Use `SM_FlatWall_2m_SquareWin` (not Window_Square)
- **Door walls**: Use `SM_FlatWall_3m_SquareDoor` (not Door_Square)
- **All paths**: Must include subfolder like `/Walls/` or `/Ground/`

### ModularOldTown Asset Reference

#### Analysis from Old_Town Map
After studying the ModularOldTown/Maps/Old_Town example map, key observations:

1. **Building Construction Pattern**:
   - Buildings use a combination of corner pieces and wall segments
   - Corners are placed first to establish building footprint
   - Walls fill the gaps between corners with precise 300cm intervals
   - Multiple floor levels stack directly on top of each other (Z+282 per floor)

2. **Common Building Components**:
   - **SM_FlatWall_3m**: Standard 3m wall segment
   - **SM_FlatWall_1m_Corner**: Corner pieces for building edges
   - **SM_FlatWall_3m_SquareDoor**: Wall with door opening
   - **SM_FlatWall_3m_ArchedDoorWin**: Wall with arched door and window
   - **SM_FlatWall_3m_SquareDWin**: Wall with square door and window
   - **SM_Floor_2m/1m**: Floor tiles for interior surfaces
   - **SM_SimpleBalcony_A**: Decorative balcony elements

3. **Naming Convention in Old_Town**:
   - Walls: SM_FlatWall_3m2, SM_FlatWall_3m3 (numbered instances)
   - Corners: SM_FlatWall_1m_Corner2, SM_FlatWall_1m_Corner3
   - Floors: SM_Floor_2m10, SM_Floor_2m11 (sequential numbering)

#### Standard Dimensions
| Asset Type | Dimensions (cm) | Grid Size | Notes |
|------------|-----------------|-----------|-------|
| Corner (1m) | 100 x 100 x 282 | 1m x 1m | Used at all building corners |
| Wall 2m | 200 x 100 x 282 | 2m x 1m | For smaller openings |
| Wall 3m | 300 x 100 x 282 | 3m x 1m | Standard wall segment |
| Floor 1m | 100 x 100 x ~7 | 1m x 1m | Thin floor tiles |
| Floor 2m | 200 x 200 x ~7 | 2m x 2m | Larger floor sections |

#### Rotation Rules
- **North-South walls** (along X-axis): `[0, 0, 0]`
- **East-West walls** (along Y-axis): `[0, 0, -90]`
- **Corner rotations** (based on Old_Town observations):
  - NE Corner: `[0, 0, -90]` (faces into building)
  - SE Corner: `[0, 0, 180]` or `[0, 0, 0]` depending on orientation
  - SW Corner: `[0, 0, 90]`
  - NW Corner: `[0, 0, 0]`

### Technical Fixes Applied

#### 1. Viewport API Updates
- Fixed deprecated `editor_set_camera_look_at_location` calls
- Updated to use `UnrealEditorSubsystem()` methods
- Removed invalid wireframe mode method calls

#### 2. Wall Placement Algorithm
```javascript
// Account for center pivot and corner inset
const cornerSize = 100;
const wallThickness = 100;
const inset = cornerSize / 2;

// Example: Front wall placement
const frontY = foundation.y - (houseDepth/2) + (wallThickness/2);
const wallX = foundation.x - (houseWidth/2) + cornerSize + (wallWidth/2);
```

#### 3. Gap Elimination Strategy
1. Delete overlapping walls
2. Calculate precise positions with corner insets
3. Verify with wireframe screenshots
4. Adjust as needed

### Enhanced Architectural Plan for HomeWorld House

Based on the Old_Town analysis, here's our refined plan for the house on HouseFoundation:

#### Design Philosophy
- Use modular construction patterns from Old_Town
- Mix stone walls (SM_FlatStoneWall_*) for ground floor strength
- Use regular walls (SM_FlatWall_*) for upper floors
- Include architectural variety with different window and door types

#### Ground Floor Enhancement (Current Focus)
1. **Replace plain walls with feature walls**:
   - Front: Use SM_FlatWall_3m_SquareDoor for main entrance
   - Sides: Mix SM_FlatWall_3m_SquareWin for windows
   - Back: Consider SM_FlatWall_3m_ArchedWin for character

2. **Add architectural details**:
   - Place SM_SimpleBalcony_A above main entrance
   - Use varied wall textures (stone vs plaster)
   - Consider asymmetric window placement for visual interest

#### Second Floor Design
1. **Structure**:
   - Same corner configuration as ground floor
   - More windows for residential feel
   - Mix of SM_FlatWall_2m_SquareWin and SM_FlatWall_3m_ArchedWin
   - Balcony on front or side using SM_SimpleBalcony_A

2. **Floor Construction**:
   - Use SM_Floor_2m tiles for efficiency (200x200 grid)
   - Fill edges with SM_Floor_1m tiles as needed
   - Total floor area: 10m x 8m = 40-50 floor tiles

#### Roof Design
1. **Components** (if available in ModularOldTown):
   - SM_Roof_3m_Top for main coverage
   - SM_Roof_1m_Edge for perimeter details
   - Corner pieces for proper termination

2. **Alternative** (if roof pieces unavailable):
   - Create flat roof with SM_Floor tiles
   - Add low perimeter walls (SM_FlatWall_1m if exists)
   - Place decorative elements on roof

### Completion Plan

#### Phase 0: Fix Current Issues (Complete) ✅
1. **Clean up misplaced actors**
   - ✅ Deleted actors at Z=-1000
   - ✅ Identified and removed duplicate/overlapping pieces

2. **Fix actor naming and organization**
   - ✅ Renamed all UEMCP_Actor_* to proper names
   - ✅ Moved all house actors to Estate/House folder structure
   - ✅ Used actor_organize tool

3. **Fix wall gaps and rotations**
   - ✅ Identified gap locations
   - ✅ Adjusted wall positions for seamless connections
   - ✅ Fixed corner rotations

4. **Verify ground floor completion**
   - ✅ Took screenshots from multiple angles
   - ✅ Ensured all walls connect properly
   - ✅ Checked corner alignments

#### Phase 1: Second Floor (Next)
1. **Floor/Ceiling Separator**
   - Place SM_Floor_1m tiles (100x100) in 10x8 grid
   - Total: 80 floor pieces at Z = 140 + 282 = 422
   - Use proper naming: `Floor_Tile_[X]_[Y]`
   - Organize in `Estate/House/SecondFloor/Floor`

2. **Second Floor Walls**
   - Duplicate ground floor pattern
   - More windows, fewer solid walls
   - Same corner configuration
   - Proper naming and organization

#### Phase 2: Roof Structure
1. **Roof Base**
   - SM_Roof_3m_Top pieces for main coverage
   - SM_Roof_1m_Edge for perimeter

2. **Roof Details**
   - Corner pieces for proper angles
   - Chimneys if available
   - Decorative elements

#### Phase 3: Details & Polish
1. **Interior Elements**
   - Interior walls for rooms
   - Stairs between floors
   - Basic furniture placement

2. **Exterior Enhancement**
   - Balconies on second floor
   - Window shutters
   - Garden/fence around house

### MCP Enhancement Priority List

**Critical Features** (Block house construction):
1. **Asset Snapping System**: Detect and use socket points for precise placement
   - Implement `actor_spawn_snapped` with grid and socket snapping
   - Add snap tolerance and validation
2. **Asset Query Enhancement**: Get dimensions, sockets, collision bounds
   - Extend `asset_info` with socket information
   - Add bounding box and pivot point data
3. **Batch Operations**: Place multiple similar assets efficiently
   - Implement `actor_spawn_array` for patterns
   - Add `actor_spawn_batch` for multiple placements
4. **Actor Reference Fix**: Reliable actor identification
   - Add `actor_get_info` to get actors by display name
   - Implement actor tagging system
5. **Placement Validation**: Detect gaps and overlaps
   - Add `placement_validate` tool
   - Include collision detection

**Important Features** (Improve workflow):
1. **Viewport Control Fix**: Repair broken viewport tools
   - Fix `viewport_mode` Python API calls
   - Fix `viewport_render_mode` implementation
   - Fix `viewport_focus` camera methods
2. **Blueprint Actor Spawning**: Spawn interactive elements
3. **Material Instance Creation**: Customize asset appearance
4. **Selection Groups**: Work with multiple actors together
5. **Grid Snap Tool**: Enable/disable grid snapping
   - Implement `grid_snap` with configurable grid size
   - Add snap-to-grid for existing actors

**Nice-to-Have Features** (Polish):
1. **Lighting Preview**: See lighting changes in real-time
2. **Physics Simulation**: Test structural integrity
3. **Weather/Time of Day**: Environmental testing
4. **Performance Metrics**: Track frame rate and complexity
5. **Export/Import**: Save house as reusable asset
6. **Measurement Tool**: Measure distances between actors

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

**Example Map Available**: The ModularOldTown package includes `/Content/ModularOldTown/Maps/Old_Town` - a complete example town demonstrating proper usage of all assets. This map is valuable for:
- Learning correct asset placement and rotation patterns
- Understanding how modular pieces connect seamlessly
- Discovering creative combinations and architectural patterns
- Copying specific actor configurations for reuse

**Tip**: Open the Old_Town map to inspect how professionals use these assets, then apply similar patterns to your house construction.

### House Building Experiment Status

The house building experiment has yielded valuable insights and improvements:

**✅ Completed**:
- Ground floor fully constructed with proper alignment
- Critical viewport control issues fixed
- Actor placement mathematics corrected for center pivots
- All gaps eliminated between modular pieces

**📊 Discovered Issues & Solutions**:
1. **Viewport rotation bug** - Fixed Roll/Pitch confusion
2. **Actor naming not applied** - Documented workaround
3. **Asset paths missing subfolders** - Added /Walls/, /Ground/ paths
4. **Mathematical placement failures** - Corrected for center pivots
5. **Screenshot detection timing** - Identified file system lag
6. **Python API method inconsistencies** - `get_actor_label()` works but `get_actor_reference()` doesn't
7. **Actor reference system issues** - Must use display names, not internal references
8. **Viewport control limitations** - Several viewport tools have broken Python API calls
9. **No snap-to-grid functionality** - Manual placement requires exact coordinates
10. **No placement validation** - Can't detect gaps or overlaps programmatically

**Success Metrics**:
- ✅ Ground floor complete with no gaps
- ✅ All actors have meaningful names
- ✅ All actors organized in Estate/House folders
- ⬜ Second floor with windows
- ⬜ Roof properly attached
- ⬜ Interior details added
- ⬜ MCP enhancements documented and implemented

**Immediate Next Steps**:
1. **Test Second Floor Placement** - Use floor tile placement algorithm
2. **Verify Current State** - Check ground floor completion
3. **Continue Construction** - Follow Phase 1-3 plan above
4. **Document New Issues** - Track any MCP limitations discovered

### Best Practices Discovered

#### 1. Always Use Multiple Verification Methods
```python
# After placing actors:
1. Take perspective screenshot
2. Switch to wireframe mode
3. Take top-down screenshot
4. List actors to verify names
5. Check positions mathematically
```

#### 2. Modular Building Patterns
- Walls are typically 300 units (3m) wide
- Corners need specific rotations (0, 90, 180, 270)
- Always place corners first, then fill walls
- Door/window pieces replace wall segments

#### 3. Python API Workarounds
```python
# Finding actors by display name (since get_actor_reference doesn't work):
def get_actor_by_display_name(name):
    for actor in unreal.EditorLevelLibrary.get_all_level_actors():
        if actor.get_actor_label() == name:
            return actor
    return None

# Setting rotation (use set_actor_rotation instead of broken methods):
actor.set_actor_rotation(unreal.Rotator(0, 90, 0))
```

#### 4. Debugging Workflow
```python
# When something looks wrong:
1. Check actor list and positions
2. Use python_proxy to inspect transforms
3. Take wireframe screenshots
4. Calculate expected vs actual positions
5. Use actor_modify to fix issues
```

## Phase 5: FAB Asset Integration - Import and Usage Validation

### Overview

**Objective**: Enable UEMCP to import and use FAB marketplace assets that users have downloaded, providing a streamlined workflow for using FAB content in projects.

**Important Discovery**: Direct FAB marketplace API access is not available through Unreal Engine's Python API. Users must manually download assets from FAB, then we can automate the import and usage.

**Revised Goals**:
1. Create a blank UE project
2. Install UEMCP plugin
3. User manually downloads FAB assets to local folder
4. Use Claude Code to import downloaded FAB assets
5. Place and manipulate imported assets in the level
6. Document the complete workflow for new users

### Fresh Project Setup Flow

#### Step 1: Create Blank Unreal Engine Project
```bash
# User creates new blank project in UE 5.4+
# Project Name: TestFAB
# Location: /path/to/TestFAB
# Template: Blank
# Blueprint/C++: Either (plugin works with both)
```

#### Step 2: Install UEMCP Plugin
```bash
# Clone UEMCP repository
git clone https://github.com/[org]/UEMCP.git

# Run setup script to configure for the new project
cd UEMCP
python scripts/setup.py --project-path /path/to/TestFAB

# Build and install plugin
python scripts/build_plugin.py
```

#### Step 3: Start Claude Code with UEMCP
```bash
# Start the MCP server
npm start

# In UE Python console, start the listener
from uemcp_helpers import *
start_listener()
```

#### Step 4: FAB Asset Import Workflow

**User Prompt Example**:
"I've downloaded some furniture assets from FAB to ~/Downloads/FAB/Furniture. Import them and place them in my level"

**Expected Claude Code Actions**:
1. Use `asset_import` tool to scan the download folder
2. Import assets with proper settings (collision, materials, etc.)
3. Use `asset_list` to verify successful import
4. Use `actor_spawn` to place assets in the level
5. Use `viewport_screenshot` to show results

### New MCP Tools Required

#### 1. Enhanced Asset Import Tool
```typescript
// asset_import - Import downloaded assets
{
  sourcePath: string,
  targetPath: string,
  importOptions?: {
    generateLightmapUVs?: boolean,
    autoGenerateCollision?: boolean,
    materialImportMethod?: string
  }
}
```

### Implementation Plan

#### Phase 5.1: Asset Import Enhancement
1. **Enhance import tool**: Support various asset formats
2. **Handle dependencies**: Textures, materials, etc.
3. **Import validation**: Verify successful import
4. **Error handling**: Clear messages for import failures

#### Phase 5.2: Folder Scanning & Batch Import
1. **Scan local folders**: Detect downloaded FAB assets
2. **Batch import**: Import multiple assets at once
3. **Progress tracking**: Show import progress
4. **Asset organization**: Auto-organize by type

#### Phase 5.3: Documentation & Examples
1. **Getting Started Guide**: Step-by-step fresh project setup
2. **FAB Import Guide**: How to import downloaded FAB assets
3. **Example prompts**: Common import workflows
4. **Best practices**: Folder organization for FAB downloads

### Expected User Experience

```
User: "I just downloaded some medieval furniture from FAB to ~/Downloads/FAB/Medieval. Import them into my project and place a few pieces"

Claude Code:
1. I'll scan the folder for FAB assets
   [Uses asset_import to scan ~/Downloads/FAB/Medieval]
   
2. Found these assets to import:
   - SM_Medieval_Table.fbx (Static Mesh)
   - SM_Medieval_Chair.fbx (Static Mesh)
   - T_Medieval_Wood_D.png (Texture)
   - M_Medieval_Wood.uasset (Material)

3. Importing assets with collision generation...
   [Uses asset_import with proper settings]
   
4. Import successful! Assets are now in /Game/FAB/Medieval/
   
5. Placing a table and chairs in your level
   [Uses actor_spawn for each asset]
   
6. Here's your medieval furniture setup:
   [Uses viewport_screenshot]
```

### Success Metrics

- **Time to First Asset**: < 5 minutes from blank project to placed FAB asset
- **Success Rate**: 90%+ successful FAB downloads and imports
- **User Satisfaction**: Clear workflow, helpful error messages
- **Asset Variety**: Support for meshes, materials, blueprints
- **Documentation Quality**: New users can follow without assistance

### Technical Considerations

#### Import Pipeline Implementation
- Use `unreal.AssetImportTask` for file imports
- Support FBX, OBJ, and other common 3D formats
- Handle texture dependencies automatically
- Generate collision on import for static meshes
- Organize imports into logical folder structure

#### Import Pipeline Challenges
- Asset format compatibility
- Texture path resolution
- Material setup
- LOD handling
- Collision generation

#### Error Scenarios
- Import format not supported
- Missing texture dependencies
- Invalid file paths
- Permission issues
- Memory limitations for large assets
- Naming conflicts with existing assets

### Development Priority

This phase should be prioritized after core MCP functionality is stable because:
1. **High user value**: Streamlines FAB asset workflow
2. **Practical approach**: Works with existing FAB download process
3. **Moderate complexity**: Uses existing UE import APIs
4. **Clear scope**: Import and placement automation

### Integration with Existing Tools

The FAB import feature will enhance existing tools:
- `asset_import`: New tool for importing downloaded assets
- `asset_list`: Will show imported FAB assets
- `actor_spawn`: Can use imported FAB assets directly
- `python_proxy`: Can handle custom import workflows using AssetImportTask

### Key Technical Findings

Based on exploration of the UE Python API:
1. **No FAB API Access**: Cannot search or download from FAB marketplace programmatically
2. **Import Capabilities**: `AssetImportTask` and `AssetToolsHelpers` are available for importing
3. **Workflow**: Download manually → Import via MCP → Use in level
4. **ModularOldTown**: Already exists in the Home project at `/Game/ModularOldTown/`

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
- ✅ Initialize Node.js project with TypeScript
- ✅ Set up Python virtual environment and packaging
- ✅ Create UE plugin structure
- ✅ Configure build tools (npm scripts, Python setup.py)
- ✅ Set up testing frameworks (Jest for TS, pytest for Python)
- ✅ Create basic CI/CD workflow

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
- ✅ Implement basic MCP protocol handlers
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
- ✅ Create UE Python API wrapper
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
- ✅ Implement Priority 1 tools
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
- ✅ Create basic plugin structure
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
6. **Actor Reference System**: `get_actor_reference()` doesn't work with display names
7. **Viewport Control**: Several viewport methods have broken Python API calls
8. **Placement Validation**: No collision detection or gap analysis
9. **Limited Asset Info**: No socket, bounds, or pivot information
10. **Poor Error Recovery**: Generic error messages with no diagnostics

### Python API Issues & Workarounds

**Problem Areas**:
- `get_actor_reference()` fails with friendly names
- `editor_play_in_viewport()` doesn't exist
- `editor_set_camera_look_at_location()` deprecated

**Working Solutions**:
```python
# Use get_actor_label() to find actors by name
for actor in unreal.EditorLevelLibrary.get_all_level_actors():
    if actor.get_actor_label() == "Wall_Front_1":
        # Found the actor

# Use set_actor_rotation() for transforms
actor.set_actor_rotation(unreal.Rotator(0, 90, 0))

# For viewport control, use LevelEditorSubsystem
viewport = unreal.LevelEditorSubsystem.get_viewport()
```

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
