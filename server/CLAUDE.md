# Server Module Context

This file provides context for the MCP server implementation.

## TypeScript Standards

**CRITICAL**: Follow these standards to pass CI checks:

### Type Safety
- **NEVER use `any` type** without eslint-disable comment and justification
- Define proper interfaces for all data structures
- Use type guards for runtime validation
- Prefer `unknown` over `any` when type is truly unknown

### Type Assertions
- **NEVER use unsafe type assertions** like `as unknown as Type`
- Always validate data structure before use
- Create type guard functions when needed

### Tool Descriptions
- Keep descriptions concise (under 100 characters ideal)
- Focus on key capabilities, not implementation details
- Use active voice

## Server Architecture

The MCP server:
- Implements Model Context Protocol specification
- Connects to UE Python listener on port 8765
- Handles automatic reconnection
- Manages tool registration and execution

## Running with Claude Code

**IMPORTANT**: When using Claude Code (`claude -c`), the MCP server starts automatically!
- You do NOT need to run `npm start` manually
- The server is managed by Claude Code
- Only run manually for testing/debugging

## Debug Logging

Enable verbose logging:
```bash
DEBUG=uemcp:* npm start
```

## Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run with coverage
npm run test:coverage
```

## Build Process

```bash
# Build TypeScript
npm run build

# Watch mode for development
npm run dev
```