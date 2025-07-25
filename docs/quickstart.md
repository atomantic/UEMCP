# UEMCP Quick Start Guide

Welcome to UEMCP! This guide will get you up and running in under 5 minutes.

## 🚀 One-Command Setup

```bash
git clone https://github.com/atomantic/UEMCP.git
cd UEMCP
node init.js
```

That's it! The init script handles everything automatically.

### Advanced Setup Options

```bash
# Install with plugin to your Unreal project
node init.js --project "/path/to/your/ue/project" --install-plugin

# Non-interactive mode (great for CI/CD)
node init.js --no-interactive --project "/path/to/project"

# Skip Claude configuration (server only)
node init.js --skip-claude

# See all options
node init.js --help
```

## 🎯 What Just Happened?

The init script:
1. ✅ Installed all Node.js dependencies
2. ✅ Built the MCP server
3. ✅ Configured Claude Desktop to use UEMCP
4. ✅ Asked for your Unreal Engine project path (optional)
5. ✅ Installed the UEMCP plugin to your project (if requested)
6. ✅ Created test scripts for verification

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
- "Create a new Unreal Engine project called MyGame"
- "Show me information about my current UE project"
- "List the assets in my project" (when implemented)

### Setting Your Project

If you didn't set a project during init:

```bash
# macOS/Linux
export UE_PROJECT_PATH="/path/to/your/project"

# Windows
set UE_PROJECT_PATH=C:\path\to\your\project
```

## 🔧 Common Issues

### "Claude doesn't see UEMCP"
- Make sure you **fully restarted** Claude Desktop
- Check the MCP indicator in Claude's interface
- Run `node test-connection.js` to verify the server works

### "Project not found"
- Set your project path: `export UE_PROJECT_PATH="/actual/path"`
- Make sure the path points to your `.uproject` file's directory

### "Permission denied"
- On macOS/Linux: `chmod +x init.sh`
- On Windows: Run PowerShell as Administrator

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