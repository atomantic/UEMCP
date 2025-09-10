# UEMCP Development Roadmap

**Purpose**: Comprehensive development roadmap for UEMCP (Unreal Engine Model Context Protocol). Prioritized feature development, testing improvements, and infrastructure enhancements.

## Current Focus: Blueprint System Support

The next major development milestone focuses on comprehensive Blueprint editing, creation, and documentation capabilities to enable AI-assisted Blueprint workflows.

## Prerequisites

- Node >= 18, npm
- Python 3.11+ (local ok with 3.10+ but prefer 3.11) for MCP server and tools
- Unreal Engine 5.4+ for full Blueprint functionality
- No network access required beyond CI artifact uploads

## Milestone 1: Blueprint System Support (Priority #1)

### Task: Create complex Blueprint test system in Demo project

- **Edit**: Create test Blueprint hierarchy in `/Game/TestBlueprints/`
- **Do**:
  - Interactive door Blueprint with proximity detection and animation
  - Inventory system with item pickup/drop mechanics
  - Character controller with custom input handling
  - UI system with dynamic menu generation
  - Game state manager with save/load functionality
  - Interconnected Blueprint communication system
- **Validate**: All Blueprints compile, function correctly, and demonstrate complex interactions
- **Done when**: Rich Blueprint ecosystem exists for testing documentation tools

### Task: Add comprehensive Blueprint MCP tools

- **Edit**: Add new tools in `server/src/tools/blueprint/` directory
- **Do**:
  - `blueprint_create` - Create new Blueprint classes with components/variables/functions
  - `blueprint_modify` - Edit Blueprint properties, components, and event graphs
  - `blueprint_list` - List Blueprints with filtering and metadata
  - `blueprint_info` - Get detailed Blueprint structure (components, variables, functions, events)
  - `blueprint_compile` - Compile Blueprint and report compilation status/errors
  - `blueprint_component_add` - Add components to existing Blueprints
  - `blueprint_variable_set` - Set Blueprint variable values and properties
  - `blueprint_event_create` - Create custom events and bind functions
- **Validate**: All tools work with test Blueprints in Demo project; compilation succeeds
- **Done when**: Full Blueprint creation/editing workflow supported via MCP tools

### Task: Add Blueprint documentation generation

- **Edit**: Add `blueprint_document` tool and documentation utilities
- **Do**:
  - Generate markdown documentation for Blueprint structure
  - Include component hierarchy, variable descriptions, function signatures
  - Export event graph flow diagrams as text/ASCII art
  - Support batch documentation of multiple Blueprints
  - Include Blueprint dependencies and references
- **Validate**: Generated docs accurately reflect Blueprint structure and are human-readable
- **Done when**: Complex Blueprint systems can be fully documented automatically

## Milestone 2: Testing & CI Infrastructure

### Task: Raise Jest global threshold and add per-path gates

- **Edit**: `server/jest.config.unit.js`
- **Do**:
  - Set `coverageThreshold.global` to branches/functions/lines/statements: 25
  - Add per-path thresholds for:
    - `src/services/**`: branches 60, functions 60, lines 60, statements 60
    - `src/tools/system/**`: branches 50, functions 50, lines 50, statements 50
    - Keep existing `src/utils/` and `src/tools/base/` entries or tighten slightly if stable
- **Validate**: `cd server && npm run test:coverage` passes; no large regressions
- **Done when**: CI enforces new thresholds and remains green

### Task: Upload TS and Python coverage to Codecov

- **Edit**: `.github/workflows/ci.yml`
- **Do**:
  - Ensure Jest produces `server/coverage/lcov.info`
  - Add pytest coverage XML generation step (e.g., `--cov-report=xml:server/coverage/python/coverage.xml`)
  - Upload both artifacts with Codecov (use flags `typescript`, `python`)
- **Validate**: Codecov PR comment shows both flags; project status uses both
- **Done when**: Codecov displays unified coverage with two flags

## Milestone 3: CI-Safe Integration/E2E

### Task: Gate tests that write local config or require UE

