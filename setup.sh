#!/bin/bash

# ============================================================================
# UEMCP Complete Setup Script
# Handles environment setup AND MCP configuration - no sub-scripts needed!
# ============================================================================

set -e  # Exit on error

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# ============================================================================
# Parse Command Line Arguments
# ============================================================================

PROJECT_PATH=""  # Will default to ./Demo if exists and not specified
INTERACTIVE=true
SYMLINK=""  # Empty means ask, "true" means symlink, "false" means copy
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT_PATH="$2"
            shift 2
            ;;
        --symlink)
            SYMLINK="true"
            shift
            ;;
        --copy)
            SYMLINK="false"
            shift
            ;;
        --no-interactive)
            INTERACTIVE=false
            shift
            ;;
        --help|-h)
            SHOW_HELP=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            SHOW_HELP=true
            shift
            ;;
    esac
done

# ============================================================================
# Colors for output
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}$1${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_section() {
    echo ""
    echo -e "${CYAN}$1${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/redhat-release ]; then
            echo "rhel"
        elif [ -f /etc/debian_version ]; then
            echo "debian"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Get Claude Desktop config directory based on OS
get_claude_desktop_config_dir() {
    case "$(uname -s)" in
        Darwin)
            echo "$HOME/Library/Application Support/Claude"
            ;;
        Linux)
            echo "$HOME/.config/claude"
            ;;
        MINGW*|CYGWIN*|MSYS*)
            if [ -n "$APPDATA" ]; then
                echo "$APPDATA/Claude"
            else
                echo "$HOME/AppData/Roaming/Claude"
            fi
            ;;
        *)
            echo "$HOME/.config/claude"
            ;;
    esac
}

# Get Claude Code config directory
get_claude_code_config_dir() {
    echo "$HOME/.config/claude-code"
}

# Check if Claude Desktop is installed
is_claude_desktop_installed() {
    local claude_dir=$(get_claude_desktop_config_dir)
    
    # Check if directory exists or if Claude Desktop app is installed
    if [ -d "$claude_dir" ]; then
        return 0
    fi
    
    # macOS specific check
    if [ "$(detect_os)" = "macos" ] && [ -d "/Applications/Claude.app" ]; then
        return 0
    fi
    
    return 1
}

# Check if Claude Code is installed/configured
is_claude_code_installed() {
    # Check if claude CLI is installed
    if command_exists claude; then
        return 0
    fi
    
    # Check if claude-code config directory exists
    local claude_code_dir=$(get_claude_code_config_dir)
    if [ -d "$claude_code_dir" ]; then
        return 0
    fi
    
    return 1
}

# Check if Amazon Q is installed
is_amazon_q_installed() {
    # Check for VS Code extension
    if command_exists code; then
        if code --list-extensions 2>/dev/null | grep -q "amazonwebservices.amazon-q-vscode"; then
            return 0
        fi
    fi
    
    # Check for JetBrains plugin (common paths)
    for ide_dir in "$HOME/.config/JetBrains"* "$HOME/Library/Application Support/JetBrains"*; do
        if [ -d "$ide_dir" ] && find "$ide_dir" -name "*amazon-q*" -o -name "*codewhisperer*" 2>/dev/null | grep -q .; then
            return 0
        fi
    done
    
    return 1
}

# Check if Google Gemini is available (CLI or Code Assist)
is_gemini_installed() {
    # Check for Gemini CLI
    if command_exists gemini || command_exists gemini-cli; then
        return 0
    fi
    
    # Check for VS Code extension
    if command_exists code; then
        if code --list-extensions 2>/dev/null | grep -q "google.gemini-code-assist"; then
            return 0
        fi
    fi
    
    # Check for config directory
    if [ -d "$HOME/.config/gemini-code-assist" ] || [ -d "$HOME/.gemini" ]; then
        return 0
    fi
    
    return 1
}

# Check if OpenAI Codex or GitHub Copilot is installed
is_copilot_installed() {
    # Check for OpenAI Codex CLI
    if command_exists codex || command_exists openai || command_exists openai-codex; then
        return 0
    fi
    
    # Check for VS Code extension
    if command_exists code; then
        if code --list-extensions 2>/dev/null | grep -q "GitHub.copilot"; then
            return 0
        fi
    fi
    
    # Check for JetBrains plugin
    for ide_dir in "$HOME/.config/JetBrains"* "$HOME/Library/Application Support/JetBrains"*; do
        if [ -d "$ide_dir" ] && find "$ide_dir" -name "*copilot*" 2>/dev/null | grep -q .; then
            return 0
        fi
    done
    
    return 1
}

