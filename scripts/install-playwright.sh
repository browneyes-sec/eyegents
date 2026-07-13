#!/usr/bin/env bash
set -euo pipefail

# Install Playwright with Chromium dependencies
# Retry once if failure

echo "Installing Playwright with Chromium dependencies..."

# Determine python binary
PYTHON="${UV_PYTHON:-python3}"

if ! command -v "$PYTHON" &>/dev/null; then
    echo "Error: Python not found. Please install Python 3.12+."
    exit 1
fi

# Install playwright if not present
if ! "$PYTHON" -m playwright --version &>/dev/null; then
    echo "Installing playwright package..."
    "$PYTHON" -m pip install --quiet playwright
fi

# Install with deps
echo "Running playwright install --with-deps chromium..."
if "$PYTHON" -m playwright install --with-deps chromium; then
    echo "Playwright installation successful."
else
    echo "Playwright installation failed. Retrying with system dependencies..."
    # Install system dependencies for Chromium
    if command -v apt-get &>/dev/null; then
        sudo apt-get update -qq && sudo apt-get install -y -qq \
            libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
            libdrm2 libdbus-1-3 libxkbcommon0 libxcomposite1 libxdamage1 \
            libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
    fi
    # Retry
    "$PYTHON" -m playwright install --with-deps chromium
fi
