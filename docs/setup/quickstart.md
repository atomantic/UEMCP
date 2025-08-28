# UEMCP Quick Start Guide

Welcome to UEMCP! This guide will get you up and running in under 5 minutes.

## 🚀 One-Command Setup

```bash
git clone https://github.com/atomantic/UEMCP.git
cd UEMCP
./setup.sh
```

That's it! The setup script handles everything automatically, including installing Node.js and Python if needed.

### Advanced Setup Options

```bash
# Install to your Unreal project (automatically installs plugin)
./setup.sh --project "/path/to/your/ue/project"

# Non-interactive mode (great for CI/CD)
./setup.sh --no-interactive --project "/path/to/project"

# See all options
./setup.sh --help
```

## 🎯 What Just Happened?

The setup script:
1. ✅ Detected your installed AI development tools
2. ✅ Configured MCP support for Claude, Amazon Q, Gemini, and Codex
3. ✅ Installed Node.js if not present
4. ✅ Installed Python if not present (optional)
5. ✅ Created a virtual environment for Python
6. ✅ Installed all dependencies
7. ✅ Built the MCP server
8. ✅ Asked for your Unreal Engine project path (optional)
9. ✅ Installed the UEMCP plugin to your project (if requested)

## 🧪 Testing Your Setup

### Test 1: Local Connection Test
```bash
node test-connection.js
```

You should see:
- Server starting up
- List of available tools
- Successful connection message

### Test 2: Claude Desktop
1. **Restart Claude Desktop** (important!)
2. Start a new conversation
3. Say: "What UEMCP tools are available?"

Claude should respond with a list of available Unreal Engine tools.

## 🎮 Using UEMCP

### Basic Commands

Ask Claude to:
- "Show me information about my current UE project"
- "List the assets in my project"
- "Spawn a cube at location 0,0,100"
- "Take a screenshot of the viewport"
- "Show me all actors in the current level"
- "Save the current level"

### Setting Your Project

If you didn't set a project during init:

```bash
# macOS/Linux
export UE_PROJECT_PATH="/path/to/your/project.uproject"

# Windows
set UE_PROJECT_PATH=C:\path\to\your\project.uproject
```

**Note:** The path should point to the `.uproject` file, not just the directory.

### Installing the Plugin

For full functionality, install the UEMCP plugin to your UE project:

```bash
# If you didn't do this during setup, run:
./setup.sh --project "/path/to/project.uproject"
```

The plugin enables:
- Python listener for real-time commands
- All 11 MCP tools
- Hot reload support

## 🔧 Common Issues

### "Claude doesn't see UEMCP"
- Make sure you **fully restarted** Claude Desktop
- Check the MCP indicator in Claude's interface
- Run `node test-connection.js` to verify the server works

### "Project not found"
- Set your project path: `export UE_PROJECT_PATH="/actual/path"`
- Make sure the path points to your `.uproject` file's directory

### "Permission denied"
- On macOS/Linux: `chmod +x setup.sh`
- On Windows: Run using Git Bash or WSL

## 📚 Next Steps

1. **Explore available tools**: Ask Claude "What can you do with Unreal Engine?"
2. **Read the docs**: Check out [complete documentation](../README.md)
3. **Join the community**: Report issues or request features on GitHub

## 💡 Pro Tips

- Enable debug logging: `export DEBUG=uemcp:*`
- Watch server logs: `tail -f ~/.uemcp/logs/server.log` (if logging is enabled)
- Use environment files: Copy `.env.example` to `.env` for persistent config

---

Need help? Check our [troubleshooting guide](troubleshooting.md) or open an issue on GitHub!