# Configure Claude Desktop
configure_claude_desktop() {
    local project_path="$1"
    
    log_info "Configuring Claude Desktop..."
    
    local CLAUDE_CONFIG_DIR=$(get_claude_desktop_config_dir)
    local CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
    
    # Create config directory if it doesn't exist
    if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
        mkdir -p "$CLAUDE_CONFIG_DIR"
    fi
    
    # Read existing config or create new one
    if [ -f "$CLAUDE_CONFIG_FILE" ]; then
        log_info "Updating existing Claude Desktop configuration..."
    else
        log_info "Creating new Claude Desktop configuration..."
        echo '{}' > "$CLAUDE_CONFIG_FILE"
    fi
    
    # Update configuration using Python (or fallback to manual message)
    if [ "$PYTHON_INSTALLED" = true ]; then
        SERVER_PATH="$SCRIPT_DIR/server/dist/index.js"
        
        $PYTHON_CMD -c "
import json
import sys

config_file = '$CLAUDE_CONFIG_FILE'
server_path = '$SERVER_PATH'
project_path = '$project_path' if '$project_path' else None

# Read existing config
try:
    with open(config_file, 'r') as f:
        config = json.load(f)
except:
    config = {}

# Ensure mcpServers exists
if 'mcpServers' not in config:
    config['mcpServers'] = {}

# Configure UEMCP
config['mcpServers']['uemcp'] = {
    'command': 'node',
    'args': [server_path]
}

# Add project path if available
if project_path:
    config['mcpServers']['uemcp']['env'] = {
        'UE_PROJECT_PATH': project_path
    }

# Write config
with open(config_file, 'w') as f:
    json.dump(config, f, indent=2)

print('Claude Desktop configuration updated')
" && log_success "Claude Desktop configured" || log_warning "Could not update Claude Desktop config automatically"
    else
        log_warning "Please manually add UEMCP to Claude Desktop config:"
        echo "  Config file: $CLAUDE_CONFIG_FILE"
        echo "  Server path: $SCRIPT_DIR/server/dist/index.js"
    fi
}

# Configure Claude Code
configure_claude_code() {
    local project_path="$1"
    
    log_info "Configuring Claude Code..."
    
    # Check if claude mcp CLI is installed
    if ! command_exists claude; then
        log_warning "Claude MCP CLI not found. Installing..."
        npm install -g @anthropic/claude-mcp
        if command_exists claude; then
            log_success "Claude MCP CLI installed"
        else
            log_error "Failed to install Claude MCP CLI"
            log_info "You can install it manually with: npm install -g @anthropic/claude-mcp"
            return 1
        fi
    fi
    
    # Configure using claude mcp add
    if command_exists claude; then
        SERVER_PATH="$SCRIPT_DIR/server/dist/index.js"
        ADD_COMMAND="claude mcp add uemcp node \"$SERVER_PATH\""
        
        # Add project path if available
        if [ -n "$project_path" ]; then
            ADD_COMMAND="$ADD_COMMAND -e \"UE_PROJECT_PATH=$project_path\""
        fi
        
        log_info "Adding UEMCP to Claude Code configuration..."
        eval $ADD_COMMAND && log_success "Claude Code configured!" || log_error "Failed to configure Claude Code"
        
        # Verify installation
        claude mcp list 2>/dev/null || true
    fi
}

# Provide instructions for Amazon Q
provide_amazon_q_instructions() {
    configure_amazon_q "$1"
}

# Configure Amazon Q
configure_amazon_q() {
    local project_path="$1"
    
    log_info "Configuring Amazon Q..."
    
    local AMAZON_Q_CONFIG_DIR="$HOME/.aws/amazonq/agents"
    local AMAZON_Q_CONFIG_FILE="$AMAZON_Q_CONFIG_DIR/default.json"
    
    # Create config directory if it doesn't exist
    if [ ! -d "$AMAZON_Q_CONFIG_DIR" ]; then
        mkdir -p "$AMAZON_Q_CONFIG_DIR"
    fi
    
    # Update configuration using Python (or provide manual instructions)
    if [ "$PYTHON_INSTALLED" = true ]; then
        SERVER_PATH="$SCRIPT_DIR/server/dist/index.js"
        
        $PYTHON_CMD -c "
import json
import sys
import os

config_file = '$AMAZON_Q_CONFIG_FILE'
server_path = '$SERVER_PATH'
project_path = '$project_path' if '$project_path' else None

# Read existing config or create new one
try:
    with open(config_file, 'r') as f:
        config = json.load(f)
except:
    config = {}

# Initialize mcpServers if not exists
if 'mcpServers' not in config:
    config['mcpServers'] = {}

# Add UEMCP server configuration
uemcp_config = {
    'command': 'node',
    'args': [server_path]
}

# Add project path as environment variable if provided
if project_path:
    uemcp_config['env'] = {
        'UEMCP_PROJECT_PATH': project_path
    }

# Check if UEMCP is already configured
if 'uemcp' not in config['mcpServers']:
    config['mcpServers']['uemcp'] = uemcp_config
    print('Added UEMCP MCP server to Amazon Q configuration')
else:
    # Update existing configuration
    config['mcpServers']['uemcp'] = uemcp_config
    print('Updated UEMCP MCP server in Amazon Q configuration')

# Write back the configuration
with open(config_file, 'w') as f:
    json.dump(config, f, indent=2)
    
print('Amazon Q configuration updated successfully')
" && log_success "Configured Amazon Q with UEMCP MCP server" || log_warning "Could not update Amazon Q config automatically"
    else
        log_warning "Python not available - please manually add to ~/.aws/amazonq/agents/default.json:"
        echo ""
        echo '  {
    "mcpServers": {
      "uemcp": {
        "command": "node",
        "args": ["'$SCRIPT_DIR'/server/dist/index.js"]
      }
    }
  }'
        echo ""
    fi
    
    log_info "Amazon Q MCP Configuration:"
    echo "  • UEMCP MCP server configured in ~/.aws/amazonq/agents/default.json"
    echo "  • Restart your IDE for changes to take effect"
    echo "  • The MCP server will start automatically when you use Amazon Q"
    echo ""
}

