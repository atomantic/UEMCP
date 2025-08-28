#!/bin/bash

# UEMCP Quick Setup Script
echo "🚀 UEMCP Setup Script"
echo "===================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "📁 UEMCP directory: $SCRIPT_DIR"

# Check for Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

log_success "Node.js found: $(node --version)"

# Check for npm
if ! command -v npm &> /dev/null; then
    log_error "npm is not installed. Please install npm."
    exit 1
fi

log_success "npm found: $(npm --version)"

# Check for Python (optional but recommended)
PYTHON_CMD=""
PIP_CMD=""

if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    if command -v pip3 &> /dev/null; then
        PIP_CMD="pip3"
    else
        PIP_CMD="python3 -m pip"
    fi
elif command -v python &> /dev/null; then
    # Check if it's Python 3
    if python --version 2>&1 | grep -q "Python 3"; then
        PYTHON_CMD="python"
        if command -v pip &> /dev/null; then
            PIP_CMD="pip"
        else
            PIP_CMD="python -m pip"
        fi
    fi
fi

if [ -n "$PYTHON_CMD" ]; then
    log_success "Python found: $($PYTHON_CMD --version 2>&1)"
    
    # Check if pip works
    if $PIP_CMD --version &> /dev/null; then
        log_success "pip is available"
    else
        log_warning "pip is not available. Python dependencies cannot be installed."
        PYTHON_CMD=""  # Disable Python installation
    fi
else
    log_warning "Python 3 not found. Testing and linting features will be limited."
    log_info "Note: The core UEMCP functionality will still work in Unreal Engine."
fi

# Install Node dependencies
echo ""
echo "📦 Installing Node.js dependencies..."
cd "$SCRIPT_DIR/server"
if npm install; then
    log_success "Node.js dependencies installed"
else
    log_error "Failed to install Node.js dependencies"
    exit 1
fi

# Build the server
echo ""
echo "🔨 Building the server..."
if npm run build; then
    log_success "Server built successfully!"
else
    log_error "Server build failed. Please check the errors above."
    exit 1
fi

# Install Python dependencies (optional)
if [ -n "$PYTHON_CMD" ] && [ -f "$SCRIPT_DIR/requirements-dev.txt" ]; then
    echo ""
    echo "🐍 Python development dependencies (optional)"
    log_info "These provide testing and linting tools but are not required for core functionality."
    
    read -p "Install Python development dependencies? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Installing Python packages..."
        cd "$SCRIPT_DIR"
        
        # Try to install with --user flag first to avoid permission issues
        if $PIP_CMD install --user -r requirements-dev.txt 2>/dev/null; then
            log_success "Python dependencies installed"
            log_info "These are for development tools (pytest, black, flake8, etc.)"
        else
            # Try without --user flag
            if $PIP_CMD install -r requirements-dev.txt 2>/dev/null; then
                log_success "Python dependencies installed"
            else
                log_warning "Could not install Python dependencies"
                log_info "This is OK - the core UEMCP functionality will still work."
                echo "   To install manually later, run:"
                echo "   $PIP_CMD install -r requirements-dev.txt"
            fi
        fi
    else
        log_info "Skipping Python dependencies (can be installed later if needed)"
    fi
fi

# Create example config
echo ""
echo "📝 Configuration"
echo "==============="

# Claude Desktop config location
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_DIR="$HOME/Library/Application Support/Claude"
    CONFIG_NOTE="macOS"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    CONFIG_DIR="$APPDATA/Claude"
    CONFIG_NOTE="Windows"
else
    CONFIG_DIR="$HOME/.config/claude"
    CONFIG_NOTE="Linux"
fi

echo ""
echo "📋 Next Steps:"
echo "============="
echo ""
echo "1. For quick automated setup, run:"
echo -e "   ${GREEN}node init.js${NC}"
echo "   This will configure everything automatically!"
echo ""
echo "2. Or configure manually:"
echo "   a. Set up your environment:"
echo "      export UE_PROJECT_PATH=\"/path/to/your/unreal/project\""
echo ""
echo "   b. Configure Claude Desktop ($CONFIG_NOTE):"
echo "      Config location: $CONFIG_DIR/claude_desktop_config.json"
echo "      Server path: $SCRIPT_DIR/server/dist/index.js"
echo ""
echo "3. Test the installation:"
echo "   node test-connection.js"
echo ""
echo "4. In Unreal Engine:"
echo "   - Copy or symlink the 'plugin' folder to your project's Plugins directory"
echo "   - The Python listener will start automatically"
echo ""
echo "📖 Documentation:"
echo "   - Quick Start: README.md"
echo "   - Setup Guide: docs/setup/"
echo "   - Troubleshooting: docs/development/troubleshooting.md"
echo ""
log_success "Setup complete! 🎉"
echo ""
echo "💡 Tip: Use 'node init.js' for automated configuration!"