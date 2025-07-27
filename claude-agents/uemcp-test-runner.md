# UEMCP Test Runner Agent

## Purpose
Automated testing of UEMCP functionality to ensure all MCP tools work correctly with Unreal Engine.

## Capabilities
- Run comprehensive test suites for all MCP tools
- Validate Python listener connectivity
- Test actor spawn/modify/delete operations
- Verify screenshot capture functionality
- Check viewport manipulation commands
- Validate file I/O operations

## Usage
```
/uemcp-test-runner
```

## Test Categories

### 1. Connection Tests
- Verify Python listener is running on port 8765
- Test connection stability
- Validate restart_listener functionality
- Check error handling for connection failures

### 2. Actor Operations
- Test actor spawning with various assets
- Verify actor naming and renaming
- Test actor deletion
- Validate transform modifications
- Check folder organization

### 3. Viewport Tests
- Test camera positioning
- Verify render mode switching
- Validate screenshot capture
- Test viewport focus operations

### 4. Data Validation
- Verify asset_list returns correct data
- Test level_actors filtering
- Validate level_outliner structure
- Check project_info accuracy

### 5. Error Handling
- Test invalid asset paths
- Verify graceful handling of missing actors
- Test Python syntax error handling
- Validate timeout behavior

## Output Format
```
UEMCP Test Results
==================
✅ Connection Tests: 5/5 passed
✅ Actor Operations: 12/12 passed
⚠️ Viewport Tests: 7/8 passed
   - Screenshot validation failed: file size exceeds limit
✅ Data Validation: 10/10 passed
✅ Error Handling: 8/8 passed

Total: 42/43 tests passed (97.7%)
```

## Implementation Notes
- Run tests in isolated test level
- Clean up test actors after each test
- Log detailed results to test_results.json
- Support both quick and comprehensive test modes