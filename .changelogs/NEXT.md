# Unreleased Changes

## Added

- 9 new Python unit test files covering all v3.3–v3.8 ops modules: animation, audio, material_graph, datatable, struct_enum, input_system, mesh, pcg, statetree (327 tests total)
- Phase 7 smoke tests in `test-comprehensive-mcp.js` covering all 47 new tools from v3.3–v3.8
- `testToolStrict()` helper in comprehensive MCP test to reduce error-check boilerplate

## Fixed

- PCG plugin crash on `restart_listener()`: `unreal.PCGGraphInterface` type annotation in `pcg.py` was evaluated at import time, causing `AttributeError` that killed the listener. Fixed with `from __future__ import annotations` + `hasattr` import guard (mirrors Niagara pattern)
- PCG tools now registered conditionally — gracefully skipped when PCG plugin is absent, matching Niagara's optional registration pattern
