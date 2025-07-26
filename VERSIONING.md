# UEMCP Versioning Strategy

## Version Format

We follow [Semantic Versioning](https://semver.org/) (SemVer): `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes to MCP protocol or UE plugin API
- **MINOR**: New features, backwards-compatible changes
- **PATCH**: Bug fixes, documentation updates

## Version Locations

Version numbers must be synchronized across:

1. **Plugin**: `plugin/UEMCP.uplugin` → `"VersionName": "0.1.0"`
2. **Server**: `server/package.json` → `"version": "0.1.0"`
3. **Git Tags**: `v0.1.0` (with 'v' prefix)

## Release Types

### Production Releases
- Format: `v0.1.0`
- Branch: `main`
- Stability: Production-ready

### Pre-releases
- **Beta**: `v0.2.0-beta.1` - Feature complete, testing needed
- **Alpha**: `v0.2.0-alpha.1` - Early development, unstable
- **RC**: `v0.2.0-rc.1` - Release candidate, final testing

## Release Process

### 1. Version Bump
```bash
# Run version bump script
npm run version:bump -- --type=minor  # or major, patch, beta, alpha

# This updates:
# - plugin/UEMCP.uplugin
# - server/package.json
# - Creates version commit
```

### 2. Create Release
```bash
# Create and push tag
git tag v0.1.0
git push origin v0.1.0

# GitHub Actions will automatically:
# - Build all components
# - Create GitHub release
# - Upload artifacts
```

### 3. Release Artifacts

Each release includes:
- `UEMCP-Plugin-v0.1.0.zip` - Unreal Engine plugin
- `UEMCP-Server-v0.1.0.zip` - MCP server with binaries
- `UEMCP-Full-v0.1.0.zip` - Complete package with docs

## Version History

### v0.1.0 (Initial Release)
- Basic MCP server implementation
- Core UE plugin with Python listener
- Essential tools for asset and actor management
- Foundation for AI-assisted development

### Planned Versions

#### v0.2.0
- [ ] Actor snapping tools
- [ ] Enhanced visual feedback
- [ ] Blueprint creation tools
- [ ] Improved error handling

#### v0.3.0
- [ ] Material editor integration
- [ ] Animation tools
- [ ] Performance profiling
- [ ] Multi-level support

#### v1.0.0
- [ ] Stable API
- [ ] Complete documentation
- [ ] Marketplace ready
- [ ] Full test coverage

## Compatibility Matrix

| UEMCP Version | UE Versions | Node.js | Python |
|---------------|-------------|---------|---------|
| 0.1.x         | 5.3-5.4     | 18+     | 3.11    |
| 0.2.x         | 5.3-5.5     | 18+     | 3.11    |
| 1.0.x         | 5.4+        | 20+     | 3.11    |

## Development Workflow

1. **Feature Branch**: Work on `feature/feature-name`
2. **Version Bump**: Update versions before merging to main
3. **Tag Release**: Only from main branch
4. **Hotfixes**: Use `hotfix/issue-description` → patch release

## Deprecation Policy

- **Minor versions**: Deprecation warnings added
- **Major versions**: Deprecated features removed
- **Support**: Latest minor version + one previous minor