- **Edit**: `tests/integration/test-mcp-integration.js`, `test-e2e.js`, any other UE-dependent scripts
- **Do**:
  - Require `ENABLE_E2E=1` to run; otherwise log and exit 0
  - For config-writing steps (Claude Desktop), also require `ALLOW_CONFIG_WRITE=1` env; else skip
  - Update root `package.json` scripts or docs to reflect opt-in usage
- **Validate**: In CI (without env vars) these tests are skipped and return success; locally they run when env vars set
- **Done when**: CI does not modify developer environments and still runs unit/contract tests

## Milestone 4: Python Tests Against Real Modules (No UE)

### Task: Import real plugin logic with an Unreal shim

- **Edit**: `server/tests/python/conftest.py`, new shim module if needed
- **Do**:
  - Provide a `unreal` shim via fixture/monkeypatch to satisfy imports
  - Update tests to import from `plugin/Content/Python/ops` and `plugin/Content/Python/utils` where feasible (focus on pure logic functions)
  - Keep interaction with real Unreal APIs mocked by the shim
- **Validate**: `cd server && npm run test:python:coverage` generates coverage for real plugin modules
- **Done when**: Pytest `--cov=ops --cov=utils` meaningfully reflects plugin code and passes under `--cov-fail-under`

### Task: Fix Python fixture bug

- **Edit**: `server/tests/python/conftest.py`
- **Do**: Quote the `z` key in `asset_info_response.bounds.origin`
- **Validate**: Pytest imports fixtures successfully
- **Done when**: No syntax/import errors from conftest

## Milestone 5: Resiliency & Property Testing

### Task: Expand PythonBridge resiliency tests

- **Edit**: `server/tests/services/python-bridge.test.ts`
- **Do**:
  - Add cases for: HTTP timeout, invalid JSON, non-200 statuses, transient failures with retry (if implemented), unreachable host
  - Assert meaningful error messages and graceful fallbacks
- **Validate**: Tests cover error paths and increase coverage for `src/services/python-bridge.ts`
- **Done when**: New cases pass and coverage improves

### Task: Property-based tests for validators and type guards

- **Edit**: add `fast-check` dev dependency in `server/package.json`; add tests under `server/tests/unit/**`
- **Do**:
  - Write property tests for `isEnhancedAssetInfo`, path validators, 3-element array validators
  - Generate edge cases (empty, huge values, Unicode, NaN, arrays/objects swap, etc.)
- **Validate**: Tests run quickly and catch malformed shapes; no flakes
- **Done when**: Validator robustness demonstrably increases

## Milestone 6: Test Config & Docs Cleanup

### Task: Normalize Jest configs and folder taxonomy

- **Edit**: `server/jest.config.unit.js`, `server/jest.config.js`, folders under `server/tests/**`
- **Do**:
  - Keep a clear `unit` config (unit + services) and, if needed, a single `integration` config
  - Ensure scripts: `test`, `test:unit`, `test:integration`, `test:python`, `test:coverage` behave predictably
- **Validate**: `npm run test` runs intended layers consistently
- **Done when**: Contributors can infer which tests run from folder names and scripts

### Task: Update strategy docs

- **Edit**: `server/TESTING_STRATEGY.md`
- **Do**: Reflect opt-in E2E, updated thresholds, coverage upload, and folder taxonomy
- **Validate**: Docs match code + CI behavior
- **Done when**: New contributors can follow the doc to run the full stack

## Milestone 7: MCP Interop & Server Simplification

### Task: Add optional alternate transports (HTTP/WebSocket) behind env flags

- **Edit**: `server/src/index.ts`, new transport wiring as needed
- **Do**:
  - Introduce `MCP_TRANSPORT` env var with values `stdio` (default), `http`, `ws`
  - If SDK supports, initialize corresponding transport; otherwise, add a thin HTTP wrapper to expose `tools/list` and `tools/call` JSON-RPC over HTTP for non-stdio clients
- **Validate**: Local smoke test succeeds for selected transport; stdio remains default
- **Done when**: Non-stdio clients can optionally connect; stdio behavior unchanged

### Task: Return richer MCP content types for media/file outputs

- **Edit**: `server/src/utils/response-formatter.ts`, `server/src/tools/viewport/screenshot.ts`
- **Do**:
  - Extend ResponseFormatter to support `image`/`file` entries with path/uri and metadata
  - Update `viewport_screenshot` to include an `image` content item alongside text
