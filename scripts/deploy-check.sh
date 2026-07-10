#!/usr/bin/env bash
# Scripts/deploy-check.sh
# Quick deployment validation script
# Usage: scripts/deploy-check.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "🔍 Eyegents Deployment Validation"
echo "==============================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
  echo "❌ Not in a git repository"
  exit 1
fi

# Check for critical files
CRITICAL_FILES=(
  ".env"
  "CONVENTIONS.md"
  "CLAUDE.md"
  ".aider.conf.yml"
  "config/openrouter-routes.json"
)

MISSING_FILES=()
for file in "${CRITICAL_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    MISSING_FILES+=("$file")
  fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
  echo "❌ Missing critical files:"
  for file in "${MISSING_FILES[@]}"; do
    echo "   - $file"
  done
  exit 1
fi

# Check for .secrets file (development)
if [ ! -f ".secrets" ] && [ ! -f ".secrets.example" ]; then
  echo "⚠️  .secrets not found (development setup may be incomplete)"
fi

# Check Aider setup
if [ ! -f ".venvs/aider/bin/aider" ]; then
  echo "⚠️  Aider not installed. Run: scripts/setup-aider.sh"
fi

# Check Docker (optional)
if command -v docker >/dev/null; then
  echo "✅ Docker available"
else
  echo "⚠️  Docker not available (thin mode expected)"
fi

# Test Aider availability
if [ -f ".venvs/aider/bin/aider" ]; then
  if .venvs/aider/bin/aider --version >/dev/null 2>&1; then
    echo "✅ Aider available"
  else
    echo "❌ Aider installation invalid"
  fi
fi

# Check Python venv for OpenRouter
if [ -f ".venvs/openrouter/bin/python3" ]; then
  echo "✅ OpenRouter environment available"
else
  echo "⚠️  OpenRouter environment not found (API testing will fail)"
fi

# Verify OpenCode availability
if command -v opencode >/dev/null; then
  echo "✅ OpenCode available"
else
  echo "⚠️  OpenCode not installed"
fi

echo ""
echo "✅ Deployment validation complete"
echo ""
echo "🚀 Quick start commands:"
echo "  scripts/eyegents-doctor.sh                    # Check environment"
echo "  scripts/start-aider.sh                        # Start Aider"
echo "  bin/eyegents                                  # Auto-detect and run"
echo ""
echo "📋 For comprehensive workflow documentation:"
echo "  AIDER_FIRST.md                               # Complete workflow guide"
echo "  docs/development/getting-started.md           # General development"
echo "  docs/architecture/system-overview.md         # Technical architecture"
