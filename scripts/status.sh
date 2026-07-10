#!/usr/bin/env bash
# Scripts/status.sh
# Display eyegents system status
# Usage: scripts/status.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "📊 Eyegents System Status"
echo "========================="

# Check mode
if [ -n "${EYEGENTS_MODE:-}" ]; then
  echo "Mode: $EYEGENTS_MODE"
else
  echo "Mode: auto (undetected)"
fi

# System checks
command -v docker >/dev/null && echo "✅ Docker: available" || echo "❌ Docker: not available"

# Memory check
if [ -f "/proc/meminfo" ]; then
  MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
  MEM_GB=$((MEM_KB / 1024 / 1024))
  echo "💾 RAM: ${MEM_GB}GB"
fi

# Environment files
echo ""
echo "📁 Environment files:"
[ -f ".env" ] && echo "✅ .env" || echo "❌ .env"
[ -f ".secrets" ] && echo "✅ .secrets" || echo "❌ .secrets"
[ -f ".venvs/aider/bin/aider" ] && echo "✅ Aider venv" || echo "❌ Aider venv not installed"

# Docker services (full mode)
if [ "${EYEGENTS_MODE:-thin}" = "full" ]; then
  echo ""
  echo "🐳 Docker services:"
  if command -v docker >/dev/null; then
    CONTAINERS=$(docker compose -f docker/docker-compose.yml ps --services 2>/dev/null | wc -l)
    echo "Containers: $CONTAINERS"
    if [ "$CONTAINERS" -gt 0 ]; then
      docker compose -f docker/docker-compose.yml ps --format table
    fi
  else
    echo "❌ Docker not available"
  fi
fi

# Aider version (if installed)
if [ -f ".venvs/aider/bin/aider" ]; then
  echo ""
  echo "🤖 Aider:"
  .venvs/aider/bin/aider --version 2>/dev/null || echo "Version check failed"
fi

echo ""
echo "🛠️  Quick commands:"
echo "  scripts/start-aider.sh    # Start Aider"
echo "  scripts/stop-services.sh    # Stop services" 

echo "  bin/eyegents-thin           # Aider mode"
echo "  bin/eyegents-full            # Full mode"