# Configure Gemini (both CLI and Code Assist use the same config)
provide_gemini_instructions() {
    configure_gemini "$1"
}

# Configure Google Gemini (CLI and Code Assist)
configure_gemini() {
    local project_path="$1"
    
    log_info "Configuring Google Gemini..."
    
    local GEMINI_CONFIG_DIR="$HOME/.gemini"
    local GEMINI_CONFIG_FILE="$GEMINI_CONFIG_DIR/settings.json"
    
    # Create config directory if it doesn't exist
    if [ ! -d "$GEMINI_CONFIG_DIR" ]; then
        mkdir -p "$GEMINI_CONFIG_DIR"
    fi
    
    # Update configuration using Python (or provide manual instructions)
    if [ "$PYTHON_INSTALLED" = true ]; then
        SERVER_PATH="$SCRIPT_DIR/server/dist/index.js"
        
        $PYTHON_CMD -c "
import json
import sys
import os

config_file = '$GEMINI_CONFIG_FILE'
server_path = '$SERVER_PATH'
project_path = '$project_path' if '$project_path' else None

# Read existing config or create new one
try:
    with open(config_file, 'r') as f:
        config = json.load(f)
except:
    config = {}

# Initialize mcpServers if not exists
if 'mcpServers' not in config:
    config['mcpServers'] = {}

# Add UEMCP server configuration
uemcp_config = {
    'command': 'node',
    'args': [server_path]
}

# Add project path as environment variable if provided
if project_path:
    uemcp_config['env'] = {
        'UEMCP_PROJECT_PATH': project_path
    }

# Check if UEMCP is already configured
if 'uemcp' not in config['mcpServers']:
    config['mcpServers']['uemcp'] = uemcp_config
    print('Added UEMCP MCP server to Gemini configuration')
else:
    # Update existing configuration
    config['mcpServers']['uemcp'] = uemcp_config
    print('Updated UEMCP MCP server in Gemini configuration')

# Write back the configuration
with open(config_file, 'w') as f:
    json.dump(config, f, indent=2)
    
print('Gemini configuration updated successfully')
" && log_success "Configured Google Gemini with UEMCP MCP server" || log_warning "Could not update Gemini config automatically"
    else
        log_warning "Python not available - please manually add to ~/.gemini/settings.json:"
        echo ""
        echo '  {
    "mcpServers": {
      "uemcp": {
        "command": "node",
        "args": ["'$SCRIPT_DIR'/server/dist/index.js"]
      }
    }
  }'
        echo ""
    fi
    
    log_info "Google Gemini MCP Configuration:"
    echo "  • UEMCP MCP server configured in ~/.gemini/settings.json"
    echo "  • Works with both Gemini CLI and Gemini Code Assist"
    echo "  • Restart your IDE for changes to take effect"
    echo "  • The MCP server will start automatically when you use Gemini"
    echo ""
    log_warning "Security Note: MCP servers run with your user permissions."
    echo "Make sure you trust the UEMCP source code before using."
    echo ""
}

# Configure or provide instructions for Copilot/Codex
provide_copilot_instructions() {
    # Check if it's Codex CLI or Copilot
    if command_exists codex || command_exists openai || command_exists openai-codex; then
        configure_codex "$1"
    else
        log_info "GitHub Copilot detected!"
        echo ""
        log_warning "GitHub Copilot doesn't directly support MCP servers."
        echo "However, you can:"
        echo ""
        echo "  1. Run the MCP server alongside Copilot:"
        echo "     node $SCRIPT_DIR/server/dist/index.js"
        echo ""
        echo "  2. Use Copilot to generate code that calls the MCP endpoints"
        echo ""
        echo "  3. See test-connection.js for usage examples"
        echo ""
    fi
}

# Configure OpenAI Codex
configure_codex() {
    local project_path="$1"
    
    log_info "Configuring OpenAI Codex..."
    
    local CODEX_CONFIG_DIR="$HOME/.codex"
    local CODEX_CONFIG_FILE="$CODEX_CONFIG_DIR/config.toml"
    
    # Create config directory if it doesn't exist
    if [ ! -d "$CODEX_CONFIG_DIR" ]; then
        mkdir -p "$CODEX_CONFIG_DIR"
    fi
    
    # Check if config file exists
    if [ -f "$CODEX_CONFIG_FILE" ]; then
        log_info "Found existing Codex configuration"
        
        # Add UEMCP project to trusted projects
        if [ -n "$project_path" ]; then
            log_info "Adding $project_path to Codex trusted projects..."
            
            # Use Python to update TOML if available
            if [ "$PYTHON_INSTALLED" = true ]; then
                $PYTHON_CMD -c "
import sys
import os

# Try to import toml, install if not available
try:
    import toml
except ImportError:
    print('Installing toml library...')
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'toml'])
    import toml

config_file = '$CODEX_CONFIG_FILE'
project_path = '$project_path'
script_dir = '$SCRIPT_DIR'

