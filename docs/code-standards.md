# UEMCP Code Standards

This document provides comprehensive coding standards for the UEMCP project to ensure consistency and avoid common code review issues.

## Table of Contents

- [TypeScript Standards](#typescript-standards)
- [Python Standards](#python-standards)
- [Common Anti-Patterns](#common-anti-patterns)
- [Pre-Commit Checklist](#pre-commit-checklist)

## TypeScript Standards

### Type Safety

#### 1. Avoid `any` Type

The `any` type defeats TypeScript's type safety. Always use proper types or interfaces.

```typescript
// ❌ BAD: Using any
function processData(data: any) {
  return data.value;
}

// ✅ GOOD: Define proper interface
interface DataPayload {
  value: string;
  timestamp: number;
}

function processData(data: DataPayload) {
  return data.value;
}

// ✅ ACCEPTABLE: When truly dynamic with justification
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function processDynamicPythonData(data: any): unknown {
  // Python data structure can vary at runtime
  return data;
}
```

#### 2. Type Guards

Create type guard functions for runtime validation:

```typescript
// ✅ GOOD: Type guard for runtime validation
interface AssetInfo {
  assetType?: string;
  bounds?: BoundsInfo;
}

function isAssetInfo(obj: unknown): obj is AssetInfo {
  if (!obj || typeof obj !== 'object') return false;
  const data = obj as Record<string, unknown>;
  
  if (data.assetType !== undefined && typeof data.assetType !== 'string') {
    return false;
  }
  
  return true;
}

// Usage
const result = await pythonBridge.execute(command);
if (!isAssetInfo(result)) {
  throw new Error('Invalid asset info structure');
}
// Now TypeScript knows result is AssetInfo
```

#### 3. Avoid Unsafe Type Assertions

Never use double assertions like `as unknown as Type`:

```typescript
// ❌ BAD: Unsafe type assertion
const data = response as unknown as ComplexType;

// ✅ GOOD: Validate then use
if (!isComplexType(response)) {
  throw new Error('Invalid response structure');
}
const data = response; // TypeScript infers ComplexType
```

### Interface Design

#### 1. Prefer Specific Properties

```typescript
// ❌ BAD: Too broad
interface Config {
  [key: string]: unknown;
}

// ✅ GOOD: Specific properties with escape hatch
interface Config {
  host: string;
  port: number;
  debug?: boolean;
  // Only for truly dynamic data
  additionalProperties?: Record<string, unknown>;
}
```

#### 2. Document Complex Interfaces

```typescript
/**
 * Represents enhanced asset information from Unreal Engine
 */
export interface EnhancedAssetInfo {
  /** Asset type (e.g., 'StaticMesh', 'Blueprint') */
  assetType?: string;
  
  /** Detailed bounds information including size and origin */
  bounds?: BoundsInfo;
  
  /** Pivot point information for accurate placement */
  pivot?: PivotInfo;
  
  /** Socket data for modular snapping */
  sockets?: SocketInfo[];
}
```

### Tool Development

#### 1. Concise Descriptions

```typescript
// ❌ BAD: Too verbose
description: 'Get asset details (dimensions, materials, etc). asset_info({ assetPath: "/Game/Meshes/SM_Wall" }) returns bounding box size. Essential for calculating placement! Use this before spawning actors.',

// ✅ GOOD: Concise and clear
description: 'Get comprehensive asset details including bounds, pivot, sockets, and materials.',
```

#### 2. Parameter Validation

```typescript
protected async execute(args: AssetInfoArgs): Promise<ToolResponse> {
  // Validate required parameters
  if (!args.assetPath) {
    throw new Error('assetPath is required');
  }
  
  // Validate format
  if (!args.assetPath.startsWith('/Game/')) {
    throw new Error('assetPath must start with /Game/');
  }
  
  // Execute command
  const result = await this.executePythonCommand('asset.info', args);
  
  // Validate response
  if (!isEnhancedAssetInfo(result)) {
    throw new Error('Invalid response structure from Python');
  }
  
  return this.formatEnhancedAssetInfo(result, args.assetPath);
}
```

## Python Standards

### Constants and Magic Numbers

```python
# ❌ BAD: Magic numbers
if distance < 0.1:
    pivot_type = 'center'

# ✅ GOOD: Named constants
class AssetOperations:
    # Tolerance for floating point comparisons (in Unreal units)
    PIVOT_TOLERANCE = 0.1
    DEFAULT_SPAWN_HEIGHT = 100.0
    
    def detect_pivot(self, origin, extent):
        if abs(origin.z + extent.z) < self.PIVOT_TOLERANCE:
            return 'bottom-center'
```

### Exception Handling

#### 1. Specific Exceptions

```python
# ❌ BAD: Broad exception catching
try:
    asset = load_asset(path)
    bounds = asset.get_bounds()
except Exception:
    return None

# ✅ GOOD: Specific exceptions with context
try:
    asset = load_asset(path)
    bounds = asset.get_bounds()
except AttributeError as e:
    log_error(f"Asset missing bounds property: {path} - {e}")
    return None
except RuntimeError as e:
    log_error(f"Unreal Engine error loading asset: {path} - {e}")
    return None
```

#### 2. Common Unreal Engine Exceptions

```python
# Common exceptions when working with UE Python API:
try:
    # Actor operations
    actor = unreal.EditorLevelLibrary.spawn_actor_from_object(...)
except RuntimeError as e:
    # Thrown when spawn fails (invalid asset, location, etc)
    log_error(f"Failed to spawn actor: {e}")

try:
    # Asset operations
    asset = unreal.EditorAssetLibrary.load_asset(path)
except ValueError as e:
    # Thrown for invalid paths
    log_error(f"Invalid asset path: {path} - {e}")

try:
    # Property access
    value = actor.get_editor_property('some_property')
except AttributeError as e:
    # Thrown when property doesn't exist
    log_error(f"Property not found: {e}")
```

### Code Organization

#### 1. Line Continuations

```python
# ❌ BAD: Backslash continuation
result = very_long_function_name(param1, param2) and \
         another_long_condition(param3, param4)

# ✅ GOOD: Parentheses
result = (very_long_function_name(param1, param2) and
          another_long_condition(param3, param4))

# ✅ GOOD: Multi-line conditions
has_simple_collision = (
    len(body_setup.aggregate_geom.box_elems) > 0 or
    len(body_setup.aggregate_geom.sphere_elems) > 0 or
    len(body_setup.aggregate_geom.convex_elems) > 0
)
```

#### 2. Import Organization

```python
# ✅ GOOD: Organized imports
# Standard library
import os
import sys
from typing import Dict, List, Optional

# Third-party (Unreal)
import unreal

# Local imports
from utils import load_asset, asset_exists
from utils.logging import log_error, log_debug
```

### Type Hints

```python
# ✅ GOOD: Comprehensive type hints
from typing import Dict, List, Optional, Tuple, Union

def get_asset_info(
    self, 
    asset_path: str
) -> Dict[str, Union[bool, str, Dict[str, float], List[Dict[str, any]]]]:
    """Get detailed information about an asset.
    
    Args:
        asset_path: Content browser path to the asset
        
    Returns:
        Dictionary containing asset information with keys:
        - success: bool
        - assetType: str
        - bounds: Dict with size, extent, origin
        - sockets: List of socket information
    """
```

## Common Anti-Patterns

### 1. Premature Optimization

```python
# ❌ BAD: Over-optimizing len() calls (unless proven bottleneck)
box_len = len(boxes)
sphere_len = len(spheres)
convex_len = len(convex)
has_collision = box_len > 0 or sphere_len > 0 or convex_len > 0

# ✅ GOOD: Clear and readable (len() is O(1) in Python)
has_collision = (
    len(boxes) > 0 or
    len(spheres) > 0 or
    len(convex) > 0
)
```

### 2. Overly Broad Data Structures

```typescript
// ❌ BAD: Everything is any
interface ToolResult {
  success: boolean;
  data: any;
  error?: any;
}

// ✅ GOOD: Specific types with union for flexibility
interface ToolResult {
  success: boolean;
  data?: AssetInfo | ActorInfo | ViewportState;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### 3. Missing Validation

```typescript
// ❌ BAD: Trust external data
const result = await pythonBridge.execute(cmd);
return formatData(result.data);

// ✅ GOOD: Validate external data
const result = await pythonBridge.execute(cmd);
if (!result.success) {
  throw new Error(result.error || 'Command failed');
}
if (!isExpectedFormat(result.data)) {
  throw new Error('Invalid data format from Python');
}
return formatData(result.data);
```

## Pre-Commit Checklist

Before every commit:

1. **Run local CI tests**:
   ```bash
   ./test-ci-locally.sh
   ```

2. **Check for common issues**:
   - [ ] No `any` types without eslint-disable comments
   - [ ] No bare `except:` or `except Exception:` in Python
   - [ ] No magic numbers (extract to constants)
   - [ ] No unused imports
   - [ ] All functions have type hints (Python) or proper types (TypeScript)
   - [ ] Tool descriptions are concise (< 100 chars)
   - [ ] Complex interfaces are documented

3. **Fix any warnings**:
   - ESLint warnings in TypeScript
   - Flake8 warnings in Python
   - Type checking errors from tsc or mypy

4. **Test your changes**:
   - Manual testing in Unreal Engine
   - Update/add tests if applicable
   - Verify error cases are handled

## Code Review Response Patterns

When you see these comments, here's how to fix them:

| Review Comment | Fix |
|----------------|-----|
| "Using 'any' type" | Add interface or use type guard |
| "Magic number" | Extract to named constant |
| "Broad exception" | Catch specific exceptions |
| "Type assertion unsafe" | Add validation before use |
| "Line too long" | Use parentheses for multi-line |
| "No type annotation" | Add type hints to function |
| "Index signature too broad" | Use specific properties |

## Examples from UEMCP

### Good Example: Enhanced Asset Info

```typescript
// Well-structured interfaces
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface BoundsInfo {
  size: Vec3;
  extent: Vec3;
  origin: Vec3;
  min?: Vec3;
  max?: Vec3;
}

// Type guard for validation
export function isEnhancedAssetInfo(obj: any): obj is EnhancedAssetInfo {
  /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  if (!obj || typeof obj !== 'object') return false;
  
  // Validate optional properties when present
  if (obj.assetType !== undefined && typeof obj.assetType !== 'string') {
    return false;
  }
  
  return true;
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */
}
```

### Good Example: Python Asset Operations

```python
class AssetOperations:
    """Handles all asset-related operations."""
    
    # Constants instead of magic numbers
    PIVOT_TOLERANCE = 0.1
    DEFAULT_ASSET_LIMIT = 20
    
    def get_asset_info(self, asset_path: str) -> Dict[str, any]:
        """Get detailed information about an asset."""
        try:
            asset = load_asset(asset_path)
            if not asset:
                return {'success': False, 'error': f'Could not load: {asset_path}'}
            
            # Specific exception handling
            try:
                bounds = asset.get_bounds()
            except AttributeError as e:
                log_error(f"Asset has no bounds: {asset_path} - {e}")
                bounds = None
            except RuntimeError as e:
                log_error(f"UE error getting bounds: {asset_path} - {e}")
                bounds = None
                
            # Clear structure with type hints
            return self._format_asset_info(asset, bounds)
            
        except Exception as e:
            # Only catch broad exception at top level with logging
            log_error(f"Unexpected error in get_asset_info: {e}")
            return {'success': False, 'error': str(e)}
```