# UEMCP Testing Strategy

## Overview
A comprehensive testing approach that validates real functionality while supporting both local development with UE and CI/CD without UE dependencies.

## Testing Layers

### 1. Unit Tests (No External Dependencies)
**Location**: `tests/unit/`
**Purpose**: Test pure business logic, validation functions, data transformations
**Environment**: CI + Local
**Coverage Target**: 95%

#### What to Test:
- **Data Validation**: `isEnhancedAssetInfo`, parameter validation, schema validation
- **Response Formatting**: All `format*` methods with various data combinations  
- **String Processing**: Path manipulation, command building, error message formatting
- **Edge Cases**: Null/undefined handling, boundary conditions, malformed inputs
- **Type Guards**: All type checking functions
- **Utility Functions**: Pure functions without external dependencies

#### Example Tests:
```typescript
// tests/unit/tools/asset-formatting.test.ts
describe('Asset Info Formatting', () => {
  it('should format bounds data correctly', () => {
    const bounds = { size: {x: 100, y: 200, z: 300}, ... };
    const result = formatEnhancedAssetInfo({bounds, assetType: 'StaticMesh'}, '/Game/Test');
    expect(result.content[0].text).toContain('Size: [100, 200, 300]');
    expect(result.content[0].text).toContain('Type: StaticMesh');
  });

  it('should handle missing optional fields gracefully', () => {
    const result = formatEnhancedAssetInfo({assetType: 'StaticMesh'}, '/Game/Test');
    expect(result.content[0].text).not.toContain('Bounds');
    expect(result.content[0].text).toContain('Type: StaticMesh');
  });
});
```

### 2. Integration Tests (Mock External Dependencies)  
**Location**: `tests/integration/`
**Purpose**: Test component interactions with mocked Python bridge
**Environment**: CI + Local
**Coverage Target**: Key workflows

#### What to Test:
- **Tool Orchestration**: Complete tool execution paths with realistic Python responses
- **Error Propagation**: How errors flow from Python → Tool → MCP response
- **Command Translation**: TypeScript args → Python command structure
- **Response Translation**: Python response → MCP tool response

#### Example Tests:
```typescript
// tests/integration/asset-info-workflow.test.ts  
describe('Asset Info Workflow', () => {
  it('should handle complete asset info request', async () => {
    // Use realistic Python response from fixture
    const pythonResponse = loadFixture('asset-info-wall.json');
    mockPythonBridge.mockResolvedValue(pythonResponse);
    
    const tool = new AssetInfoTool();
    const result = await tool.handler({assetPath: '/Game/Walls/SM_Wall01'});
    
    // Validate complete formatted output
    expect(result.content[0].text).toMatchSnapshot();
    expect(pythonBridge).toHaveBeenCalledWith({
      type: 'asset.info',
      params: {assetPath: '/Game/Walls/SM_Wall01'}
    });
  });
});
```

### 3. Python Unit Tests  
**Location**: `tests/python/`  
**Purpose**: Test Python operations without UE dependencies
**Environment**: CI + Local (using pytest)
**Coverage Target**: 90%

#### What to Test:
- **Data Processing**: Asset info parsing, coordinate transformations
- **Validation Logic**: Input sanitization, parameter checking
- **Command Parsing**: MCP command → Python function calls
- **Response Building**: Python data → JSON response structure
- **Error Handling**: Exception handling, error message formatting

#### Setup:
```python
# tests/python/test_asset_operations.py
import pytest
from unittest.mock import Mock, patch
from ops.asset import AssetOperations

class TestAssetOperations:
    def test_parse_asset_info(self):
        """Test asset info parsing without UE dependencies."""
        mock_asset = Mock()
        mock_asset.get_name.return_value = "SM_Wall01"
        # Test pure data transformation logic
        
    def test_validate_asset_path(self):
        """Test asset path validation logic."""
        ops = AssetOperations()
        assert ops.validate_asset_path("/Game/Valid/Path")
        assert not ops.validate_asset_path("Invalid")
```

### 4. Contract Tests (Python-TypeScript Interface)
**Location**: `tests/contracts/`
**Purpose**: Validate Python-TypeScript API contracts
**Environment**: CI + Local  
**Coverage Target**: All tool interfaces

#### What to Test:
- **Request/Response Schemas**: Ensure TypeScript expects what Python provides
- **Error Code Mapping**: Consistent error handling between layers  
- **Data Type Consistency**: Coordinate systems, data formats, enums