# Read existing config
try:
    with open(config_file, 'r') as f:
        config = toml.load(f)
except:
    config = {}

# Initialize projects if not exists
if 'projects' not in config:
    config['projects'] = {}

# Add both the UE project and UEMCP directory as trusted
paths_to_add = []
if project_path:
    paths_to_add.append(project_path)
paths_to_add.append(script_dir)

for path in paths_to_add:
    if path not in config['projects']:
        config['projects'][path] = {'trust_level': 'trusted'}
        print(f'Added {path} to trusted projects')
    else:
        print(f'{path} already in trusted projects')

# Write back
with open(config_file, 'w') as f:
    toml.dump(config, f)
    
print('Codex configuration updated successfully')
" || log_warning "Could not update Codex config automatically"
            else
                log_warning "Python not available - please manually add these to ~/.codex/config.toml:"
                echo "  $project_path = { trust_level = \"trusted\" }"
                echo "  $SCRIPT_DIR = { trust_level = \"trusted\" }"
            fi
        fi
        
        log_success "Codex configuration complete"
        echo ""
        log_info "To use UEMCP with Codex:"
        echo "  1. The UEMCP directory has been added as a trusted project"
        echo "  2. Run the MCP server: node $SCRIPT_DIR/server/dist/index.js"
        echo "  3. Codex can now interact with your UE project through UEMCP"
        echo ""
    else
        log_info "Creating new Codex configuration..."
        
        # Create basic config
        cat > "$CODEX_CONFIG_FILE" << EOF
# OpenAI Codex Configuration
[projects]
EOF
        
        if [ -n "$project_path" ]; then
            echo "\"$project_path\" = { trust_level = \"trusted\" }" >> "$CODEX_CONFIG_FILE"
        fi
        echo "\"$SCRIPT_DIR\" = { trust_level = \"trusted\" }" >> "$CODEX_CONFIG_FILE"
        
        log_success "Created Codex configuration with UEMCP as trusted project"
    fi
}

# ============================================================================
# Help Message
# ============================================================================

if [ "$SHOW_HELP" = true ]; then
    echo "UEMCP Complete Setup Script"
    echo ""
    echo "This script handles everything:"
    echo "  • Installs Node.js if not present"
    echo "  • Installs Python if not present"
    echo "  • Sets up virtual environment"
    echo "  • Installs all dependencies"
    echo "  • Builds the MCP server"
    echo "  • Detects and configures AI tools (Claude, Q, Gemini, etc.)"
    echo "  • Installs the UE plugin"
    echo ""
    echo "Usage:"
    echo "  ./setup.sh [options]"
    echo ""
    echo "Options:"
    echo "  --project <path>    Path to Unreal Engine project (will install plugin)"
    echo "  --symlink           Create symlink instead of copying plugin (dev mode)"
    echo "  --copy              Copy plugin files instead of symlinking"
    echo "  --no-interactive    Run without prompts (automation/CI)"
    echo "  --help              Show this help"
    echo ""
    echo "Examples:"
    echo "  ./setup.sh                                          # Interactive setup"
    echo "  ./setup.sh --project /path/to/project --symlink    # Dev setup"
    echo "  ./setup.sh --no-interactive                        # CI/automation"
    echo ""
    echo "The script will automatically detect installed AI tools:"
    echo "  • Claude Desktop"
    echo "  • Claude Code (claude.ai/code)"
    echo "  • Amazon Q (AWS)"
    echo "  • Google Gemini Code Assist"
    echo "  • GitHub Copilot"
    echo ""
    exit 0
fi

# ============================================================================
# Main Setup Process
# ============================================================================

if [ "$INTERACTIVE" = true ]; then
    clear
fi

log_info "╔════════════════════════════════════════╗"
log_info "║        UEMCP Complete Setup            ║"
log_info "║     Environment + MCP Configuration    ║"
log_info "╚════════════════════════════════════════╝"

OS=$(detect_os)
log_info "Detected OS: $OS"

# ============================================================================
# Install Node.js if not present
# ============================================================================

log_section "Checking Node.js..."

install_nodejs() {
    log_warning "Node.js not found. Installing..."
    
    case "$OS" in
        macos)
            if command_exists brew; then
                log_info "Installing Node.js via Homebrew..."
                brew install node
            else
                log_error "Homebrew not found. Please install Homebrew first:"
                echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
                exit 1
            fi
            ;;
        debian)
            log_info "Installing Node.js via apt..."
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        rhel)
            log_info "Installing Node.js via yum..."
            curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
            sudo yum install -y nodejs
            ;;
        *)
            log_warning "Automated Node.js installation not available for this OS"
            log_info "Attempting to install via nvm..."
            curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
            export NVM_DIR="$HOME/.nvm"
            [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
            nvm install --lts
            nvm use --lts
            ;;
    esac
}

if command_exists node; then
    NODE_VERSION=$(node --version)
    log_success "Node.js $NODE_VERSION"
else
    install_nodejs
    if ! command_exists node; then
        log_error "Failed to install Node.js"
        echo "Please install Node.js manually from https://nodejs.org/"
        exit 1
    fi
    NODE_VERSION=$(node --version)
    log_success "Node.js $NODE_VERSION installed"
