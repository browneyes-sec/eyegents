#!/bin/bash
# Aider execution wrapper — direct CLI access from eyegents
# Usage: scripts/aider-execute.sh "implement auth middleware" [file1 file2 ...]
#
# This script wraps Aider with the eyegents configuration, ensuring:
#   - Correct venv activation
#   - OpenRouter credentials loaded
#   - Conventions and config passed
#   - Git diff captured after execution
#
# For programmatic use, prefer @eyegents/aider-adapter (TypeScript).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/.."
VENV_PATH="${REPO_ROOT}/.venvs/aider"
OPENROUTER_KEY=""

# Load secrets if available
if [ -f "${REPO_ROOT}/.secrets" ]; then
  source "${REPO_ROOT}/.secrets" 2>/dev/null || true
fi

# Use OPENROUTER_API_KEY from env, .secrets, or .env
if [ -n "${OPENROUTER_API_KEY:-}" ]; then
  OPENROUTER_KEY="$OPENROUTER_API_KEY"
elif [ -f "${REPO_ROOT}/.env" ]; then
  OPENROUTER_KEY=$(grep "^OPENROUTER_API_KEY=" "${REPO_ROOT}/.env" | cut -d= -f2-)
fi

# Check if Aider is available
if [ ! -f "${VENV_PATH}/bin/python3" ]; then
  echo "❌ Aider venv not found at ${VENV_PATH}"
  echo "   Run: python3 -m venv ${VENV_PATH} && source ${VENV_PATH}/bin/activate && pip install aider-install && aider-install"
  exit 1
fi

# Parse arguments
TASK=""
FILES=()
while [ $# -gt 0 ]; do
  case "$1" in
    --task|-t)
      TASK="$2"
      shift 2
      ;;
    --model|-m)
      MODEL="$2"
      shift 2
      ;;
    --dry-run|--read-only)
      DRY_RUN="--read-only"
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options] [files...]"
      echo "  --task|-t TEXT    Task description (required)"
      echo "  --model|-m MODEL  OpenRouter model override"
      echo "  --dry-run         Preview changes without editing"
      echo "  --help            Show this help"
      echo ""
      echo "Examples:"
      echo "  $0 --task \"Add input validation to login form\" src/auth/login.ts"
      echo "  $0 -t \"Refactor database queries to use prepared statements\" packages/db/src/"
      exit 0
      ;;
    -*)
      echo "Unknown option: $1"
      exit 1
      ;;
    *)
      FILES+=("$1")
      shift
      ;;
  esac
done

if [ -z "${TASK:-}" ]; then
  # Use remaining args as task if no --task flag
  if [ ${#FILES[@]} -gt 0 ]; then
    TASK="${FILES[0]}"
    FILES=("${FILES[@]:1}")
  else
    echo "❌ No task specified. Use --task or pass description as first argument."
    echo "   Usage: $0 --task \"description\" [files...]"
    exit 1
  fi
fi

echo "🤖 Aider — eyegents integration"
echo "   Task: ${TASK}"
echo "   Files: ${FILES[*]:-"(repo context)"}"
echo ""

# Export key for Aider
export OPENROUTER_API_KEY="$OPENROUTER_KEY"

# Build Aider command
AIDER_ARGS=(
  --model "${MODEL:-openrouter/nvidia/nemotron-3-super-120b-a12b:free}"
  --weak-model "openrouter/nvidia/nemotron-3-nano-30b-a3b:free"
  --read "${REPO_ROOT}/CONVENTIONS.md"
  --read "${REPO_ROOT}/CLAUDE.md"
  --aiderignore "${REPO_ROOT}/.aiderignore"
  --map-tokens 4096
  --map-refresh files
  --model-settings-file "${REPO_ROOT}/.aider.model.settings.yml"
  --model-metadata-file "${REPO_ROOT}/.aider.model.metadata.json"
  --no-auto-commits
  --no-dirty-commits
  --yes
)

# Add files if specified
if [ ${#FILES[@]} -gt 0 ]; then
  AIDER_ARGS+=("${FILES[@]}")
fi

# Add task
AIDER_ARGS+=(--message "$TASK")

# Execution
cd "$REPO_ROOT"
echo "🚀 Running Aider..."

# Capture before state
BEFORE_HASH=$(git rev-parse HEAD 2>/dev/null || echo "none")

if "${VENV_PATH}/bin/python3" -m aider.chat "${AIDER_ARGS[@]}"; then
  echo ""
  echo "✅ Aider completed successfully"

  # Show diff if changes were made
  DIFF=$(git diff 2>/dev/null || true)
  if [ -n "$DIFF" ]; then
    echo ""
    echo "📝 Changes made:"
    echo "$DIFF" | head -50
    LINES=$(echo "$DIFF" | wc -l)
    if [ "$LINES" -gt 50 ]; then
      echo "... (${LINES} total lines — run 'git diff' for full output)"
    fi
  else
    echo "ℹ️  No uncommitted changes detected"
  fi
else
  EXIT_CODE=$?
  echo "❌ Aider failed (exit code: $EXIT_CODE)"
  exit $EXIT_CODE
fi