#### Example Tests:
```typescript
// tests/contracts/asset-info-contract.test.ts
describe('Asset Info Contract', () => {
  it('Python response should match TypeScript expectations', () => {
    const pythonResponse = loadPythonFixture('asset_info_response.json');
    const isValid = isEnhancedAssetInfo(pythonResponse);
    expect(isValid).toBe(true);
  });
});
```

### 5. E2E Integration Tests (With UE Environment)
**Location**: `tests/e2e/`
**Purpose**: Full system testing with real UE environment  
**Environment**: Local only (requires UE)
**Coverage Target**: Critical workflows

#### What to Test:
- **Real Asset Queries**: Actual UE project assets
- **Actor Manipulation**: Spawn, modify, delete with real geometry
- **Viewport Operations**: Screenshots, camera movements
- **Error Scenarios**: Invalid assets, network issues, permission problems

#### Setup:
```typescript
// tests/e2e/asset-operations.e2e.ts
describe('Asset Operations E2E', () => {
  beforeAll(async () => {
    // Ensure UE is running and UEMCP plugin loaded
    await waitForUEConnection();
  });

  it('should retrieve real asset information', async () => {
    const tool = new AssetInfoTool();
    const result = await tool.handler({
      assetPath: '/Game/ModularOldTown/Meshes/SM_Wall_01'
    });
    
    expect(result.content[0].text).toContain('StaticMesh');
    expect(result.content[0].text).toContain('Bounds');
  });
});
```

## Test Data Management

### Fixtures and Snapshots
```
tests/
├── fixtures/
│   ├── python-responses/
│   │   ├── asset-info-wall.json
│   │   ├── actor-spawn-success.json  
│   │   └── error-asset-not-found.json
│   └── ue-project-data/
│       ├── test-assets.json
│       └── known-actors.json
├── snapshots/
│   ├── formatted-responses/
│   └── error-messages/
└── utils/
    ├── fixtures.ts
    ├── ue-connection.ts
    └── test-helpers.ts
```

## CI/CD Configuration  

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit
      - name: Run integration tests  
        run: npm run test:integration
      - name: Run contract tests
        run: npm run test:contracts

  python-tests:
    runs-on: ubuntu-latest  
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install Python dependencies
        run: |
          pip install pytest pytest-mock
          pip install -r plugin/requirements.txt
      - name: Run Python tests
        run: pytest tests/python/

  e2e-tests:
    runs-on: self-hosted # Requires UE environment
    if: github.event_name == 'pull_request'  
    steps:
      - name: Start UE and run E2E tests
        run: npm run test:e2e
```

### Package.json Scripts
```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration && npm run test:contracts",
    "test:unit": "jest tests/unit/",
    "test:integration": "jest tests/integration/", 
    "test:contracts": "jest tests/contracts/",
    "test:e2e": "jest tests/e2e/",
    "test:python": "cd ../plugin && python -m pytest ../server/tests/python/",
    "test:watch": "jest --watch tests/unit/ tests/integration/",
    "test:coverage": "jest --coverage tests/unit/ tests/integration/"
  }
}
```

## Benefits of This Approach

### ✅ **Meaningful Test Coverage**
- Tests validate actual business logic, not mock interactions
- Catches real bugs in formatting, validation, and data processing
- Comprehensive edge case coverage

### ✅ **CI/CD Compatible**  
- 80% of tests run without UE dependencies
- Python tests use standard pytest framework
- Fast feedback loop for developers

### ✅ **Development Friendly**
- E2E tests validate against real UE environment locally
- Unit tests provide fast feedback during development  
- Contract tests catch integration issues early

### ✅ **Maintainable**
- Clear separation of concerns between test layers
- Shared fixtures reduce duplication
- Snapshot testing for complex formatted outputs

### ✅ **Reliable**
- Tests fail when functionality breaks, not when mocks change
- Real data validation catches schema drift
- E2E tests verify end-user workflows

## Migration Plan

1. **Phase 1**: Create unit test structure and migrate formatting logic tests
2. **Phase 2**: Add Python unit tests for core operations  
3. **Phase 3**: Build integration tests with realistic fixtures
4. **Phase 4**: Add contract tests for Python-TypeScript interfaces
5. **Phase 5**: Create E2E test suite for critical workflows
6. **Phase 6**: Set up CI/CD pipelines and self-hosted E2E runner