fi

# Check npm
if ! command_exists npm; then
    log_error "npm not found even though Node.js is installed"
    exit 1
fi
NPM_VERSION=$(npm --version)
log_success "npm $NPM_VERSION"

# ============================================================================
# Install Python if not present
# ============================================================================

log_section "Checking Python..."

PYTHON_CMD=""
PYTHON_INSTALLED=false
PYTHON_VERSION=""

install_python() {
    log_warning "Python 3 not found. Installing..."
    
    case "$OS" in
        macos)
            if command_exists brew; then
                log_info "Installing Python via Homebrew..."
                brew install python@3.11
                PYTHON_CMD="python3.11"
            else
                log_error "Homebrew not found. Please install Python manually."
                exit 1
            fi
            ;;
        debian)
            log_info "Installing Python via apt..."
            sudo apt-get update
            sudo apt-get install -y python3 python3-pip python3-venv
            PYTHON_CMD="python3"
            ;;
        rhel)
            log_info "Installing Python via yum..."
            sudo yum install -y python3 python3-pip
            PYTHON_CMD="python3"
            ;;
        *)
            log_warning "Please install Python 3 manually from https://python.org/"
            PYTHON_CMD=""
            ;;
    esac
}

# Check for Python 3
if command_exists python3; then
    PYTHON_CMD="python3"
    PYTHON_INSTALLED=true
elif command_exists python; then
    # Check if it's Python 3
    if python --version 2>&1 | grep -q "Python 3"; then
        PYTHON_CMD="python"
        PYTHON_INSTALLED=true
    fi
fi

if [ "$PYTHON_INSTALLED" = false ]; then
    install_python
    if [ -n "$PYTHON_CMD" ] && command_exists "$PYTHON_CMD"; then
        PYTHON_INSTALLED=true
    fi
fi

if [ "$PYTHON_INSTALLED" = true ]; then
    PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
    log_success "Python $PYTHON_VERSION"
else
    log_warning "Python 3 not installed - development features will be limited"
    log_info "Core UEMCP functionality will still work"
fi

# ============================================================================
# Install dependencies
# ============================================================================

log_section "Installing Node.js dependencies..."

cd "$SCRIPT_DIR/server"
npm install
log_success "Node.js dependencies installed"

log_section "Building MCP server..."
npm run build
log_success "Server built successfully!"

cd "$SCRIPT_DIR"

# ============================================================================
# Python Virtual Environment Setup
# ============================================================================

USE_VENV=false
VENV_DIR="$SCRIPT_DIR/venv"

if [ "$PYTHON_INSTALLED" = true ]; then
    log_section "Setting up Python environment..."
    
    # Check if venv already exists
    if [ -d "$VENV_DIR" ]; then
        log_info "Existing virtual environment found at $VENV_DIR"
        if [ "$INTERACTIVE" = true ]; then
            read -p "Use existing virtual environment? (Y/n): " use_existing
            # Convert to lowercase for comparison (compatible with older bash)
            use_existing_lower=$(echo "$use_existing" | tr '[:upper:]' '[:lower:]')
            if [ "$use_existing_lower" != "n" ]; then
                source "$VENV_DIR/bin/activate"
                USE_VENV=true
                log_success "Activated existing virtual environment"
            fi
        else
            source "$VENV_DIR/bin/activate"
            USE_VENV=true
            log_success "Activated existing virtual environment"
        fi
    fi
    
    # Create new venv if needed
    if [ "$USE_VENV" = false ]; then
        # Check for pyenv-virtualenv
        if command_exists pyenv && pyenv virtualenv --help >/dev/null 2>&1; then
            log_info "pyenv-virtualenv detected"
            if [ "$INTERACTIVE" = true ]; then
                read -p "Create virtual environment with pyenv? (y/N): " use_pyenv
                # Convert to lowercase for comparison
                use_pyenv_lower=$(echo "$use_pyenv" | tr '[:upper:]' '[:lower:]')
                if [ "$use_pyenv_lower" = "y" ]; then
                    pyenv virtualenv 3.11 uemcp
                    pyenv local uemcp
                    USE_VENV=true
                    log_success "Created pyenv virtual environment"
                fi
            fi
        fi
        
        # Use standard venv
        if [ "$USE_VENV" = false ]; then
            log_info "Creating Python virtual environment..."
            if $PYTHON_CMD -m venv "$VENV_DIR"; then
                source "$VENV_DIR/bin/activate"
                USE_VENV=true
                log_success "Created and activated virtual environment"
            else
                log_warning "Could not create virtual environment"
            fi
        fi
    fi
    
    # Install Python dependencies in venv
    if [ "$USE_VENV" = true ]; then
        log_section "Installing Python development dependencies..."
        
        # Ask in interactive mode
        INSTALL_PYTHON_DEPS=true
        if [ "$INTERACTIVE" = true ]; then
            echo ""
            log_info "Python development dependencies are optional."
            log_info "They provide testing and linting tools but are not required for core functionality."
            read -p "Install Python development dependencies? (Y/n): " install_py
            # Convert to lowercase for comparison
            install_py_lower=$(echo "$install_py" | tr '[:upper:]' '[:lower:]')
            if [ "$install_py_lower" = "n" ]; then
                INSTALL_PYTHON_DEPS=false
            fi
        fi
        
        if [ "$INSTALL_PYTHON_DEPS" = true ]; then
            if pip install -r "$SCRIPT_DIR/requirements-dev.txt"; then
                log_success "Python dependencies installed"
            else
                log_warning "Some Python dependencies failed to install"
                log_info "This won't affect core UEMCP functionality"
            fi
        else
            log_info "Skipping Python dependencies"
        fi
    fi
