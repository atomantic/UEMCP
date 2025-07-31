# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **batch_spawn Tool**: Spawn multiple actors efficiently in a single operation
  - Reduces overhead compared to individual spawn commands
  - Automatic viewport update batching for better performance
  - Support for common folder organization
  - Batch validation of spawned actors
  - Execution timing information

### Added
- **Enhanced asset_info tool** - Now provides comprehensive asset details:
  - Min/max bounds for precise placement calculations
  - Pivot type detection (center, bottom-center, corner-bottom)
  - Socket information with locations and rotations for snapping
  - Collision data including primitives and complexity
  - Material slots with paths
  - LOD count for static meshes
  - Component information for blueprints

## [0.5.0] - 2025-07-31

### Added
- **Documentation Overhaul**:
  - New `docs/house-building-experiment.md` - Comprehensive learnings from building experiments
  - New `docs/python-api-workarounds.md` - Solutions for UE Python API issues
  - Known Limitations section in README with workarounds
- **Dynamic Tool Registry**: Replaced hardcoded enum with automatic tool discovery
- **actor_organize Tool**: Organize actors into World Outliner folders by pattern

### Changed
- **Major Server Architecture Refactor**:
  - Modularized Node.js server from monolithic structure
  - Separated tools into category-based modules (actors/, viewport/, assets/, etc.)
  - Introduced base classes for common tool patterns
  - 85% code reduction when using dedicated tools vs python_proxy
- **Python Plugin Reorganization**:
  - Moved operation modules to `ops/` directory
  - Moved utilities to `utils/` directory  
  - Proper Python package structure with __init__.py files
  - Consistent import paths throughout
- **Simplified Status Endpoint**: Removed unused command categorization
- **Documentation Cleanup**: Removed 1000+ lines of outdated content from PLAN.md

### Fixed
- **Viewport Tools**: Fixed runtime errors in viewport_focus and other viewport methods
- **Import Path Issues**: Resolved all Python import inconsistencies
- **ESLint Compliance**: Fixed all TypeScript linting errors
- **CI/CD Pipeline**: All tests now pass consistently

### Removed
- Migration artifacts from modular conversion (5 files, ~3000 lines)
- Outdated `uemcp_bridge.py` with non-existent MCP commands
- Unused command categorization system from Python listener

## [0.2.1] - 2025-07-28

### Fixed
- **Critical Rotation Bug Fix**: Standardized rotation format to [Roll, Pitch, Yaw] across entire system
  - Fixed Python listener (`uemcp_listener.py`) to use correct Unreal Engine rotation order
  - Updated all MCP tool descriptions (actor-modify, actor-spawn, viewport-camera) to match
  - Fixed actor.modify return value to use consistent [Roll, Pitch, Yaw] format
  - Updated documentation in PLAN.md and CLAUDE.md with correct rotation examples

### Changed
- Rotation arrays now consistently use [Roll, Pitch, Yaw] = [X, Y, Z] as per Unreal Engine standard
- Wall rotations should use [0, 0, Yaw] pattern (only modify Z-axis rotation)
- Viewport camera rotations updated to prevent tilted horizons from Roll confusion

### Documentation
- Added comprehensive rotation documentation in PLAN.md
- Updated rotation examples for walls, corners, and viewport camera
- Added troubleshooting section for rotation issues

## [0.2.0] - 2025-07-27

### Added
- Enhanced environment designer agent for building construction
- Blueprint developer agent for visual scripting
- MCP plugin developer agent for tool development
- Improved architectural planning documentation

### Changed
- Migrated agent templates to .claude/agents directory
- Enhanced PLAN.md with detailed house building progress

## [0.1.0] - 2025-07-20

### Initial Release
- Core MCP server implementation with TypeScript
- Python listener for Unreal Engine integration
- Content-only UE plugin (no C++ compilation required)
- Basic actor manipulation tools (spawn, modify, delete)
- Level and asset management
- Viewport control and screenshots
- Hot reload support for development

[0.5.0]: https://github.com/atomantic/UEMCP/releases/tag/v0.5.0
[0.2.1]: https://github.com/atomantic/UEMCP/releases/tag/v0.2.1
[0.2.0]: https://github.com/atomantic/UEMCP/releases/tag/v0.2.0
[0.1.0]: https://github.com/atomantic/UEMCP/releases/tag/v0.1.0