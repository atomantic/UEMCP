#!/bin/bash

# UEMCP Complete Setup Script
# Handles all prerequisites: Node.js, Python, virtual environments, and dependencies
# Then runs init.js for MCP-specific configuration

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Helper functions
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_section() {
    echo ""
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}$(echo "$1" | sed 's/./=/g')${NC}"
}

# Banner
echo -e "${MAGENTA}"
echo "╔════════════════════════════════════════════╗"
echo "║                                            ║"
echo "║            UEMCP Setup Script              ║"
echo "║     Complete Environment Setup             ║"
echo "║                                            ║"
echo "╚════════════════════════════════════════════╝"
echo -e "${NC}"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Detect OS
OS="Unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    OS="Windows (WSL/Git Bash)"
fi

log_info "Detected OS: $OS"
log_info "Setup directory: $SCRIPT_DIR"

# ============================================================================
# Node.js Installation
# ============================================================================

install_nodejs() {
    log_section "Installing Node.js"
    
    if [[ "$OS" == "macOS" ]]; then
        if command -v brew &> /dev/null; then
            log_info "Installing Node.js via Homebrew..."
            if brew install node; then
                log_success "Node.js installed via Homebrew"
                return 0
            else
                log_warning "Homebrew installation failed"
            fi
        fi
    elif [[ "$OS" == "Linux" ]]; then
        if command -v apt-get &> /dev/null; then
            log_info "Installing Node.js via apt-get..."
            log_warning "This may require sudo password"
            if curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs; then
                log_success "Node.js installed via apt-get"
                return 0
            else
                log_warning "apt-get installation failed"
            fi
        elif command -v yum &> /dev/null; then
            log_info "Installing Node.js via yum..."
            log_warning "This may require sudo password"
            if curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash - && sudo yum install -y nodejs; then
                log_success "Node.js installed via yum"
                return 0
            else
                log_warning "yum installation failed"
            fi
        fi
    fi
    
    # Try nvm as fallback
    log_info "Attempting to install via nvm (Node Version Manager)..."
    
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        log_info "nvm found, loading it..."
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    else
        log_info "Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi
    
    if command -v nvm &> /dev/null; then
        log_info "Installing Node.js LTS via nvm..."
        nvm install --lts
        nvm use --lts
        nvm alias default node
        
        if command -v node &> /dev/null; then
            log_success "Node.js installed successfully via nvm"
            return 0
        fi
    fi
    
    log_error "Could not install Node.js automatically"
    echo "Please install manually from: https://nodejs.org/"
    return 1
}

# ============================================================================
# Python Installation
# ============================================================================

install_python() {
    log_section "Installing Python 3"
    
    if [[ "$OS" == "macOS" ]]; then
        if command -v brew &> /dev/null; then
            log_info "Installing Python 3 via Homebrew..."
            if brew install python@3.11; then
                log_success "Python 3.11 installed via Homebrew"
                return 0
            else
                log_warning "Homebrew installation failed, trying python@3"
                if brew install python@3; then
                    log_success "Python 3 installed via Homebrew"
                    return 0
                fi
            fi
        fi
    elif [[ "$OS" == "Linux" ]]; then
        if command -v apt-get &> /dev/null; then
            log_info "Installing Python 3 via apt-get..."
            log_warning "This may require sudo password"
            if sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv; then
                log_success "Python 3 installed via apt-get"
                return 0
            else
                log_warning "apt-get installation failed"
            fi
        elif command -v yum &> /dev/null; then
            log_info "Installing Python 3 via yum..."
            log_warning "This may require sudo password"
            if sudo yum install -y python3 python3-pip; then
                log_success "Python 3 installed via yum"
                return 0
            else
                log_warning "yum installation failed"
            fi
        fi
    fi
    
    # Try pyenv as fallback
    log_info "Attempting to install via pyenv..."
    
    if ! command -v pyenv &> /dev/null; then
        if command -v curl &> /dev/null; then
            curl https://pyenv.run | bash
            export PATH="$HOME/.pyenv/bin:$PATH"
            eval "$(pyenv init -)"
        fi
    fi
    
    if command -v pyenv &> /dev/null; then
        log_info "Installing Python 3.11 via pyenv..."
        pyenv install 3.11
        pyenv global 3.11
        
        if command -v python3 &> /dev/null; then
            log_success "Python installed via pyenv"
            return 0
        fi
    fi
    
    log_error "Could not install Python automatically"
    echo "Please install Python 3.11+ manually"
    return 1
}

