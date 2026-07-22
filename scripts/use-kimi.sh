#!/usr/bin/env bash
# Scripts/use-kimi.sh
# Switch eyegents tooling to Kimi models (K2.7-Code / K2.6 / K3)
#
# Usage:
#   source scripts/use-kimi.sh              # Preview what would change
#   source scripts/use-kimi.sh aider        # Launch Aider with Kimi K2.7-Code
#   source scripts/use-kimi.sh aidexec TASK # Run aider-execute with Kimi
#   source scripts/use-kimi.sh opencode     # Launch OpenCode with Kimi model
#   source scripts/use-kimi.sh kimi         # Launch Kimi Code CLI
#   source scripts/use-kimi.sh status       # Show current Kimi env state
#   source scripts/use-kimi.sh reset        # Restore original env vars
#
# Requirements:
#   MOONSHOT_API_KEY in .secrets or .env

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"

# ── Load Moonshot API key ───────────────────────────────────────────
load_key() {
  if [ -n "${MOONSHOT_API_KEY:-}" ]; then
    return 0
  fi
  if [ -f "${REPO_ROOT}/.secrets" ]; then
    export MOONSHOT_API_KEY
    MOONSHOT_API_KEY="$(grep "^MOONSHOT_API_KEY=" "${REPO_ROOT}/.secrets" 2>/dev/null | cut -d= -f2-)"
  fi
  if [ -z "${MOONSHOT_API_KEY:-}" ] && [ -f "${REPO_ROOT}/.env" ]; then
    export MOONSHOT_API_KEY
    MOONSHOT_API_KEY="$(grep "^MOONSHOT_API_KEY=" "${REPO_ROOT}/.env" 2>/dev/null | cut -d= -f2-)"
  fi
  if [ -z "${MOONSHOT_API_KEY:-}" ]; then
    echo "❌ MOONSHOT_API_KEY not found in .secrets or .env"
    echo "   Add: MOONSHOT_API_KEY=sk-... to ${REPO_ROOT}/.secrets"
    return 1
  fi
}

# ── Models ──────────────────────────────────────────────────────────
KIMI_CODING="kimi-k2.7-code"
KIMI_GENERAL="kimi-k2.6"
KIMI_FLAGSHIP="kimi-k3"
MOONSHOT_BASE="https://api.moonshot.ai/v1"

