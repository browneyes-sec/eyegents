#!/usr/bin/env bash
# Scripts/stop-services.sh
# Stop Docker services and cleanup eyegents environment
# Usage: scripts/stop-services.sh [services...]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Stop Docker services if running
if command -v docker >/dev/null; then
  echo "🔌 Stopping Docker services..."
  docker compose -f docker/docker-compose.yml down --remove-orphans 2>/dev/null || true
fi

# Cleanup temporary files
echo "🧹 Cleaning up temporary files..."
rm -f ".env"
rm -f ".aider.input.history"
rm -f ".aider.chat.history.md"
rm -f ".aider.tags.cache.v*" 2>/dev/null || true
rm -f ".aider*" 2>/dev/null || true

# Remove Aider venv if requested
if [ "${1:-}" = "--clean-venv" ]; then
  VENV_PATH=".venvs/aider"
  if [ -d "$VENV_PATH" ]; then
    echo "🗑️  Removing Aider venv..."
    rm -rf "$VENV_PATH"
  fi
fi

echo "✅ Services stopped and cleaned up"