fi

# ============================================================================
# Handle UE Project Path and Plugin Installation
# ============================================================================

log_section "Unreal Engine Project Configuration..."

# Function to install plugin
install_plugin() {
    local project_path="$1"
    local use_symlink="$2"
    
    local plugins_dir="$project_path/Plugins"
    local uemcp_plugin_dir="$plugins_dir/UEMCP"
    local source_plugin_dir="$SCRIPT_DIR/plugin"
    
    # Check if source plugin exists
    if [ ! -d "$source_plugin_dir" ]; then
        log_error "Plugin source not found!"
        return 1
    fi
    
    # Create Plugins directory if it doesn't exist
    if [ ! -d "$plugins_dir" ]; then
        mkdir -p "$plugins_dir"
        log_success "Created Plugins directory"
    fi
    
    # Check if plugin already exists
    if [ -e "$uemcp_plugin_dir" ]; then
        if [ -L "$uemcp_plugin_dir" ]; then
            local link_target=$(readlink "$uemcp_plugin_dir")
            log_warning "UEMCP plugin already exists as symlink → $link_target"
            if [ "$INTERACTIVE" = true ]; then
                read -p "Update existing symlink? (y/N): " update_link
                # Convert to lowercase for comparison
                update_link_lower=$(echo "$update_link" | tr '[:upper:]' '[:lower:]')
                if [ "$update_link_lower" != "y" ]; then
                    log_info "Keeping existing symlink"
                    return 0
                fi
            else
                log_info "Keeping existing symlink"
                return 0
            fi
            rm "$uemcp_plugin_dir"
        else
            log_warning "UEMCP plugin already exists in project"
            if [ "$INTERACTIVE" = true ]; then
                read -p "Replace existing plugin? (y/N): " replace_plugin
                # Convert to lowercase for comparison
                replace_plugin_lower=$(echo "$replace_plugin" | tr '[:upper:]' '[:lower:]')
                if [ "$replace_plugin_lower" != "y" ]; then
                    log_info "Keeping existing plugin"
                    return 0
                fi
            else
                log_info "Keeping existing plugin"
                return 0
            fi
            rm -rf "$uemcp_plugin_dir"
        fi
    fi
    
    # Install plugin
    if [ "$use_symlink" = "true" ]; then
        local absolute_source=$(cd "$source_plugin_dir" && pwd)
        ln -s "$absolute_source" "$uemcp_plugin_dir"
        log_success "Created symlink: $uemcp_plugin_dir → $absolute_source"
    else
        cp -r "$source_plugin_dir" "$uemcp_plugin_dir"
        log_success "Copied UEMCP plugin to project"
    fi
    
    # Update .uproject file
    local uproject_file=$(find "$project_path" -maxdepth 1 -name "*.uproject" | head -1)
    if [ -n "$uproject_file" ]; then
        # Use Python to update JSON if available, otherwise skip
        if [ "$PYTHON_INSTALLED" = true ]; then
            $PYTHON_CMD -c "
import json
import sys

uproject_file = '$uproject_file'
with open(uproject_file, 'r') as f:
    uproject = json.load(f)

if 'Plugins' not in uproject:
    uproject['Plugins'] = []

if not any(p.get('Name') == 'UEMCP' for p in uproject['Plugins']):
    uproject['Plugins'].append({'Name': 'UEMCP', 'Enabled': True})
    
    with open(uproject_file, 'w') as f:
        json.dump(uproject, f, indent=2)
    print('Updated project file to enable UEMCP plugin')
else:
    print('UEMCP already in project file')
" && log_success "Updated project file" || log_warning "Could not update .uproject file"
        fi
    fi
    
    return 0
}

# Get project path
if [ -z "$PROJECT_PATH" ] && [ "$INTERACTIVE" = true ]; then
    echo ""
    # Default to ./Demo if it exists
    DEFAULT_PROJECT=""
    if [ -d "$SCRIPT_DIR/Demo" ]; then
        DEFAULT_PROJECT="$SCRIPT_DIR/Demo"
        log_info "Found Demo project at $DEFAULT_PROJECT"
    fi
    
    if [ -n "$DEFAULT_PROJECT" ]; then
        read -p "Enter the path to your Unreal Engine project (default: $DEFAULT_PROJECT): " PROJECT_PATH
        # Use default if user just pressed Enter
        if [ -z "$PROJECT_PATH" ]; then
            PROJECT_PATH="$DEFAULT_PROJECT"
        fi
    else
        read -p "Enter the path to your Unreal Engine project (or press Enter to skip): " PROJECT_PATH
    fi
fi