# ============================================================================
# Check Prerequisites
# ============================================================================

log_section "Checking Prerequisites"

# Check Node.js
NODE_INSTALLED=false
NODE_VERSION_OK=false
REQUIRED_NODE_VERSION=18

if command -v node &> /dev/null; then
    NODE_INSTALLED=true
    NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
    
    if [ "$NODE_VERSION" -ge "$REQUIRED_NODE_VERSION" ]; then
        NODE_VERSION_OK=true
        log_success "Node.js $(node --version) is installed"
    else
        log_warning "Node.js $(node --version) is installed but version $REQUIRED_NODE_VERSION+ is required"
    fi
fi

if [ "$NODE_INSTALLED" = false ]; then
    log_warning "Node.js is not installed"
    read -p "Install Node.js automatically? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if install_nodejs; then
            if [ -s "$HOME/.nvm/nvm.sh" ]; then
                export NVM_DIR="$HOME/.nvm"
                [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
            fi
            
            if command -v node &> /dev/null; then
                NODE_INSTALLED=true
                NODE_VERSION_OK=true
            fi
        fi
    else
        log_error "Node.js is required. Please install it manually."
        exit 1
    fi
elif [ "$NODE_VERSION_OK" = false ]; then
    log_warning "Node.js version $REQUIRED_NODE_VERSION+ is required"
    read -p "Update Node.js? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_nodejs
    else
        log_warning "Continuing with current version. Some features may not work."
    fi
fi

# Final Node.js check
if ! command -v node &> /dev/null; then
    log_error "Node.js installation failed"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm is not available"
    exit 1
fi

log_success "npm $(npm --version) is installed"

# Check Python
PYTHON_CMD=""
PYTHON_VERSION=""
PYTHON_INSTALLED=false

# Check for Python 3
for cmd in python3.11 python3.10 python3.9 python3 python; do
    if command -v $cmd &> /dev/null; then
        VERSION=$($cmd --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
        MAJOR=$(echo $VERSION | cut -d. -f1)
        MINOR=$(echo $VERSION | cut -d. -f2)
        
        if [ "$MAJOR" -eq 3 ] && [ "$MINOR" -ge 9 ]; then
            PYTHON_CMD=$cmd
            PYTHON_VERSION=$VERSION
            PYTHON_INSTALLED=true
            log_success "Python $VERSION found ($cmd)"
            break
        fi
    fi
done

if [ "$PYTHON_INSTALLED" = false ]; then
    log_warning "Python 3.9+ is not installed"
    read -p "Install Python automatically? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if install_python; then
            # Re-check for Python after installation
            for cmd in python3.11 python3.10 python3.9 python3 python; do
                if command -v $cmd &> /dev/null; then
                    VERSION=$($cmd --version 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)
                    MAJOR=$(echo $VERSION | cut -d. -f1)
                    MINOR=$(echo $VERSION | cut -d. -f2)
                    
                    if [ "$MAJOR" -eq 3 ] && [ "$MINOR" -ge 9 ]; then
                        PYTHON_CMD=$cmd
                        PYTHON_VERSION=$VERSION
                        PYTHON_INSTALLED=true
                        log_success "Python $VERSION installed"
                        break
                    fi
                fi
            done
        fi
    else
        log_warning "Python is optional but recommended for development tools"
    fi
fi

# ============================================================================
# Python Virtual Environment Setup
# ============================================================================

VENV_DIR="$SCRIPT_DIR/venv"
USE_VENV=false

if [ "$PYTHON_INSTALLED" = true ]; then
    log_section "Python Virtual Environment"
    
    # Check if we're already in a virtual environment
    if [ -n "$VIRTUAL_ENV" ]; then
        log_info "Already in a virtual environment: $VIRTUAL_ENV"
        USE_VENV=true
    # Check if venv directory exists
    elif [ -d "$VENV_DIR" ]; then
        log_info "Found existing virtual environment"
        source "$VENV_DIR/bin/activate" 2>/dev/null || source "$VENV_DIR/Scripts/activate" 2>/dev/null || true
        USE_VENV=true
    else
        # Check for pyenv-virtualenv
        if command -v pyenv &> /dev/null && pyenv commands | grep -q virtualenv; then
            log_info "Using pyenv-virtualenv for environment management"
            
            if ! pyenv virtualenvs | grep -q "uemcp"; then
                log_info "Creating pyenv virtual environment 'uemcp'..."
                pyenv virtualenv $PYTHON_VERSION uemcp
            fi
            
            log_info "Activating pyenv virtual environment 'uemcp'..."
            pyenv activate uemcp 2>/dev/null || eval "$(pyenv init -)" && pyenv activate uemcp
            USE_VENV=true
        # Use standard venv
        elif $PYTHON_CMD -m venv --help &> /dev/null; then
            log_info "Creating Python virtual environment..."
            
            if $PYTHON_CMD -m venv "$VENV_DIR"; then
                log_success "Virtual environment created"
                source "$VENV_DIR/bin/activate" 2>/dev/null || source "$VENV_DIR/Scripts/activate" 2>/dev/null
                USE_VENV=true
            else
                log_warning "Could not create virtual environment"
            fi
        else
            log_warning "venv module not available, using system Python"
        fi
    fi
    
    if [ "$USE_VENV" = true ]; then
        log_success "Virtual environment activated"
        log_info "Python: $(which python)"
    fi
fi

# ============================================================================
# Install Dependencies
# ============================================================================

log_section "Installing Dependencies"

# Install Node.js dependencies
log_info "Installing Node.js dependencies..."
cd "$SCRIPT_DIR/server"

if npm install; then
    log_success "Node.js dependencies installed"
else
    log_error "Failed to install Node.js dependencies"
    exit 1
fi

# Build the TypeScript server
log_info "Building MCP server..."
if npm run build; then
    log_success "Server built successfully"
else
    log_error "Server build failed"
    exit 1
fi

cd "$SCRIPT_DIR"

# Install Python dependencies if Python is available
if [ "$PYTHON_INSTALLED" = true ] && [ -f "$SCRIPT_DIR/requirements-dev.txt" ]; then
    log_info "Installing Python development dependencies (optional)..."
    
    # Ensure pip is up to date
    if [ "$USE_VENV" = true ]; then
        python -m pip install --upgrade pip &> /dev/null || true
    else
        $PYTHON_CMD -m pip install --user --upgrade pip &> /dev/null || true
    fi
    
    # Install dependencies
    if [ "$USE_VENV" = true ]; then
        # In venv, no need for --user flag
        if python -m pip install -r requirements-dev.txt; then
            log_success "Python dependencies installed in virtual environment"
        else
            log_warning "Some Python dependencies failed to install"
            log_info "This is OK - core functionality will still work"
        fi
    else
        # System Python, use --user flag
        if $PYTHON_CMD -m pip install --user -r requirements-dev.txt; then
            log_success "Python dependencies installed (user)"
        else
            log_warning "Some Python dependencies failed to install"
            log_info "This is OK - core functionality will still work"
        fi
    fi
else
    log_info "Skipping Python dependencies (not required for core functionality)"
fi

# ============================================================================
# Run MCP Configuration
# ============================================================================

log_section "Configuring MCP Server"

# Prepare environment variables
export UEMCP_SETUP_COMPLETE="true"
if [ "$USE_VENV" = true ]; then
    export UEMCP_VENV_PATH="$VIRTUAL_ENV"
fi

log_info "Starting MCP configuration..."
echo ""

# Pass all arguments to init.js, but skip dependency installation since we already did it
node "$SCRIPT_DIR/init.js" --skip-deps "$@"

EXIT_CODE=$?

# ============================================================================
# Final Summary
# ============================================================================

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    log_success "🎉 UEMCP Setup Complete!"
    echo -e "${GREEN}════════════════════════════════════════════${NC}"
    echo ""
    
    echo -e "${CYAN}Environment Summary:${NC}"
    echo "  • Node.js: $(node --version)"
    echo "  • npm: $(npm --version)"
    
    if [ "$PYTHON_INSTALLED" = true ]; then
        if [ "$USE_VENV" = true ]; then
            echo "  • Python: $PYTHON_VERSION (virtual environment)"
        else
            echo "  • Python: $PYTHON_VERSION"
        fi
    fi
    
    echo "  • MCP Server: Built and ready"
    echo "  • Dependencies: All installed"
    
    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo "  1. Restart Claude Desktop or Claude Code"
    echo "  2. Open your Unreal Engine project"
    echo "  3. Try in Claude: \"List available UEMCP tools\""
    echo "  4. Test locally: node test-connection.js"
    
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
else
    echo ""
    log_error "Setup encountered an issue (exit code: $EXIT_CODE)"
    log_info "Check the output above for details"
    echo ""
    echo "Troubleshooting:"
    echo "  • Check prerequisites: node --version && python3 --version"
    echo "  • Try manual setup: node init.js"
    echo "  • See docs: docs/development/troubleshooting.md"
fi

exit $EXIT_CODE