import { DynamicToolRegistry } from '../../src/tools/dynamic-registry.js';
import { PythonBridge } from '../../src/services/python-bridge.js';

jest.mock('../../src/services/python-bridge.js');
jest.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('../../src/utils/version.js', () => ({ getVersion: () => '1.0.0-test' }));

// DynamicTool constructor is called with (toolDef, bridge); mock it to avoid PythonBridge calls
jest.mock('../../src/tools/dynamic-tool.js', () => ({
  DynamicTool: jest.fn().mockImplementation((toolDef: { category: string }) => ({
    category: toolDef.category,
  })),
}));

const validTool = {
  name: 'test_tool',
  description: 'A test tool',
  category: 'testing',
  inputSchema: {
    type: 'object',
    properties: { foo: { type: 'string' } },
    required: ['foo'],
    additionalProperties: false,
  },
};

const anotherValidTool = {
  name: 'other_tool',
  description: 'Another tool',
  category: 'other',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
};

function makeBridge(response: Record<string, unknown>): PythonBridge {
  const bridge = new PythonBridge() as jest.Mocked<PythonBridge>;
  bridge.executeCommand = jest.fn().mockResolvedValue(response);
  return bridge;
}

describe('DynamicToolRegistry.initialize()', () => {
  it('returns true and registers valid tools', async () => {
    const bridge = makeBridge({
      success: true,
      version: '2.0.0',
      totalTools: 1,
      tools: [validTool],
      categories: { testing: ['test_tool'] },
    });
    const registry = new DynamicToolRegistry(bridge);
    const ok = await registry.initialize();
    expect(ok).toBe(true);
    expect(registry.isInitialized()).toBe(true);
    expect(registry.getTools()).toHaveLength(1);
    const manifest = registry.getManifest();
    expect(manifest?.totalTools).toBe(1);
    expect(manifest?.categories).toEqual({ testing: ['test_tool'] });
  });

  it('returns false when bridge reports failure', async () => {
    const bridge = makeBridge({ success: false, error: 'connection refused' });
    const registry = new DynamicToolRegistry(bridge);
    expect(await registry.initialize()).toBe(false);
    expect(registry.isInitialized()).toBe(false);
  });

  it('returns false when tools array is missing', async () => {
    const bridge = makeBridge({ success: true });
    const registry = new DynamicToolRegistry(bridge);
    expect(await registry.initialize()).toBe(false);
  });

  it('returns false when tools is not an array', async () => {
    const bridge = makeBridge({ success: true, tools: 'not-an-array' });
    const registry = new DynamicToolRegistry(bridge);
    expect(await registry.initialize()).toBe(false);
  });

  it('filters out tool missing required string fields', async () => {
    const badTool = { name: 123, description: 'x', category: 'x', inputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false } };
    const bridge = makeBridge({
      success: true,
      tools: [badTool, validTool],
      categories: { testing: ['test_tool'] },
    });
    const { logger } = require('../../src/utils/logger.js');
    const registry = new DynamicToolRegistry(bridge);
    expect(await registry.initialize()).toBe(true);
    expect(registry.getTools()).toHaveLength(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1 invalid tool'));
  });

  it('filters out tool with wrong inputSchema type', async () => {
    const badTool = { ...validTool, name: 'bad_schema', inputSchema: { type: 'string', properties: {}, required: [], additionalProperties: false } };
    const bridge = makeBridge({
      success: true,
      tools: [badTool, validTool],
      categories: { testing: ['test_tool'] },
    });
    const registry = new DynamicToolRegistry(bridge);
    expect(await registry.initialize()).toBe(true);
    expect(registry.getTools()).toHaveLength(1);
  });

  it('filters out tool with missing properties in inputSchema', async () => {
    const badTool = { ...validTool, name: 'no_props', inputSchema: { type: 'object', required: [], additionalProperties: false } };
    const bridge = makeBridge({
      success: true,
      tools: [badTool, validTool],
      categories: {},
    });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    expect(registry.getTools()).toHaveLength(1);
  });

  it('filters out tool where required contains non-string values', async () => {
    const badTool = { ...validTool, name: 'bad_required', inputSchema: { type: 'object', properties: {}, required: [42], additionalProperties: false } };
    const bridge = makeBridge({
      success: true,
      tools: [badTool, validTool],
      categories: {},
    });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    expect(registry.getTools()).toHaveLength(1);
  });

  it('filters invalid tool names out of categories', async () => {
    const bridge = makeBridge({
      success: true,
      tools: [validTool],
      categories: { testing: ['test_tool', 'nonexistent_tool'] },
    });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    expect(registry.getManifest()?.categories['testing']).toEqual(['test_tool']);
  });

  it('skips category whose value is not a string array', async () => {
    const { logger } = require('../../src/utils/logger.js');
    const bridge = makeBridge({
      success: true,
      tools: [validTool],
      categories: { testing: ['test_tool'], bad_cat: 'not-an-array' },
    });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    expect(registry.getManifest()?.categories['bad_cat']).toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('bad_cat'));
  });

  it('warns when categories field itself is malformed', async () => {
    const { logger } = require('../../src/utils/logger.js');
    const bridge = makeBridge({
      success: true,
      tools: [validTool],
      categories: 'bad-categories',
    });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('categories field is malformed'));
  });

  it('drops filtered-out tool names from matching category', async () => {
    const badTool = { ...anotherValidTool, name: 'bad_tool', inputSchema: { type: 'number' } };
    const bridge = makeBridge({
      success: true,
      tools: [validTool, badTool],
      categories: {
        testing: ['test_tool'],
        other: ['bad_tool'],
      },
    });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    // bad_tool was filtered out, so 'other' category should be empty and excluded
    expect(registry.getManifest()?.categories['other']).toBeUndefined();
  });

  it('totalTools matches the count of valid tools, not raw count', async () => {
    const badTool = { name: null, description: 'x', category: 'x', inputSchema: {} };
    const bridge = makeBridge({
      success: true,
      totalTools: 99, // raw count from Python - should be ignored
      tools: [badTool, validTool],
      categories: {},
    });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    expect(registry.getManifest()?.totalTools).toBe(1);
  });

  it('filters out tool where required is missing from inputSchema', async () => {
    const badTool = { ...validTool, name: 'missing_required', inputSchema: { type: 'object', properties: {}, additionalProperties: false } };
    const bridge = makeBridge({ success: true, tools: [badTool, validTool], categories: {} });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    expect(registry.getTools()).toHaveLength(1);
  });

  it('filters out tool where additionalProperties is missing from inputSchema', async () => {
    const badTool = { ...validTool, name: 'missing_addl', inputSchema: { type: 'object', properties: {}, required: [] } };
    const bridge = makeBridge({ success: true, tools: [badTool, validTool], categories: {} });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    expect(registry.getTools()).toHaveLength(1);
  });

  it('filters out tool where inputSchema is an array', async () => {
    const badTool = { ...validTool, name: 'array_schema', inputSchema: [] };
    const bridge = makeBridge({ success: true, tools: [badTool, validTool], categories: {} });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    expect(registry.getTools()).toHaveLength(1);
  });

  it('filters out tool where properties is an array', async () => {
    const badTool = { ...validTool, name: 'array_props', inputSchema: { type: 'object', properties: [], required: [], additionalProperties: false } };
    const bridge = makeBridge({ success: true, tools: [badTool, validTool], categories: {} });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    expect(registry.getTools()).toHaveLength(1);
  });

  it('warns and strips invalid timeout (non-number)', async () => {
    const { logger } = require('../../src/utils/logger.js');
    const toolWithBadTimeout = { ...validTool, name: 'bad_timeout', timeout: 'thirty' };
    const bridge = makeBridge({ success: true, tools: [toolWithBadTimeout, validTool], categories: {} });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    // Both tools accepted (timeout is normalized, not rejected)
    expect(registry.getTools()).toHaveLength(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('bad_timeout'));
  });

  it('warns and strips invalid timeout (negative number)', async () => {
    const { logger } = require('../../src/utils/logger.js');
    const toolWithBadTimeout = { ...validTool, name: 'neg_timeout', timeout: -5 };
    const bridge = makeBridge({ success: true, tools: [toolWithBadTimeout, validTool], categories: {} });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    expect(registry.getTools()).toHaveLength(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('neg_timeout'));
  });

  it('accepts valid timeout value', async () => {
    const toolWithTimeout = { ...validTool, name: 'good_timeout', timeout: 30 };
    const bridge = makeBridge({ success: true, tools: [toolWithTimeout], categories: {} });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    expect(registry.getTools()).toHaveLength(1);
  });

  it('returns true immediately if already initialized', async () => {
    const bridge = makeBridge({
      success: true,
      tools: [validTool],
      categories: {},
    });
    const registry = new DynamicToolRegistry(bridge);
    await registry.initialize();
    const spy = bridge.executeCommand as jest.Mock;
    const callCount = spy.mock.calls.length;
    await registry.initialize();
    expect(spy.mock.calls.length).toBe(callCount); // no extra bridge call
  });
});