- **Validate**: Tool returns both human-readable text and a usable media entry
- **Done when**: Clients can render screenshots directly when supported

### Task: Replace `node-fetch` with native `fetch` in PythonBridge

- **Edit**: `server/src/services/python-bridge.ts`, tests
- **Do**: Remove dependency on `node-fetch`, use global `fetch`, adjust timeouts and error handling
- **Validate**: All PythonBridge tests pass; no regressions
- **Done when**: Dependency removed and behavior equivalent or better

### Task: Create a generic tool forwarder to reduce boilerplate

- **Edit**: Add helper in `server/src/tools/base` and refactor simple tools
- **Do**: Implement a factory that maps `{ name, description, inputSchema, pythonType }` to a tool with standard execution and error handling
- **Validate**: At least 2-3 simple tools (e.g., `level_save`, `project_info`) refactored with identical behavior and cleaner code
- **Done when**: Boilerplate reduced; tests remain green

### Task: Add MCP smoke test for stdio lifecycle

- **Edit**: Add a script under `scripts/` or a Jest test under `server/tests/integration`
- **Do**: Spawn `node dist/index.js`, call `list_tools`, then `call_tool` for `test_connection` or a no-op; assert JSON-RPC success
- **Validate**: Runs in CI (stdio only) and exits cleanly
- **Done when**: CI enforces MCP handshake correctness

### Task: Document client invocation patterns

- **Edit**: `server/TESTING_STRATEGY.md` or `docs/*`
- **Do**: Add a section for invoking UEMCP via Codex (mcp__uemcp__*), Claude Desktop, and optional HTTP/WebSocket transport
- **Validate**: Docs match actual behavior; examples work
- **Done when**: Users can choose transport and call tools confidently

## Future Roadmap (Post-Blueprint)

### Milestone 8: Advanced UE Features
- Animation Blueprint support
- Material graph editing and node manipulation
- Niagara particle system integration
- Audio system tools (Wwise/MetaSounds)
- Landscape and terrain manipulation
- Physics constraint and simulation tools

### Milestone 9: AI/ML Integration
- Training data generation from UE scenes
- Procedural content generation using AI
- Behavior tree learning and optimization
- Asset classification and tagging
- Performance profiling and optimization suggestions

### Milestone 10: Collaboration & Workflow
- Multi-user editing support
- Version control integration (Perforce/Git)
- Asset dependency tracking and visualization
- Automated testing of gameplay mechanics
- Build pipeline integration and automation

## Validation Checklist (Run Locally)

- `cd server && npm ci && npm run lint && npm run typecheck && npm run test:coverage` passes
- `cd server && npm run test:python:coverage` produces coverage HTML and XML; no UE needed
- `ENABLE_E2E=1 UE_PROJECT_PATH=/path/to/Demo node test-e2e.js` runs E2E locally; default run skips E2E

## Success Stories

### Level Debugging with MCP Tools (2025-09-06)

Successfully diagnosed and fixed skydome/sky material error in Calibration level using only MCP tools:

- `level_actors` - Identified 73 actors and filtered to sky-related ones
- `asset_info` - Retrieved detailed mesh/material information for problematic SM_SkySphere  
- `actor_delete` - Removed problematic sky sphere actor causing viewport errors
- `viewport_render_mode` - Verified wireframe mode worked before/after fix
- `level_save` - Preserved the fix permanently

**Result**: Complete level debugging workflow achieved with existing MCP tool coverage. No additional tooling needed.

## Definition of Done (Current Milestone)

### Blueprint System Support:
- Complex Blueprint test system created and functional in Demo project
- All 8+ Blueprint MCP tools implemented and tested
- Blueprint documentation generation produces comprehensive, readable docs
- AI can create, modify, and document Blueprint systems end-to-end
- Integration with existing level editing and asset management tools

### Testing & Infrastructure (Ongoing):
- Jest and Codecov thresholds aligned and enforced; CI green
- Integration/E2E tests opt-in with clear env guards; CI safe by default
- Python tests measure real plugin logic (with shim) and pass coverage gates
- Resiliency and property-based tests increase robustness of error paths
- Test configuration and documentation clear and consistent
- Optional transports and richer content outputs improve interoperability