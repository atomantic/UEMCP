# UEMCP Setup Scripts Documentation

## Primary Setup Method: `node init.js`

The recommended way to set up UEMCP is using the cross-platform Node.js initialization script:

```bash
node init.js
```

This script is:
- ✅ **Cross-platform** - Works on Windows, macOS, and Linux
- ✅ **Fully automated** - Configures everything automatically
- ✅ **Interactive** - Guides you through the setup with prompts
- ✅ **Flexible** - Supports many command-line options for automation

## Command-Line Options

```bash
node init.js [options]
```

| Option | Description |
|--------|-------------|
| `--project <path>` | Path to Unreal Engine project (will install plugin) |
| `--symlink` | Create symlink instead of copying plugin (recommended for development) |
| `--copy` | Copy plugin files instead of symlinking |
| `--no-interactive` | Run without prompts (automation/CI) |
| `--skip-claude` | Skip Claude Desktop configuration |
| `--claude-code` | Configure Claude Code (claude.ai/code) MCP |
| `--help` | Show help information |

## Examples

### Basic Interactive Setup
```bash
node init.js
```
Guides you through all setup steps with prompts.

### Development Setup with Symlink
```bash
node init.js --project "/path/to/MyProject.uproject" --symlink
```
Best for developers - changes to plugin code are reflected immediately.

### Production Setup with Copy
```bash
node init.js --project "/path/to/MyProject.uproject" --copy
```
Best for production - plugin is copied to project, isolated from source.

### Automated CI/CD Setup
```bash
node init.js --no-interactive --skip-claude --project "$UE_PROJECT_PATH"
```
No prompts, perfect for automated environments.

### Claude Code Setup
```bash
node init.js --claude-code
```
Configures for use with claude.ai/code instead of Claude Desktop.

## What init.js Does

1. **Checks Prerequisites**
   - Node.js and npm (required)
   - Python and pip (optional, for development tools)

2. **Installs Dependencies**
   - Node.js packages for MCP server
   - Python packages for testing/linting (optional)

3. **Builds the Server**
   - Compiles TypeScript to JavaScript
   - Prepares MCP server for use

4. **Configures Claude**
   - Sets up Claude Desktop config automatically
   - Or configures Claude Code via CLI tool

5. **Installs Plugin** (if project specified)
   - Creates symlink (development) or copies files (production)
   - Updates .uproject file to enable plugin

6. **Creates Test Scripts**
   - Generates test-connection.js for verification

## Legacy Script: `setup.sh`

The `setup.sh` script is maintained for backward compatibility but now simply calls `init.js`:

```bash
./setup.sh  # This now runs: node init.js
```

**Note**: `setup.sh` only works on Unix-like systems (macOS/Linux). Windows users must use `node init.js`.

## Python Dependencies

The Python dependencies in `requirements-dev.txt` are **optional** and only needed for:
- Running tests with pytest
- Code formatting with black
- Linting with flake8/ruff
- Type checking with mypy

The core UEMCP functionality works without these dependencies, as the `unreal` Python module is provided by Unreal Engine itself.

## Troubleshooting

### Python Dependencies Installation Fails
- **Solution**: Skip them - they're optional!
- The core functionality still works
- Install manually later if needed: `pip install -r requirements-dev.txt`

### Permission Denied on pip install
- The script automatically tries `--user` flag
- If still failing, skip and install manually with sudo if needed

### Node.js Not Found
- **Required**: Install from https://nodejs.org/
- Minimum version: 18.0.0

### Claude Desktop Not Configuring
- Check config location:
  - macOS: `~/Library/Application Support/Claude/`
  - Windows: `%APPDATA%/Claude/`
  - Linux: `~/.config/claude/`
- Run with `--skip-claude` to skip this step

## Environment Variables

After setup, you may want to set:

```bash
export UE_PROJECT_PATH="/path/to/your/project"
```

This tells UEMCP which Unreal Engine project to work with.

## Next Steps After Setup

1. **Restart Claude Desktop** (if configured)
2. **Open your UE project** (if plugin was installed)
3. **Test the connection**: `node test-connection.js`
4. **Try in Claude**: "List available UEMCP tools"

## For Developers

If you're developing UEMCP itself:

1. Use symlink installation: `--symlink`
2. Install Python dev dependencies when prompted
3. Use `restart_listener()` in UE for hot reload
4. Run tests: `npm test` and `pytest`

## Summary

- **Always use `node init.js`** - it's the most complete and maintained setup method
- **`setup.sh` is legacy** - kept only for backward compatibility
- **Python deps are optional** - core functionality doesn't need them
- **Cross-platform support** - init.js works everywhere Node.js runs