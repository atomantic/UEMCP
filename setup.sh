#!/bin/bash

# UEMCP Universal Setup Script
# This script ensures Node.js is installed and then runs the Node.js init script
# Supports macOS, Linux, and WSL

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
echo "║     Unreal Engine MCP Server Setup         ║"
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

# Function to install Node.js
install_nodejs() {
    log_section "Installing Node.js"
    
    # Check for package managers and install Node.js accordingly
    if [[ "$OS" == "macOS" ]]; then
        # Try Homebrew first
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
        # Try apt-get (Debian/Ubuntu)
        if command -v apt-get &> /dev/null; then
            log_info "Installing Node.js via apt-get..."
            log_warning "This may require sudo password"
            if curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs; then
                log_success "Node.js installed via apt-get"
                return 0
            else
                log_warning "apt-get installation failed"
            fi
        # Try yum (RHEL/CentOS/Fedora)
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
    
    # Try nvm (Node Version Manager) - works on all Unix-like systems
    log_info "Attempting to install via nvm (Node Version Manager)..."
    
    # Check if nvm is already installed
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        log_info "nvm found, loading it..."
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    else
        log_info "Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        
        # Load nvm
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    fi
    
    # Install latest LTS Node.js
    if command -v nvm &> /dev/null; then
        log_info "Installing Node.js LTS via nvm..."
        nvm install --lts
        nvm use --lts
        nvm alias default node
        
        # Verify installation
        if command -v node &> /dev/null; then
            log_success "Node.js installed successfully via nvm"
            log_info "Node.js version: $(node --version)"
            return 0
        fi
    fi
    
    # If all methods failed
    log_error "Could not install Node.js automatically"
    echo ""
    log_info "Please install Node.js manually from: ${GREEN}https://nodejs.org/${NC}"
    echo ""
    echo "Installation methods:"
    echo "  macOS:    brew install node"
    echo "  Ubuntu:   sudo apt-get install nodejs npm"
    echo "  Fedora:   sudo yum install nodejs npm"
    echo "  Windows:  Download from https://nodejs.org/"
    echo ""
    return 1
}

# Check for Node.js
log_section "Checking Prerequisites"

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

# Install or update Node.js if needed
if [ "$NODE_INSTALLED" = false ]; then
    log_warning "Node.js is not installed"
    
    read -p "Would you like to install Node.js automatically? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if install_nodejs; then
            # Reload shell to get node in PATH
            if [ -s "$HOME/.nvm/nvm.sh" ]; then
                export NVM_DIR="$HOME/.nvm"
                [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
            fi
            
            # Verify node is now available
            if command -v node &> /dev/null; then
                NODE_INSTALLED=true
                NODE_VERSION_OK=true
            fi
        fi
    else
        log_error "Node.js is required for UEMCP. Please install it manually."
        exit 1
    fi
elif [ "$NODE_VERSION_OK" = false ]; then
    log_warning "Node.js version $REQUIRED_NODE_VERSION+ is required"
    
    read -p "Would you like to update Node.js? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_nodejs
    else
        log_warning "Continuing with current Node.js version. Some features may not work."
    fi
fi

# Final check
if ! command -v node &> /dev/null; then
    log_error "Node.js installation failed or not in PATH"
    log_info "You may need to restart your terminal or run: source ~/.bashrc"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    log_error "npm is not available"
    log_info "npm usually comes with Node.js. Try reinstalling Node.js."
    exit 1
fi

log_success "npm $(npm --version) is installed"

# Now run the Node.js init script
log_section "Running UEMCP Initialization"

echo ""
log_info "Starting Node.js initialization script..."
echo ""

# Pass all arguments to init.js
node "$SCRIPT_DIR/init.js" "$@"

# Capture exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    log_success "🎉 UEMCP setup completed successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Restart Claude Desktop or Claude Code"
    echo "  2. Open your Unreal Engine project"
    echo "  3. Try: \"List available UEMCP tools\""
else
    echo ""
    log_error "Setup encountered an issue (exit code: $EXIT_CODE)"
    log_info "For help, check the documentation or run: node init.js --help"
fi

exit $EXIT_CODE