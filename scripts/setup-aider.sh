#!/usr/bin/env bash
# Scripts/setup-aider.sh
# Quick Aider setup - install venv and tools
# Usage: scripts/setup-aider.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

VENV_PATH=".venvs/aider"

echo "🔧 Setting up Aider environment..."

if command -v python3 >/dev/null; then
  python3 -m venv "$VENV_PATH"
  source "$VENV_PATH/bin/activate"
  pip install "aider-install" --quiet
  aider-install --quiet
  deactivate
  echo "✅ Aider installed in $VENV_PATH"
else
  echo "❌ Python 3 required for Aider"
  exit 1
fi

echo ""
echo "🚀 Ready to use Aider:"
echo "  ./scripts/start-aider.sh                    # Start Aider with mode detection"
echo "  bin/eyegents-thin                           # Thin mode (default)"
echo "  bin/eyegents-full                            # Full mode with Docker"

echo ""
echo "✅ Aider setup complete!"
