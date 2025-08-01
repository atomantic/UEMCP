#!/bin/bash
# Build script for UEMCP server

echo "Building UEMCP server..."
cd server

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build TypeScript
echo "Compiling TypeScript..."
npx tsc

echo "Build complete!"