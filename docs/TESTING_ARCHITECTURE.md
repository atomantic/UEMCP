# UEMCP Testing Architecture

## Overview

UEMCP uses a **comprehensive 3-tier testing strategy** that provides meaningful tests at the right scope levels:

```
📁 UEMCP/
├── server/tests/                    # Tier 1: Pure Unit Tests
│   ├── unit/                       # TypeScript business logic
│   └── python/                     # Python algorithms
├── tests/integration/               # Tier 2: True Integration Tests
│   ├── test-mcp-integration.js     # MCP Server ↔ Python Bridge
│   ├── test-python-proxy.js        # Bridge communication
│   └── test-demo-coverage.js       # Full tool coverage
├── tests/                          # Tier 3: End-to-End Tests
│   ├── test-e2e.js                # Comprehensive test runner
│   └── Demo/                       # Real UE project for testing
```

## Testing Tiers Explained

### Tier 1: Unit Tests (Fast, No Dependencies)
**Location**: `server/tests/unit/` and `server/tests/python/`
**Purpose**: Test pure business logic without external dependencies
**Runtime**: ~1 second, 243 tests

```bash
# Run unit tests only
npm run test:unit
```

**What's Tested:**
- ✅ **TypeScript business logic**: Formatting, validation, type guards
- ✅ **Python algorithms**: Asset operations, validation logic, calculations
- ✅ **Contract validation**: Realistic fixtures vs. TypeScript interfaces
- ❌ **NOT network communication** - uses mocks
- ❌ **NOT UE integration** - pure algorithms only

### Tier 2: Integration Tests (Medium, Python Bridge)  
**Location**: `tests/integration/`
**Purpose**: Test MCP Server ↔ Python Bridge ↔ UE communication
**Runtime**: ~10-30 seconds

```bash
# Run integration tests
npm run test:integration
```

**What's Tested:**
- ✅ **MCP Server startup and protocol**
- ✅ **Python bridge communication** (localhost:8765)
- ✅ **Tool execution pipeline**: TypeScript → Python → UE → Response
- ✅ **Error handling and validation**
- ❌ **NOT isolated business logic** - that's Tier 1

### Tier 3: End-to-End Tests (Slow, Full UE)
**Location**: `test-e2e.js` + Demo project
**Purpose**: Complete system validation with real Unreal Engine
**Runtime**: ~60-120 seconds

```bash  
# Run all test tiers
npm test
# or
node test-e2e.js
```

**What's Tested:**
- ✅ **Complete workflow**: Claude → MCP → Python → UE → Real results
- ✅ **Demo project operations**: Actual asset spawning, viewport control
- ✅ **Tool coverage**: Every MCP tool exercised against real UE
- ✅ **Code coverage**: Combined reporting across all layers

## Why This Architecture?

### ❌ Problems with Mock-Heavy "Integration" Tests:
- **False confidence**: Tests pass but real integration fails
- **Maintenance burden**: Mocks drift from reality
- **Wrong scope**: Testing business logic with complex mocks

### ✅ Benefits of True 3-Tier Architecture:
- **Fast feedback**: Unit tests catch logic bugs in 1 second
- **Real integration**: Integration tests use actual Python bridge
- **High confidence**: E2E tests validate complete workflows
- **Proper coverage**: Metrics reflect real code usage, not mock interactions

## Running Tests

### Development Workflow:
```bash
# Quick feedback during development
npm run test:unit          # ~1 second

# Before committing changes  
./test-ci-locally.sh       # Full CI pipeline

# Manual comprehensive testing
npm run test:e2e:coverage  # Full coverage with UE
```

### CI/CD Pipeline:
```bash
# Automated testing (GitHub Actions)
npm run test:ci            # All tiers with coverage
```

## Coverage Strategy

### What We Measure:
- **Unit Test Coverage**: TypeScript + Python business logic (85%+ target)
- **Integration Coverage**: MCP tool execution paths
- **E2E Tool Coverage**: Every MCP tool tested against real UE

### Coverage Reports:
```bash
# Generate coverage reports
npm run test:e2e:coverage

# View reports
open server/coverage/lcov-report/index.html  # TypeScript
open server/tests/python/coverage/index.html # Python
```

## Prerequisites by Tier

### Tier 1 (Unit Tests):
- Node.js 18+
- Python 3.11+
- No external dependencies

### Tier 2 (Integration Tests):
- Unreal Engine running
- UEMCP plugin loaded
- Python listener active (localhost:8765)

### Tier 3 (E2E Tests):
- Demo project loaded in UE
- All MCP tools functional
- Network connectivity

## Demo Project Setup

The `Demo/` UE project provides a consistent testing environment:

```bash
# 1. Open Demo project in UE
open Demo/Demo.uproject

# 2. Load UEMCP plugin (auto-loads from Plugins/)
# 3. Start Python listener in UE console:
import uemcp_helpers; uemcp_helpers.restart_listener()

# 4. Run E2E tests
npm test
```

## Test File Organization

### Unit Tests (server/tests/):
```
unit/
├── contracts/              # Python-TypeScript interface validation
├── tools/                  # Tool business logic + realistic fixtures  
├── utils/                  # Utility functions and formatters
└── fixtures/               # Realistic Python response data
```

### Integration Tests (tests/integration/):
```
integration/
├── test-connection.js      # Basic connectivity
├── test-mcp-integration.js # Full MCP workflow  
├── test-python-proxy.js    # Bridge communication
├── test-demo-coverage.js   # Complete tool coverage
└── test-ue-live.js        # Live UE operations
```

## Adding New Tests

### For New Features:
1. **Start with Unit Tests**: Test the business logic in isolation
2. **Add Integration Tests**: Test the MCP tool execution
3. **Verify E2E Coverage**: Ensure the tool works in the Demo project

### For Bug Fixes:
1. **Write failing unit test** that reproduces the bug
2. **Fix the business logic** until unit test passes  
3. **Verify integration** still works with fix

## Common Issues

### "UE not connected" in E2E tests:
```bash
# Check UE is running with Demo project
# Check Python listener is active:
curl http://localhost:8765
```

### Unit tests failing after changes:
```bash
# Run specific test suite:
npm run test:unit -- --testNamePattern="Asset Tool"
```

### Integration tests timeout:
```bash
# Increase timeout and run with verbose logging:
VERBOSE=true npm run test:integration
```

## Migration from Old Architecture

### What Changed:
- ❌ **Removed**: Server-level "integration" tests (were just unit tests with mocks)
- ✅ **Added**: True project-level integration tests
- ✅ **Enhanced**: Unit tests now include realistic fixture validation
- ✅ **Created**: Comprehensive E2E test runner

### Benefits:
- **85% less test code** for same coverage (no mock maintenance)
- **Real integration validation** catches actual interface issues
- **Faster development cycle** with proper test tier separation
- **Higher confidence** in releases through E2E validation

---

## Quick Reference

| Test Level | Command | Runtime | Purpose |
|------------|---------|---------|---------|
| Unit | `npm run test:unit` | ~1s | Business logic |  
| Integration | `npm run test:integration` | ~30s | MCP ↔ Python ↔ UE |
| E2E | `npm test` | ~2m | Complete workflow |
| CI | `./test-ci-locally.sh` | ~3m | Full pipeline |

**The golden rule**: Use the right test at the right level. Unit tests for logic, integration tests for communication, E2E tests for complete workflows.