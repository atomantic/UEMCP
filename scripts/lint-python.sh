#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY_DIR="$ROOT_DIR/plugin/Content/Python"

echo "Formatting with black..."
black "$PY_DIR" --line-length 120

echo "Linting/fixing with ruff..."
ruff check "$PY_DIR" --fix

echo "Running flake8..."
flake8 "$PY_DIR" --max-line-length=120 --max-complexity=15 --ignore=E203,W503 --per-file-ignores="test_*.py:C901"

echo "Python linting complete."

