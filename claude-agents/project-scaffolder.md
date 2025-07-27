# Project Scaffolder Agent

## Purpose
Quickly scaffold and configure new Unreal Engine projects with UEMCP integration, proper folder structures, and commonly needed assets.

## Capabilities
- Create new UE projects with optimal settings
- Set up UEMCP plugin and configuration
- Import commonly used asset packs
- Configure project folder structure
- Set up version control ignore files
- Create initial test scenes
- Generate project documentation

## Usage
```
/project-scaffolder "Create FPS game project"
/project-scaffolder --template "architectural-viz"
/project-scaffolder --minimal "Basic UEMCP test project"
```

## Project Templates

### 1. Architectural Visualization
```
Project Structure:
/Content
  /Architecture
    /Materials
    /Meshes
    /Blueprints
  /Environment
    /Lighting
    /Landscape
    /Foliage
  /UEMCP
    /TestScenes
    /Scripts
```

Settings:
- Ray tracing enabled
- High quality lighting
- Realistic rendering
- ModularBuilding assets

### 2. Game Development
```
Project Structure:
/Content
  /Characters
  /Gameplay
  /UI
  /Audio
  /VFX
  /UEMCP
    /Automation
    /Debug
```

Settings:
- Optimized for runtime
- Basic starter content
- Input system configured
- Collision presets

### 3. Virtual Production
```
Project Structure:
/Content
  /Stages
  /Cameras
  /Lighting
  /GreenScreen
  /UEMCP
    /CameraControl
    /Sequencer
```

Settings:
- nDisplay ready
- Camera tracking
- Real-time compositing
- High resolution support

## Setup Workflow

### 1. Project Creation
```python
# Create UE project with settings
def create_project(name, template, location):
    # Configure engine version
    # Set project settings
    # Create directory structure
    # Generate .uproject file
```

### 2. UEMCP Integration
```python
# Set up UEMCP plugin
def setup_uemcp():
    # Copy plugin files
    # Configure Python paths
    # Set up MCP config
    # Test connection
```

### 3. Asset Configuration
```python
# Import and organize assets
def configure_assets(template):
    # Import template assets
    # Set up material library
    # Configure blueprints
    # Create example scenes
```

## Configuration Files

### .gitignore Template
```
# Unreal Engine
Saved/
Intermediate/
Binaries/
Build/
*.sln
*.xcworkspace

# UEMCP
uemcp_cache/
test_results/
debug_logs/

# OS
.DS_Store
Thumbs.db
```

### Project Settings
```ini
[/Script/EngineSettings.GameMapsSettings]
EditorStartupMap=/Game/UEMCP/TestScenes/EmptyTestScene
GameDefaultMap=/Game/UEMCP/TestScenes/EmptyTestScene

[/Script/UnrealEd.ProjectPackagingSettings]
BlueprintNativizationMethod=Disabled
bIncludePrerequisites=True
```

### UEMCP Config
```json
{
  "project": {
    "name": "${PROJECT_NAME}",
    "version": "0.1.0",
    "uemcp_version": "1.0.0"
  },
  "settings": {
    "auto_start_listener": true,
    "debug_mode": false,
    "screenshot_quality": 60
  }
}
```

## Test Scene Generation

### Basic Test Scene
- Grid floor (20x20m)
- Directional light (sun)
- Sky atmosphere
- Example actors
- Debug markers

### Building Test Scene
- Foundation platform
- Modular wall examples
- Corner rotation tests
- Gap detection setup
- Organization structure

### Performance Test Scene
- 1000+ actor stress test
- LOD testing setup
- Lighting scenarios
- Material complexity

## Documentation Generation

### README.md Template
```markdown
# ${PROJECT_NAME}

## Overview
${PROJECT_DESCRIPTION}

## UEMCP Integration
This project uses UEMCP for AI-assisted development.

### Quick Start
1. Open project in Unreal Engine
2. UEMCP listener starts automatically
3. Connect your AI assistant

### Project Structure
- `/Content/Architecture` - Building assets
- `/Content/UEMCP` - UEMCP test scenes
...
```

### CLAUDE.md Additions
```markdown
## Project-Specific Information

### Asset Libraries
- ModularOldTown: Medieval building kit
- [Custom assets listed here]

### Naming Conventions
- ${PROJECT_SPECIFIC_RULES}

### Common Operations
- ${PROJECT_SPECIFIC_COMMANDS}
```

## Validation Checklist
- [ ] Project creates successfully
- [ ] UEMCP plugin loads
- [ ] Python listener starts
- [ ] Test scene renders
- [ ] Version control configured
- [ ] Documentation generated
- [ ] Assets organized properly
- [ ] Settings optimized for use case