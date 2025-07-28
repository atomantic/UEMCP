# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-01-28

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

## [0.2.0] - 2025-01-27

### Added
- Enhanced environment designer agent for building construction
- Blueprint developer agent for visual scripting
- MCP plugin developer agent for tool development
- Improved architectural planning documentation

### Changed
- Migrated agent templates to .claude/agents directory
- Enhanced PLAN.md with detailed house building progress

## [0.1.0] - 2025-01-20

### Initial Release
- Core MCP server implementation with TypeScript
- Python listener for Unreal Engine integration
- Content-only UE plugin (no C++ compilation required)
- Basic actor manipulation tools (spawn, modify, delete)
- Level and asset management
- Viewport control and screenshots
- Hot reload support for development

[0.2.1]: https://github.com/atomantic/UEMCP/releases/tag/v0.2.1
[0.2.0]: https://github.com/atomantic/UEMCP/releases/tag/v0.2.0
[0.1.0]: https://github.com/atomantic/UEMCP/releases/tag/v0.1.0