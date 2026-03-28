---
name: uemcp-manifest-type-hints
description: |
  Fix silent tool registration failures in UEMCP when Python function parameters use
  modern union syntax (str | None) instead of Optional[str]. Use when: (1) MCP tools
  silently lose optional parameters in their JSON schema, (2) new ops module parameters
  all show as required when they should be optional, (3) manifest generator falls through
  to string type for Optional parameters. The manifest generator's get_origin() check
  only matches typing.Union, not types.UnionType from Python 3.10+ pipe syntax.
author: Claude Code
version: 1.0.0
date: 2026-03-28
---

# UEMCP Manifest Generator Type Hint Compatibility

## Problem
The UEMCP dynamic tool manifest generator (`plugin/Content/Python/ops/tool_manifest.py`)
uses `typing.get_origin()` to detect `Optional[T]` parameters and generate correct JSON
Schema. Python 3.10+ introduced `str | None` as shorthand for `Optional[str]`, but these
produce `types.UnionType` — which `typing.get_origin()` does NOT recognize as `Union`.

This means parameters typed as `str | None` silently fall through to the default
`{"type": "string"}` without being detected as optional, causing them to appear as
required in the MCP tool schema.

## Context / Trigger Conditions
- Adding new ops modules to UEMCP with Python 3.10+ type hints
- Parameters using `X | None` instead of `Optional[X]`
- Tools appear in manifest but optional parameters show as required
- No error is raised — the failure is completely silent

## Solution

**For PARAMETER type hints** (processed by the manifest generator): Always use
`Optional[X]` from `typing`, never `X | None`:

```python
from typing import Any, Optional

def my_tool(
    required_param: str,           # Required - no default
    optional_param: Optional[str] = None,  # Correctly detected as optional
    # NOT: optional_param: str | None = None  # BROKEN - silently treated as required string
) -> dict[str, Any]:  # Return types are fine with modern syntax
    ...
```

**For RETURN type hints** (not processed by the manifest generator): Modern syntax
is fine — use `dict[str, Any]`, `list[str]`, etc.

## Why This Happens

```python
# tool_manifest.py line 79-80
origin = get_origin(python_type)
if origin is Union:  # Only matches typing.Union, NOT types.UnionType
```

- `get_origin(Optional[str])` returns `typing.Union` (match)
- `get_origin(str | None)` returns `types.UnionType` (no match)

The parameter falls through all checks and hits the default: `return {"type": "string"}`

## Verification

After adding a new ops module, check the manifest output:
```python
from ops.tool_manifest import get_tool_manifest
manifest = get_tool_manifest()
# Find your tool and verify optional params are NOT in the "required" array
tool = next(t for t in manifest['tools'] if t['name'] == 'your_tool_name')
print(tool['inputSchema']['required'])  # Should not include optional params
```

## Notes
- This affects ALL ops modules in the UEMCP project, not just new ones
- The fix would be to also check `origin is types.UnionType` in tool_manifest.py,
  but until that's done, use `Optional[X]` consistently for parameters
- `Dict`, `List` from typing can safely be replaced with `dict`, `list` in all
  positions since `get_origin(dict[str, Any])` correctly returns `dict`
- Only `Union`/`Optional` has this asymmetry between typing and built-in syntax
