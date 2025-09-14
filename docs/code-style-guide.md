# Code Style Guide

Comprehensive code standards for the UEMCP project.

## General Principles

### Line Endings
**IMPORTANT**: Always use LF (Unix-style) line endings, not CRLF (Windows-style):
- Git is configured to warn about CRLF line endings
- All files should use `\n` not `\r\n`
- This prevents cross-platform issues and git warnings

### File Formatting
- Use spaces, not tabs (except in Makefiles)
- 2 spaces for JavaScript/TypeScript
- 4 spaces for Python
- No trailing whitespace
- Files should end with a single newline

### Exception Handling Philosophy

**CRITICAL**: Minimize use of try/catch and try/except blocks:

- **Avoid try/catch unless absolutely necessary** - Only use for extreme cases like `JSON.parse()` when you really don't trust the JSON being parsed
- **Prefer data validation and error handling** for predictable failure cases
- **Use type guards and validation** instead of catching exceptions
- **Handle expected errors explicitly** rather than wrapping in try/catch

**Good practices:**
```typescript
// ✅ GOOD: Validate data structure before use
if (!isValidConfig(config)) {
  throw new Error('Invalid configuration structure');
}

// ✅ GOOD: Check for expected conditions
if (port < 1 || port > 65535) {
  throw new Error(`Invalid port: ${port}`);
}
```

**Avoid these patterns:**
```typescript
// ❌ AVOID: Try/catch for predictable validation
try {
  const result = processData(data);
} catch (error) {
  throw new Error('Data processing failed');
}

// ❌ AVOID: Broad exception handling
try {
  // complex logic
} catch (error) {
  // generic error handling
}
```

**Acceptable use cases for try/catch:**
- Parsing untrusted JSON with `JSON.parse()`
- File system operations that may fail
- Network requests that may timeout
- Third-party library calls that may throw unpredictably

## TypeScript Code Standards

**CRITICAL**: Follow these standards to avoid common code review issues:

### Type Safety
- **NEVER use `any` type** without eslint-disable comment and justification
- Define proper interfaces for all data structures
- Use type guards for runtime validation
- Prefer `unknown` over `any` when type is truly unknown

```typescript
// ❌ WRONG
protected formatData(info: Record<string, any>) { }
info.sockets.forEach((socket: any) => { })

// ✅ RIGHT
interface SocketInfo {
  name: string;
  location: Vec3;
  rotation: { roll: number; pitch: number; yaw: number; };
}
protected formatData(info: EnhancedAssetInfo) { }
info.sockets.forEach((socket: SocketInfo) => { })
```

### Type Assertions
- **NEVER use unsafe type assertions** like `as unknown as Type`
- Always validate data structure before use
- Create type guard functions when needed

```typescript
// ❌ WRONG
return this.formatEnhancedAssetInfo(result as unknown as EnhancedAssetInfo);

// ✅ RIGHT
if (!isEnhancedAssetInfo(result)) {
  throw new Error('Invalid asset info structure');
}
return this.formatEnhancedAssetInfo(result, args.assetPath);
```

### Interface Design
- Use specific optional properties instead of index signatures
- Document complex interfaces with JSDoc comments
- Group related properties together

```typescript
// ❌ WRONG
interface Data {
  [key: string]: unknown;  // Too broad
}

// ✅ RIGHT
interface Data {
  assetType?: string;
  bounds?: BoundsInfo;
  additionalProperties?: Record<string, unknown>; // For truly dynamic data
}
```

### Tool Descriptions
- Keep tool descriptions concise (under 100 characters ideal)
- Focus on key capabilities, not implementation details
- Use active voice

```typescript
// ❌ WRONG (too verbose)
description: 'Get asset details (dimensions, materials, etc). asset_info({ assetPath: "/Game/Meshes/SM_Wall" }) returns bounding box size. Essential for calculating placement!',

// ✅ RIGHT (concise)
description: 'Get comprehensive asset details including bounds, pivot, sockets, collision, and materials.',
```

## Python Code Standards

**CRITICAL**: Follow these standards to pass CI checks:

### Constants
- Define magic numbers as named constants
- Use UPPER_CASE for constants
- Place constants at class or module level

```python
# ❌ WRONG
if abs(origin.z + box_extent.z) < 0.1:

# ✅ RIGHT
PIVOT_TOLERANCE = 0.1
if abs(origin.z + box_extent.z) < self.PIVOT_TOLERANCE:
```

### Exception Handling
- **AVOID try/except whenever possible** - Use data validation and proper error handling instead
- Only use try/except in extreme cases like JSON.parse when you really don't trust the data being parsed
- When you must use try/except, **NEVER use bare `except:`** or `except Exception:`
- Catch specific exceptions and log errors with context
- Prefer proactive validation over reactive exception handling

```python
# ❌ WRONG - Using try/except for normal flow control
try:
    result = some_operation(data)
except Exception:
    result = None

# ✅ BETTER - Validate first, then operate
if not is_valid_data(data):
    log_error(f"Invalid data provided: {data}")
    return None
result = some_operation(data)

# ✅ ACCEPTABLE - Only for truly unpredictable external data
try:
    parsed = json.loads(untrusted_json_string)
except json.JSONDecodeError as e:
    log_error(f"Failed to parse JSON: {e}")
    return None
```

### Line Continuations
- Use parentheses for multi-line expressions
- Avoid backslash line continuations

```python
# ❌ WRONG
collision_info['hasSimpleCollision'] = len(box_elems) > 0 or \
                                      len(sphere_elems) > 0

# ✅ RIGHT
collision_info['hasSimpleCollision'] = (
    len(box_elems) > 0 or
    len(sphere_elems) > 0
)
```

### Type Annotations
- Always add type hints for function parameters
- Use proper imports from `typing` module
- Document complex types

```python
# ❌ WRONG
def process_data(data):

# ✅ RIGHT
from typing import Dict, List, Optional
def process_data(data: Dict[str, any]) -> Optional[List[str]]:
```

### Import Organization
- Remove unused imports
- Group imports: standard library, third-party, local
- Avoid wildcard imports in production code

```python
# ❌ WRONG
from utils import *
import sys  # unused

# ✅ RIGHT
from utils import load_asset, asset_exists, log_error
```

## Common Code Review Fixes

1. **"Using 'any' type"**: Add proper interface or use type guard
2. **"Magic number"**: Extract to named constant
3. **"Broad exception"**: Catch specific exceptions
4. **"Type assertion unsafe"**: Validate before use
5. **"Unused import"**: Remove it
6. **"Line too long"**: Break into multiple lines with proper indentation
7. **"Multiple len() calls"**: Only optimize if performance-critical

## Pre-Commit Checklist

Before committing, always run `./test-ci-locally.sh` and ensure:
- ✅ No ESLint errors (TypeScript)
- ✅ No type checking errors (tsc)
- ✅ No flake8 errors (Python)
- ✅ No mypy errors (Python type checking)
- ✅ All tests pass