case "${1:-}" in
  aider)
    load_key
    echo "🚀 Launching Aider with Kimi ${KIMI_CODING}..."
    echo "   Endpoint: ${MOONSHOT_BASE}"
    echo ""
    cd "${REPO_ROOT}"
    # Save original env
    export _OLD_OPENAI_API_KEY="${OPENAI_API_KEY:-}"
    export _OLD_OPENAI_BASE_URL="${OPENAI_BASE_URL:-}"
    export _OLD_AIDER_MODEL="${AIDER_MODEL:-}"
    # Set Kimi env for Aider
    export OPENAI_API_KEY="${MOONSHOT_API_KEY}"
    export OPENAI_BASE_URL="${MOONSHOT_BASE}"
    export AIDER_MODEL="${KIMI_CODING}"
    # Launch Aider with Kimi model directly
    aider \
      --model "${KIMI_CODING}" \
      --openai-api-key "${MOONSHOT_API_KEY}" \
      --openai-api-base "${MOONSHOT_BASE}" \
      --read "${REPO_ROOT}/CONVENTIONS.md" \
      --read "${REPO_ROOT}/CLAUDE.md" \
      --map-tokens 4096 \
      --map-refresh files \
      --model-settings-file "${REPO_ROOT}/.aider.model.settings.yml" \
      --model-metadata-file "${REPO_ROOT}/.aider.model.metadata.json" \
      "${@:2}"
    # Restore
    export OPENAI_API_KEY="${_OLD_OPENAI_API_KEY}"
    export OPENAI_BASE_URL="${_OLD_OPENAI_BASE_URL}"
    export AIDER_MODEL="${_OLD_AIDER_MODEL}"
    ;;

  aidexec)
    load_key
    echo "🚀 Running aider-execute with Kimi ${KIMI_CODING}..."
    shift
    "${REPO_ROOT}/scripts/aider-execute.sh" \
      --model "${KIMI_CODING}" \
      --openai-api-key "${MOONSHOT_API_KEY}" \
      --openai-api-base "${MOONSHOT_BASE}" \
      "$@"
    ;;

  opencode)
    echo "🚀 Launching OpenCode with Kimi model..."
    echo "   Default model: kimi/kimi-k2.7-code"
    echo "   Switch models in-session with: /models"
    echo ""
    opencode
    ;;

  kimi)
    echo "🚀 Launching Kimi Code CLI..."
    echo "   Run /login first-time to authenticate"
    echo ""
    kimi "${@:2}"
    ;;

  login)
    load_key
    echo "🔐 Setting up Kimi authentication..."
    echo ""
    echo "Option A — OpenCode:"
    echo "  opencode auth login"
    echo "  → Select 'Kimi For Coding' from provider list"
    echo "  → Paste your Moonshot API key"
    echo ""
    echo "Option B — Kimi Code CLI:"
    echo "  kimi"
    echo "  → Type /login"
    echo "  → Choose 'Kimi Platform API key'"
    echo "  → Paste your Moonshot API key"
    echo ""
    echo "Your API key is stored in: ${REPO_ROOT}/.secrets"
    echo "  MOONSHOT_API_KEY=${MOONSHOT_API_KEY:0:12}..."
    ;;

  status)
    echo "📋 Kimi Integration Status"
    echo ""
    echo "API Key:"
    if [ -n "${MOONSHOT_API_KEY:-}" ]; then
      echo "  MOONSHOT_API_KEY=${MOONSHOT_API_KEY:0:12}... (set)"
    else
      echo "  MOONSHOT_API_KEY= (not set)"
    fi
    echo ""
    echo "CLI:"
    if command -v kimi &>/dev/null; then
      echo "  Kimi Code CLI: $(kimi --version 2>/dev/null || echo 'installed')"
    else
      echo "  Kimi Code CLI: not installed"
    fi
    echo ""
    echo "OpenCode config (~/.config/opencode/opencode.jsonc):"
    if grep -q "kimi" ~/.config/opencode/opencode.jsonc 2>/dev/null; then
      echo "  Kimi provider: configured"
      grep "model" ~/.config/opencode/opencode.jsonc | head -2 | sed 's/^/  /'
    else
      echo "  Kimi provider: not configured"
    fi
    echo ""
    echo "Aider config (.aider.model.settings.yml):"
    if grep -q "kimi" "${REPO_ROOT}/.aider.model.settings.yml" 2>/dev/null; then
      echo "  Kimi models: registered for OpenRouter"
    else
      echo "  Kimi models: not registered"
    fi
    echo ""
    echo "Available commands:"
    echo "  source scripts/use-kimi.sh aider     — Launch Aider with Kimi"
    echo "  source scripts/use-kimi.sh aidexec   — Run aider-execute with Kimi"
    echo "  source scripts/use-kimi.sh opencode  — Launch OpenCode (Kimi default)"
    echo "  source scripts/use-kimi.sh kimi      — Launch Kimi Code CLI"
    echo "  source scripts/use-kimi.sh login     — Show auth setup instructions"
    echo "  source scripts/use-kimi.sh status    — Show this status"
    ;;

  reset)
    echo "🔄 Restoring original environment..."
    export OPENAI_API_KEY="${_OLD_OPENAI_API_KEY:-}"
    export OPENAI_BASE_URL="${_OLD_OPENAI_BASE_URL:-}"
    export AIDER_MODEL="${_OLD_AIDER_MODEL:-}"
    echo "   OPENAI_API_KEY restored"
    echo "   OPENAI_BASE_URL restored"
    echo "   AIDER_MODEL restored"
    ;;

  *)
    echo "🤖 Kimi Integration for eyegents"
    echo ""
    echo "Usage: source scripts/use-kimi.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  aider [args]       Launch Aider with Kimi K2.7-Code"
    echo "  aidexec [task]     Run aider-execute with Kimi"
    echo "  opencode           Launch OpenCode (Kimi model default)"
    echo "  kimi [args]        Launch Kimi Code CLI"
    echo "  login              Show Kimi auth setup instructions"
    echo "  status             Show integration status"
    echo "  reset              Restore original env vars"
    echo ""
    echo "Examples:"
    echo "  source scripts/use-kimi.sh aider"
    echo "  source scripts/use-kimi.sh aidexec -t \"Refactor auth module\""
    echo "  source scripts/use-kimi.sh kimi -p \"List files in this repo\""
    echo "  source scripts/use-kimi.sh status"
    ;;
esac