VALID_PROJECT_PATH=""
if [ -n "$PROJECT_PATH" ]; then
    # Expand tilde
    PROJECT_PATH="${PROJECT_PATH/#\~/$HOME}"
    
    if [ -d "$PROJECT_PATH" ]; then
        VALID_PROJECT_PATH="$PROJECT_PATH"
        log_success "Project path verified: $VALID_PROJECT_PATH"
        
        # Ask about plugin installation
        SHOULD_INSTALL_PLUGIN=true
        if [ "$INTERACTIVE" = true ]; then
            read -p "Install UEMCP plugin to this project? (Y/n): " install_plugin_answer
            # Convert to lowercase for comparison
            install_plugin_answer_lower=$(echo "$install_plugin_answer" | tr '[:upper:]' '[:lower:]')
            if [ "$install_plugin_answer_lower" = "n" ]; then
                SHOULD_INSTALL_PLUGIN=false
            fi
        fi
        
        if [ "$SHOULD_INSTALL_PLUGIN" = true ]; then
            # Determine symlink vs copy
            USE_SYMLINK="$SYMLINK"
            if [ -z "$USE_SYMLINK" ] && [ "$INTERACTIVE" = true ]; then
                echo ""
                log_info "Choose installation method:"
                echo "  1. Symlink (recommended for development - changes reflect immediately)"
                echo "  2. Copy (recommended for production - isolated from source)"
                read -p "Select [1-2] (default: 1): " method
                if [ "$method" = "2" ]; then
                    USE_SYMLINK="false"
                else
                    USE_SYMLINK="true"
                fi
            elif [ -z "$USE_SYMLINK" ]; then
                USE_SYMLINK="true"  # Default to symlink
            fi
            
            install_plugin "$VALID_PROJECT_PATH" "$USE_SYMLINK"
        fi
    else
        log_warning "Project path not found: $PROJECT_PATH"
    fi
fi

# ============================================================================
# Detect and Configure AI Tools
# ============================================================================

log_section "Detecting AI Development Tools..."

TOOLS_DETECTED=0
TOOLS_CONFIGURED=""

# Check for Claude Desktop
if is_claude_desktop_installed; then
    log_success "Claude Desktop detected"
    TOOLS_DETECTED=$((TOOLS_DETECTED + 1))
    
    if [ "$INTERACTIVE" = true ]; then
        read -p "Configure UEMCP for Claude Desktop? (Y/n): " configure_claude
        configure_claude_lower=$(echo "$configure_claude" | tr '[:upper:]' '[:lower:]')
        if [ "$configure_claude_lower" != "n" ]; then
            configure_claude_desktop "$VALID_PROJECT_PATH"
            TOOLS_CONFIGURED="$TOOLS_CONFIGURED • Claude Desktop\n"
        fi
    else
        configure_claude_desktop "$VALID_PROJECT_PATH"
        TOOLS_CONFIGURED="$TOOLS_CONFIGURED • Claude Desktop\n"
    fi
fi

# Check for Claude Code
if is_claude_code_installed; then
    log_success "Claude Code detected"
    TOOLS_DETECTED=$((TOOLS_DETECTED + 1))
    
    if [ "$INTERACTIVE" = true ]; then
        read -p "Configure UEMCP for Claude Code? (Y/n): " configure_code
        configure_code_lower=$(echo "$configure_code" | tr '[:upper:]' '[:lower:]')
        if [ "$configure_code_lower" != "n" ]; then
            configure_claude_code "$VALID_PROJECT_PATH"
            TOOLS_CONFIGURED="$TOOLS_CONFIGURED • Claude Code\n"
        fi
    else
        configure_claude_code "$VALID_PROJECT_PATH"
        TOOLS_CONFIGURED="$TOOLS_CONFIGURED • Claude Code\n"
    fi
else
    # Offer to install Claude Code if not detected
    if [ "$INTERACTIVE" = true ]; then
        echo ""
        log_info "Claude Code not detected."
        read -p "Would you like to set up Claude Code (claude.ai/code)? (y/N): " setup_code
        setup_code_lower=$(echo "$setup_code" | tr '[:upper:]' '[:lower:]')
        if [ "$setup_code_lower" = "y" ]; then
            configure_claude_code "$VALID_PROJECT_PATH"
            TOOLS_CONFIGURED="$TOOLS_CONFIGURED • Claude Code\n"
        fi
    fi
fi

# Check for Amazon Q
if is_amazon_q_installed; then
    log_success "Amazon Q detected"
    TOOLS_DETECTED=$((TOOLS_DETECTED + 1))
    
    if [ "$INTERACTIVE" = true ]; then
        read -p "Configure UEMCP for Amazon Q? (Y/n): " configure_q
        configure_q_lower=$(echo "$configure_q" | tr '[:upper:]' '[:lower:]')
        if [ "$configure_q_lower" != "n" ]; then
            provide_amazon_q_instructions "$VALID_PROJECT_PATH"
            TOOLS_CONFIGURED="$TOOLS_CONFIGURED • Amazon Q\n"
        fi
    else
        provide_amazon_q_instructions "$VALID_PROJECT_PATH"
        TOOLS_CONFIGURED="$TOOLS_CONFIGURED • Amazon Q\n"
    fi
fi

