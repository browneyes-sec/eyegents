#!/usr/bin/env bash
# scripts/bootstrap.sh
# One-command bootstrap for eyegents.
# 
# Usage:
#   ./scripts/bootstrap.sh              # Auto-detect mode
#   ./scripts/bootstrap.sh --thin       # Aider only (fastest)
#   ./scripts/bootstrap.sh --quick      # Fast check, no installs
#   ./scripts/bootstrap.sh --full       # Docker + MCP server
#
# Flags:
#   --thin     Aider-only, no Docker, no npm build
#   --quick    Just verify prerequisites, skip all installs
#   --full     Docker services + MCP server + code indexing
#   --help     Show this help

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── Parse flags ──────────────────────────────────────────────────────

MODE="auto"
for arg in "$@"; do
  case "$arg" in
    --thin|--aider-only)  MODE="thin"  ;;
    --quick|--check)      MODE="quick" ;;
    --full|--docker)      MODE="full"  ;;
    --help|-h)
      sed -n '/^#/,/^$/p' "$0" | grep -v '#!/' | sed 's/^#//'
      exit 0
      ;;
  esac
done

if [ "$MODE" = "auto" ]; then
  if command -v docker >/dev/null && [ "$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}')" -ge 8388608 ] 2>/dev/null; then
    MODE="full"
  else
    MODE="thin"
  fi
fi

echo "==> eyegents bootstrap (mode: $MODE)"

# ── Prerequisites (always checked) ──────────────────────────────────

echo "   Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ node required"; exit 1; }
command -v aider >/dev/null 2>&1 || { echo "⚠️  aider not found — install: pip install aider-chat"; }
command -v python3 >/dev/null 2>&1 || echo "⚠️  python3 not found"
test -f .secrets && echo "   ✓ .secrets found" || echo "   ⚠️  .secrets missing — create with OPENROUTER_API_KEY=..."

# ── Quick mode — just check, done ───────────────────────────────────

if [ "$MODE" = "quick" ]; then
  echo "   ✓ Quick check passed"
  echo ""
  echo "   To start:"
  echo "     eyegents                          # Launch Aider"
  echo "     aider --model openrouter/deepseek/deepseek-v4-flash  # With model flag"
  echo "     source .secrets && export OPENROUTER_API_KEY && aider  # Explicit env"
  exit 0
fi

# ── Thin mode — Aider only ──────────────────────────────────────────

if [ "$MODE" = "thin" ]; then
  echo "   ✓ Ready"
  echo ""
  echo "   Start coding:"
  echo "     eyegents"
  echo "     OPENROUTER_API_KEY=\$(grep ^OPENROUTER_API_KEY .secrets | cut -d= -f2) aider"
  exit 0
fi

# ── Full mode — Docker + build ──────────────────────────────────────

echo "   Starting Docker services..."
docker compose -f docker/docker-compose.yml up -d ollama qdrant 2>/dev/null || true

echo "   Installing dependencies..."
npm ci --silent 2>/dev/null || npm ci

echo "   Building packages..."
npm run build --if-present 2>/dev/null || npx turbo run build 2>/dev/null || echo "   ⚠️  Build skipped"

if [ -f "docker/docker-compose.yml" ]; then
  echo "   Pruning for Docker build..."
  node node_modules/.bin/turbo prune @eyegents/mcp-server --docker 2>/dev/null || true
  echo "   Building MCP server image..."
  docker compose -f docker/docker-compose.yml build mcp-server 2>/dev/null || echo "   ⚠️  Docker build skipped (run manually: docker compose build mcp-server)"
  docker compose -f docker/docker-compose.yml up -d mcp-server 2>/dev/null || true
fi

echo ""
echo "   ✓ eyegents ready (full mode)"
echo "     MCP:  http://localhost:3001"
echo "     Qdrant: http://localhost:6333/dashboard"
echo "     Ollama: http://localhost:11434"
echo ""
echo "   Start coding: eyegents"
