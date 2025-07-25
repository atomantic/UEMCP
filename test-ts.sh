#!/bin/bash
# Quick TypeScript testing script

set -e  # Exit on first error

echo "🧪 Running TypeScript checks..."

cd server

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci
fi

echo ""
echo "1️⃣ Running ESLint..."
npm run lint

echo ""
echo "2️⃣ Running TypeScript type check..."
npm run typecheck

echo ""
echo "3️⃣ Running tests..."
# Check if test script exists
if npm run | grep -q "test"; then
    npm test
else
    echo "ℹ️  No test script defined (this is OK)"
fi

echo ""
echo "✅ All TypeScript checks passed!"