# Check for Gemini
if is_gemini_installed; then
    # Determine what type of Gemini installation for logging
    if command_exists gemini || command_exists gemini-cli; then
        log_success "Google Gemini CLI detected"
    else
        log_success "Google Gemini Code Assist detected"
    fi
    TOOLS_DETECTED=$((TOOLS_DETECTED + 1))
    
    if [ "$INTERACTIVE" = true ]; then
        read -p "Configure UEMCP for Google Gemini? (Y/n): " configure_gemini_answer
        configure_gemini_lower=$(echo "$configure_gemini_answer" | tr '[:upper:]' '[:lower:]')
        if [ "$configure_gemini_lower" != "n" ]; then
            provide_gemini_instructions "$VALID_PROJECT_PATH"
            TOOLS_CONFIGURED="$TOOLS_CONFIGURED • Google Gemini\n"
        fi
    else
        provide_gemini_instructions "$VALID_PROJECT_PATH"
        TOOLS_CONFIGURED="$TOOLS_CONFIGURED • Google Gemini\n"
    fi
fi

# Check for Copilot/Codex
if is_copilot_installed; then
    # Determine what type of installation
    if command_exists codex || command_exists openai || command_exists openai-codex; then
        log_success "OpenAI Codex CLI detected"
        TOOLS_DETECTED=$((TOOLS_DETECTED + 1))
        
        if [ "$INTERACTIVE" = true ]; then
            read -p "Configure UEMCP for OpenAI Codex? (Y/n): " configure_codex_answer
            configure_codex_lower=$(echo "$configure_codex_answer" | tr '[:upper:]' '[:lower:]')
            if [ "$configure_codex_lower" != "n" ]; then
                provide_copilot_instructions "$VALID_PROJECT_PATH"
                TOOLS_CONFIGURED="$TOOLS_CONFIGURED • OpenAI Codex\n"
            fi
        else
            provide_copilot_instructions "$VALID_PROJECT_PATH"
            TOOLS_CONFIGURED="$TOOLS_CONFIGURED • OpenAI Codex\n"
        fi
    else
        log_success "GitHub Copilot detected"
        TOOLS_DETECTED=$((TOOLS_DETECTED + 1))
        
        if [ "$INTERACTIVE" = true ]; then
            read -p "Show instructions for using UEMCP with GitHub Copilot? (Y/n): " show_copilot
            show_copilot_lower=$(echo "$show_copilot" | tr '[:upper:]' '[:lower:]')
            if [ "$show_copilot_lower" != "n" ]; then
                provide_copilot_instructions "$VALID_PROJECT_PATH"
            fi
        fi
    fi
fi

if [ $TOOLS_DETECTED -eq 0 ]; then
    log_warning "No AI development tools detected"
    echo ""
    log_info "UEMCP works best with Claude Desktop or Claude Code."
    log_info "You can install them from:"
    echo "  • Claude Desktop: https://claude.ai/download"
    echo "  • Claude Code: npm install -g @anthropic/claude-mcp"
    echo ""
fi

# ============================================================================
# Verify test script exists
# ============================================================================

if [ -f "$SCRIPT_DIR/test-connection.js" ]; then
    log_success "Test script available: test-connection.js"
else
    log_warning "test-connection.js not found in repository"
fi

# ============================================================================
# Final Summary
# ============================================================================

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
log_success "🎉 UEMCP Setup Complete!"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo ""

echo -e "${CYAN}Environment Summary:${NC}"
echo "  • Node.js: $NODE_VERSION"
echo "  • npm: $NPM_VERSION"

if [ "$PYTHON_INSTALLED" = true ]; then
    if [ "$USE_VENV" = true ]; then
        echo "  • Python: $PYTHON_VERSION (virtual environment)"
    else
        echo "  • Python: $PYTHON_VERSION"
    fi
fi

echo "  • MCP Server: Built and ready"

if [ -n "$TOOLS_CONFIGURED" ]; then
    echo ""
    echo -e "${CYAN}Configured AI Tools:${NC}"
    echo -e "$TOOLS_CONFIGURED"
fi

if [ -n "$VALID_PROJECT_PATH" ]; then
    echo "  • Project: $VALID_PROJECT_PATH"
    if [ "$SHOULD_INSTALL_PLUGIN" = true ]; then
        if [ "$USE_SYMLINK" = "true" ]; then
            echo "  • Plugin: Symlinked to project"
        else
            echo "  • Plugin: Copied to project"
        fi
    fi
fi

echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Start Unreal Engine with your project"
echo "  2. Restart any configured AI tools (Claude Desktop/Code)"
echo "  3. Test the connection: node test-connection.js"
echo "  4. Try in your AI tool: \"List available UEMCP tools\""

if [ "$USE_VENV" = true ] && [ -d "$VENV_DIR" ]; then
    echo ""
    echo -e "${CYAN}Development Tools:${NC}"
    echo "  • Activate venv: source venv/bin/activate"
    echo "  • Run tests: pytest"
    echo "  • Lint code: flake8 or ruff"
    echo "  • Format code: black ."
fi

echo ""
echo -e "${CYAN}Quick Commands:${NC}"
echo "  • View logs: DEBUG=uemcp:* node test-connection.js"
echo "  • Rebuild server: cd server && npm run build"
echo "  • Hot reload in UE: restart_listener()"

echo ""
log_success "Happy coding with UEMCP! 🚀"