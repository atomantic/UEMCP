# Quick Start Guide

Get UEMCP running in under 5 minutes!

## 🚀 One-Command Setup

```bash
git clone https://github.com/atomantic/UEMCP.git
cd UEMCP
./setup.sh
```

That's it! The setup script handles everything automatically.

## 📋 What Gets Installed

The setup script will:
1. ✅ Check/install Node.js 18+ (via Homebrew, apt, or nvm)
2. ✅ Check/install Python 3.11 (optional, for development)
3. ✅ Create virtual environment (optional but recommended)
4. ✅ Install all dependencies
5. ✅ Build the MCP server
6. ✅ Configure Claude Desktop and/or Claude Code
7. ✅ Install the UE plugin to your project (if path provided)

## 🎮 Using UEMCP

### Step 1: Start Unreal Engine
Open your project with the UEMCP plugin installed. The Python listener starts automatically.

### Step 2: Launch Claude
```bash
# For Claude Code (recommended)
claude -c

# Or use Claude Desktop (restart it after setup)
```

### Step 3: Use MCP Tools
Ask Claude to:
- "Show me all actors in the level"
- "Spawn a cube at location 0,0,100"
- "Take a screenshot of the viewport"
- "Show me available assets"

## 🧪 Testing Your Setup

```bash
# Test MCP server connection
node test-connection.js

# In UE Python console, check listener status
status()
```

## 🔧 Setup Options

```bash
# Install directly to your UE project
./setup.sh --project "/path/to/YourProject.uproject"

# Use symlink for development (recommended)
./setup.sh --project "/path/to/YourProject.uproject" --symlink

# Use copy for production deployment
./setup.sh --project "/path/to/YourProject.uproject" --copy

# Non-interactive mode for CI/CD
./setup.sh --no-interactive --project "/path/to/project"

# Skip Python setup (Node.js only)
./setup.sh --skip-python

# See all options
./setup.sh --help
```

## 💡 Tips

### Windows Users
Use WSL (Windows Subsystem for Linux) or Git Bash:
```bash
# Install WSL if needed
wsl --install

# Then run setup in WSL
./setup.sh
```

### Manual Plugin Installation
If you prefer manual installation:
```bash
# Symlink (for development)
ln -s "$(pwd)/plugin" "/path/to/YourProject/Plugins/UEMCP"

# Or copy (for production)
cp -r plugin "/path/to/YourProject/Plugins/UEMCP"
```

### Troubleshooting
- **Claude doesn't see tools**: Restart Claude Desktop completely
- **Port 8765 in use**: Run `restart_listener()` in UE Python console
- **Connection failed**: Check UE Output Log for listener status

## 📚 Next Steps

- [Read the full documentation](../../README.md)
- [Learn about available tools](../../README.md#-available-tools)
- [Check troubleshooting guide](../development/troubleshooting.md)

---

**Need help?** Check the [troubleshooting guide](../development/troubleshooting.md) or [create an issue](https://github.com/atomantic/UEMCP/issues).