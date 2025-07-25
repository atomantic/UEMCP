#!/bin/bash

# UEMCP Quick Setup Script
echo "🚀 UEMCP Setup Script"
echo "===================="

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo "✅ Python found: $(python3 --version)"

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "📁 UEMCP directory: $SCRIPT_DIR"

# Install Node dependencies
echo ""
echo "📦 Installing Node.js dependencies..."
cd "$SCRIPT_DIR/server"
npm install

# Build the server
echo ""
echo "🔨 Building the server..."
npm run build

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "✅ Server built successfully!"
else
    echo "❌ Server build failed. Please check the errors above."
    exit 1
fi

# Install Python dependencies
echo ""
echo "🐍 Installing Python dependencies..."
cd "$SCRIPT_DIR"
pip install -r requirements-dev.txt

# Create example config
echo ""
echo "📝 Creating example configuration files..."

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
echo "1. Set up your environment:"
echo "   export UE_PROJECT_PATH=\"/path/to/your/unreal/project\""
echo ""
echo "2. Copy the example Claude Desktop config:"
echo "   mkdir -p \"$CONFIG_DIR\""
echo "   cp \"$SCRIPT_DIR/claude-desktop-config.example.json\" \"$CONFIG_DIR/claude_desktop_config.json\""
echo ""
echo "3. Update the config file with your paths:"
echo "   - Replace <PATH_TO_UEMCP> with: $SCRIPT_DIR"
echo "   - Replace <PATH_TO_YOUR_UE_PROJECT> with your project path"
echo ""
echo "4. Test the server:"
echo "   cd \"$SCRIPT_DIR\""
echo "   node test-uemcp-simple.js"
echo ""
echo "📖 For more details, see:"
echo "   - docs/environment-setup.md"
echo "   - docs/claude-desktop-setup-current.md"
echo ""
echo "✨ Setup complete!"