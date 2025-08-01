#!/bin/bash
# Local CI Testing Script - Run this before pushing to GitHub
# This script mimics the GitHub Actions CI pipeline

set -e  # Exit on first error

echo "🧪 Running local CI tests..."
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
FAILED=0

# Function to run a test section
run_test() {
    local name=$1
    local cmd=$2
    echo -e "\n${YELLOW}Running: $name${NC}"
    if eval "$cmd"; then
        echo -e "${GREEN}✅ $name passed${NC}"
    else
        echo -e "${RED}❌ $name failed${NC}"
        FAILED=1
    fi
}

# TypeScript/Node.js Tests
echo -e "\n${YELLOW}=== TypeScript/Node.js Tests ===${NC}"
cd server

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm ci
fi

# Run all TypeScript checks
run_test "ESLint" "npm run lint"
run_test "TypeScript Type Check" "npm run typecheck"
# Check if real tests exist or just placeholder
if npm run test 2>&1 | grep -q "No tests configured"; then
    echo -e "${YELLOW}ℹ️  No Jest tests configured yet${NC}"
else
    run_test "Jest Tests" "npm run test:coverage"
fi

cd ..

# Python Tests for Plugin
echo -e "\n${YELLOW}=== Python Plugin Tests ===${NC}"
cd plugin/Content/Python

# Check if we have Python 3.11
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
if [[ "$PYTHON_VERSION" != "3.11" ]]; then
    echo -e "${YELLOW}Warning: Python $PYTHON_VERSION detected, UE 5.4+ uses 3.11${NC}"
fi

# Install Python dependencies if needed
if ! python3 -m pip show flake8 &>/dev/null; then
    echo "Installing Python linting tools..."
    pip install flake8
fi

# Run Python checks on plugin code
run_test "Flake8 Linting" "flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics"
run_test "Flake8 Style" "flake8 . --count --exit-zero --max-complexity=15 --max-line-length=120 --statistics"

cd ../../..

# Summary
echo -e "\n${YELLOW}=== Summary ===${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Safe to push to GitHub.${NC}"
else
    echo -e "${RED}❌ Some tests failed. Fix these before pushing.${NC}"
    exit 1
fi