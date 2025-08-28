#!/bin/bash

# UEMCP Setup Script - Wrapper for init.js
# This script is maintained for backward compatibility
# The recommended setup method is: node init.js

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        UEMCP Setup Script              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📢 Notice: This script now uses the improved init.js${NC}"
echo -e "${YELLOW}   For advanced options, run: node init.js --help${NC}"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Pass all arguments to init.js
echo -e "${GREEN}Starting UEMCP initialization...${NC}"
echo ""

cd "$SCRIPT_DIR"
node init.js "$@"

# Capture exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✨ Setup completed successfully!${NC}"
    echo ""
    echo "💡 Tips:"
    echo "   - For non-interactive setup: node init.js --no-interactive"
    echo "   - For Claude Code setup: node init.js --claude-code"
    echo "   - For help: node init.js --help"
else
    echo ""
    echo -e "❌ Setup failed with exit code $EXIT_CODE"
    echo "   For help, run: node init.js --help"
fi

exit $EXIT_CODE