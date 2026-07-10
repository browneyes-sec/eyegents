#!/usr/bin/env bash
# scripts/setup-alias.sh
# Installs 'eyegents' command as a shell alias.
# Run once: bash scripts/setup-alias.sh
#
# After setup, just type: eyegents
# From anywhere — loads API key, launches Aider.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ALIAS_LINE="# eyegents alias (installed by scripts/setup-alias.sh)"
ALIAS_CMD="alias eyegents='OPENROUTER_API_KEY=\$(grep ^OPENROUTER_API_KEY \"${REPO_ROOT}/.secrets\" 2>/dev/null | cut -d= -f2) aider'"
ALIAS_THIN="alias eyegents-thin='cd ${REPO_ROOT} && OPENROUTER_API_KEY=\$(grep ^OPENROUTER_API_KEY \"${REPO_ROOT}/.secrets\" 2>/dev/null | cut -d= -f2) aider'"
ALIAS_FULL="alias eyegents-full='cd ${REPO_ROOT} && bash scripts/eyegents-doctor.sh 2>/dev/null; docker compose -f docker/docker-compose.yml up -d ollama qdrant mcp-server 2>/dev/null; OPENROUTER_API_KEY=\$(grep ^OPENROUTER_API_KEY \"${REPO_ROOT}/.secrets\" 2>/dev/null | cut -d= -f2) aider'"

install_alias() {
  local RC_FILE="$1"
  
  if [ ! -f "$RC_FILE" ]; then
    echo "   Skipping $RC_FILE (not found)"
    return
  fi

  # Remove old eyegents alias block if present
  if grep -q "${ALIAS_LINE}" "$RC_FILE" 2>/dev/null; then
    echo "   Updating $RC_FILE"
    # Remove existing block (3 lines: comment + eyegents + eyegents-thin)
    sed -i '/^# eyegents alias/,+3d' "$RC_FILE"
  else
    echo "   Installing in $RC_FILE"
  fi

  # Append new aliases
  {
    echo ""
    echo "$ALIAS_LINE"
    echo "$ALIAS_CMD"
    echo "$ALIAS_THIN"
    echo "$ALIAS_FULL"
  } >> "$RC_FILE"
}

echo "🔧 Installing eyegents aliases..."
echo "   Project: $REPO_ROOT"
echo ""

install_alias "${HOME}/.bashrc"
install_alias "${HOME}/.zshrc"

echo ""
echo "✅ Done! Restart your shell or run:"
echo "   source ~/.bashrc"
echo ""
echo "Then from anywhere:"
echo "   eyegents        — launch Aider (auto-loads API key)"
echo "   eyegents-thin   — Aider from repo root"
echo "   eyegents-full   — Docker services + Aider"
