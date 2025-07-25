#!/bin/bash

# UEMCP Initialization Script
# This script sets up UEMCP for immediate use with Claude Code

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        UEMCP Initialization            ║${NC}"
echo -e "${BLUE}║   Unreal Engine MCP Server Setup       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Function to find Claude config directory
find_claude_config_dir() {
    local os_type=$(detect_os)
    local config_dir=""
    
    case $os_type in
        macos)
            config_dir="$HOME/Library/Application Support/Claude"
            ;;
        windows)
            config_dir="$APPDATA/Claude"
            ;;
        linux)
            config_dir="$HOME/.config/claude"
            ;;
        *)
            echo ""
            return
            ;;
    esac
    
    echo "$config_dir"
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed!${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

if ! command_exists python3; then
    echo -e "${YELLOW}⚠ Python 3 not found. Some features may be limited.${NC}"
    PYTHON_AVAILABLE=false
else
    echo -e "${GREEN}✓ Python $(python3 --version)${NC}"
    PYTHON_AVAILABLE=true
fi

# Install Node dependencies
echo ""
echo -e "${YELLOW}Installing dependencies...${NC}"
cd "$SCRIPT_DIR/server"
npm install --silent

# Build the server
echo ""
echo -e "${YELLOW}Building MCP server...${NC}"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Server built successfully!${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# Install Python dependencies if Python is available
if [ "$PYTHON_AVAILABLE" = true ]; then
    echo ""
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    cd "$SCRIPT_DIR"
    if [ -f "requirements-dev.txt" ]; then
        pip3 install -r requirements-dev.txt --quiet
        echo -e "${GREEN}✓ Python dependencies installed${NC}"
    fi
fi

# Configure Claude
echo ""
echo -e "${YELLOW}Configuring Claude integration...${NC}"

CLAUDE_CONFIG_DIR=$(find_claude_config_dir)

if [ -z "$CLAUDE_CONFIG_DIR" ]; then
    echo -e "${YELLOW}Could not detect Claude config directory automatically.${NC}"
    echo "Please specify your Claude config directory:"
    read -p "Claude config path: " CLAUDE_CONFIG_DIR
fi

# Create config directory if it doesn't exist
mkdir -p "$CLAUDE_CONFIG_DIR"

# Check if config already exists
CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
BACKUP_MADE=false

if [ -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}Found existing Claude config. Creating backup...${NC}"
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    BACKUP_MADE=true
    
    # Try to merge with existing config
    if command_exists jq; then
        # Use jq to merge configs if available
        echo -e "${BLUE}Merging with existing configuration...${NC}"
        TEMP_CONFIG=$(mktemp)
        jq --arg server_path "$SCRIPT_DIR/server/dist/index.js" \
           '.mcpServers.uemcp = {
                "command": "node",
                "args": [$server_path],
                "env": {
                    "DEBUG": "uemcp:*"
                }
            }' "$CONFIG_FILE" > "$TEMP_CONFIG"
        mv "$TEMP_CONFIG" "$CONFIG_FILE"
    else
        # Manual merge warning
        echo -e "${YELLOW}⚠ Cannot automatically merge configs (jq not installed).${NC}"
        echo -e "${YELLOW}Please manually add the UEMCP server to your config.${NC}"
    fi
else
    # Create new config
    cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "uemcp": {
      "command": "node",
      "args": ["$SCRIPT_DIR/server/dist/index.js"],
      "env": {
        "DEBUG": "uemcp:*"
      }
    }
  }
}
EOF
    echo -e "${GREEN}✓ Created Claude configuration${NC}"
fi

# Ask about UE project path
echo ""
echo -e "${YELLOW}Unreal Engine Project Setup${NC}"
echo "Enter the path to your Unreal Engine project (or press Enter to set up later):"
read -p "UE Project Path: " UE_PROJECT_PATH

if [ -n "$UE_PROJECT_PATH" ]; then
    # Expand tilde if present
    UE_PROJECT_PATH="${UE_PROJECT_PATH/#\~/$HOME}"
    
    # Verify the path exists
    if [ -d "$UE_PROJECT_PATH" ]; then
        # Update Claude config with project path
        if command_exists jq; then
            TEMP_CONFIG=$(mktemp)
            jq --arg project_path "$UE_PROJECT_PATH" \
               '.mcpServers.uemcp.env.UE_PROJECT_PATH = $project_path' "$CONFIG_FILE" > "$TEMP_CONFIG"
            mv "$TEMP_CONFIG" "$CONFIG_FILE"
            echo -e "${GREEN}✓ Project path configured${NC}"
        else
            echo -e "${YELLOW}Add this to your environment: export UE_PROJECT_PATH=\"$UE_PROJECT_PATH\"${NC}"
        fi
    else
        echo -e "${RED}❌ Directory not found: $UE_PROJECT_PATH${NC}"
        echo -e "${YELLOW}You can set this later with: export UE_PROJECT_PATH=\"/path/to/project\"${NC}"
    fi
fi

# Create a test script
echo ""
echo -e "${YELLOW}Creating test script...${NC}"
cat > "$SCRIPT_DIR/test-connection.sh" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Testing UEMCP connection..."
cd "$SCRIPT_DIR"
node test-uemcp-simple.js
EOF
chmod +x "$SCRIPT_DIR/test-connection.sh"

# Final summary
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✨ UEMCP Initialization Complete! ✨${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Configuration Summary:${NC}"
echo -e "  • Server Location: $SCRIPT_DIR/server/dist/index.js"
echo -e "  • Claude Config: $CONFIG_FILE"
if [ "$BACKUP_MADE" = true ]; then
    echo -e "  • Config Backup: $CONFIG_FILE.backup.*"
fi
if [ -n "$UE_PROJECT_PATH" ]; then
    echo -e "  • UE Project: $UE_PROJECT_PATH"
fi
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. ${YELLOW}Restart Claude Desktop${NC} to load the new configuration"
echo -e "  2. In a new Claude conversation, say: ${GREEN}\"List available UEMCP tools\"${NC}"
echo -e "  3. To test locally: ${GREEN}./test-connection.sh${NC}"
echo ""
if [ -z "$UE_PROJECT_PATH" ]; then
    echo -e "${YELLOW}Don't forget to set your UE project path:${NC}"
    echo -e "  export UE_PROJECT_PATH=\"/path/to/your/unreal/project\""
    echo ""
fi
echo -e "${BLUE}Documentation:${NC}"
echo -e "  • Quick Start: docs/quickstart.md"
echo -e "  • Environment Setup: docs/environment-setup.md"
echo -e "  • Troubleshooting: docs/troubleshooting.md"
echo ""
echo -e "${GREEN}Happy coding with UEMCP! 🚀${NC}"