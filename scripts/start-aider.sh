#!/usr/bin/env bash
# Scripts/start-aider.sh
# Start Aider with eyegents mode configuration
# Usage: scripts/start-aider.sh [aider-args...]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Auto-detect mode if not set
if [ -z "${EYEGENTS_MODE:-}" ]; then
  if command -v docker >/dev/null; then
    # Full mode detection (simplified)
    if grep -q MemTotal /proc/meminfo 2>/dev/null; then
      MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
      MEM_GB=$((MEM_KB / 1024 / 1024))
      if [ "$MEM_GB" -ge 8 ]; then
        export EYEGENTS_MODE="full"
      else
        export EYEGENTS_MODE="thin"
      fi
    else
      export EYEGENTS_MODE="thin"
    fi
  else
    export EYEGENTS_MODE="thin"
  fi
fi

echo "🤖 Starting Aider in eyegents mode: $EYEGENTS_MODE"

# Ensure Aider venv exists
VENV_PATH=".venvs/aider"
if [ ! -f "$VENV_PATH/bin/aider" ]; then
  echo "🔧 Setting up Aider environment..."
  if command -v python3 >/dev/null; then
    python3 -m venv "$VENV_PATH"
    source "$VENV_PATH/bin/activate"
    pip install "aider-install" --quiet
    aider-install --quiet
    deactivate
  else
    echo "❌ Python 3 required for Aider"
    exit 1
  fi
fi

# Load environment
if [ -f ".secrets" ]; then
  source ".secrets" 2>/dev/null || true
fi

export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}"

# Start Aider
"$VENV_PATH/bin/aider" --model "openrouter/openrouter/free" "$@"
