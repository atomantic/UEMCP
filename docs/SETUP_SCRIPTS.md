# UEMCP Setup Scripts Documentation

## Primary Setup Method: `./setup.sh`

The recommended way to set up UEMCP is using the universal setup script:

```bash
./setup.sh
```

This script handles everything:
- ✅ **Checks and installs Node.js** - Via Homebrew, apt, yum, or nvm if not present
- ✅ **Checks and installs Python** - For development tools (optional)
- ✅ **Sets up virtual environment** - Isolates Python dependencies
- ✅ **Installs all dependencies** - Both Node.js and Python packages
- ✅ **Builds the MCP server** - Compiles TypeScript to JavaScript
- ✅ **Configures Claude** - Sets up Claude Desktop and/or Claude Code
- ✅ **Installs UE plugin** - Optionally installs to your project
- ✅ **Cross-platform** - Works on macOS, Linux, and WSL/Git Bash

**Windows users:** Use WSL (Windows Subsystem for Linux) or Git Bash to run `./setup.sh`

## How It Works

1. **Detects your OS** - macOS, Linux, or Windows (WSL)
2. **Checks Node.js** - Verifies version 18+ is installed
3. **Installs Node.js if needed** - Uses the best method for your system:
   - macOS: Homebrew
   - Ubuntu/Debian: apt-get with NodeSource
   - RHEL/Fedora: yum with NodeSource
   - Fallback: nvm (Node Version Manager)
4. **Checks Python** - For optional development tools
5. **Installs Python if needed** - Via Homebrew, apt, or yum
6. **Sets up virtual environment** - Creates isolated Python environment
7. **Installs all dependencies** - Node.js and Python packages
8. **Builds MCP server** - Compiles TypeScript
9. **Configures Claude** - Sets up MCP for Claude Desktop/Code
10. **Installs UE plugin** - Optionally adds to your project

## Command-Line Options

```bash
./setup.sh [options]
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
./setup.sh
```
Checks/installs Node.js, then guides you through setup with prompts.

### Development Setup with Symlink
```bash
./setup.sh --project "/path/to/MyProject.uproject" --symlink
```
Best for developers - changes to plugin code are reflected immediately.

### Production Setup with Copy
```bash
./setup.sh --project "/path/to/MyProject.uproject" --copy
```
Best for production - plugin is copied to project, isolated from source.

### Automated CI/CD Setup
```bash
./setup.sh --no-interactive --skip-claude --project "$UE_PROJECT_PATH"
```
No prompts, perfect for automated environments.

### Claude Code Setup
```bash
./setup.sh --claude-code
```
Configures for use with claude.ai/code instead of Claude Desktop.


## What setup.sh Does

1. **Environment Setup**
   - Installs Node.js if not present
   - Installs Python if not present (optional)
   - Creates virtual environment for Python

2. **Dependency Installation**
   - Node.js packages for MCP server
   - Python packages for testing/linting (optional)

3. **Server Build**
   - Compiles TypeScript to JavaScript
   - Prepares MCP server for use

4. **MCP Configuration**
   - Sets up Claude Desktop config automatically
   - Configures Claude Code via CLI tool

5. **Plugin Installation** (if project specified)
   - Creates symlink (development) or copies files (production)
   - Updates .uproject file to enable plugin

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

- **Use `./setup.sh`** - Handles everything including Node.js installation
- **Windows users** - Use WSL or Git Bash to run setup.sh
- **Python deps are optional** - Core functionality doesn't need them
- **Fully automated** - Installs Node.js, builds server, configures Claude
- **Cross-platform** - Works on macOS, Linux, and Windows (via WSL)