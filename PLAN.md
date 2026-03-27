# UEMCP Development Roadmap

**Purpose**: Development roadmap for UEMCP (Unreal Engine Model Context Protocol).

## Current Focus: v2.1.0 — Modernization & UE 5.5+ Compatibility

### Completed in v2.1.0

- [x] Update MCP SDK from 1.26.0 to 1.28.0
- [x] Migrate deprecated `EditorLevelLibrary` calls to `EditorActorSubsystem`/`UnrealEditorSubsystem` APIs (UE 5.5+ compat)
- [x] Add per-operation configurable timeout (was hardcoded 10s, now supports long ops like screenshots/imports)
- [x] Update dev dependencies (TypeScript, ESLint plugins, tsx, ts-jest)
- [x] Bump version to 2.1.0

### v2.2.0 — Testing & CI Infrastructure

- [ ] Raise Jest global coverage threshold from 2% to 25%+
- [ ] Add per-path coverage gates for services/ and tools/
- [ ] Upload TS and Python coverage to Codecov with separate flags
- [ ] Gate E2E tests behind `ENABLE_E2E=1` env var for CI safety
- [ ] Import real plugin logic in Python tests with Unreal shim
- [ ] Add HybridToolRegistry/DynamicToolRegistry unit tests
- [ ] Add property-based tests with fast-check for validators

### v2.3.0 — Blueprint System Enhancements

- [ ] `blueprint_modify` — Edit Blueprint properties, components, event graphs
- [ ] `blueprint_component_add` — Add components to existing Blueprints
- [ ] `blueprint_variable_set` — Set Blueprint variable values and properties
- [ ] `blueprint_event_create` — Create custom events and bind functions
- [ ] Create complex Blueprint test system in Demo project

### v3.0.0 — Transport & Protocol

- [ ] Add Streamable HTTP transport (MCP SDK supports this now)
- [ ] Return richer MCP content types for media/file outputs (image content in screenshots)
- [ ] Add MCP resource support for project/level metadata
- [ ] WebSocket transport option behind env flag

### Future Roadmap

- Animation Blueprint support
- Material graph editing and node manipulation
- Niagara particle system integration
- Landscape and terrain manipulation
- Multi-user editing support

## Prerequisites

- Node >= 18, npm
- Python 3.11+
- Unreal Engine 5.4+ (5.5+ recommended)

## Validation Checklist

```bash
./test-ci-locally.sh              # Must pass with zero warnings
VERBOSE=true node test-e2e.js     # E2E against Demo project
```
