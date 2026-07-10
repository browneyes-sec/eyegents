#!/bin/bash
# One-command setup: ./scripts/bootstrap.sh
set -euo pipefail

echo "🚀 eyegents bootstrap starting..."

# Mode detection from environment or doctor suggestion
MODE=${EYEGENTS_MODE:-}
if [ -z "$MODE" ]; then
  if [ -x "scripts/eyegents-doctor.sh" ]; then
    scripts/eyegents-doctor.sh
    echo "Note: Export EYEGENTS_MODE based on doctor output above"
  fi
  # Default: try to detect from docker availability and memory
  if command -v docker >/dev/null; then
    DOCKER_AVAILABLE=1
  else
    DOCKER_AVAILABLE=0
  fi

  TOTAL_MEM=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}')
  if [ -n "${TOTAL_MEM:-}" ]; then
    GB=$((TOTAL_MEM / 1024 / 1024))
    if [ "$DOCKER_AVAILABLE" -eq 1 ] && [ "$GB" -ge 8 ]; then
      MODE="full"
    else
      MODE="thin"
    fi
  else
    MODE="thin"
  fi
fi

echo "🔧 Detected mode: $MODE"
export EYEGENTS_MODE="$MODE"

# Mode-specific setup
if [ "$MODE" = "full" ]; then
  echo "🐳 Full mode: Starting Docker services (Ollama + Qdrant)..."
  docker compose -f docker/docker-compose.yml up -d ollama qdrant
else
  echo "🔧 Thin mode: Skipping Docker services (local development)"
fi

echo "🐳 Starting core services (Ollama + Qdrant)..."
command -v docker >/dev/null || { echo "❌ Docker required"; exit 1; }

echo "⏳ Waiting for Ollama..."
timeout 120 bash -c 'until docker exec eyegents-ollama ollama ps &>/dev/null; do sleep 2; done' || { echo "❌ Ollama health check failed"; exit 1; }

echo "⏳ Waiting for Qdrant..."
timeout 60 bash -c 'until curl -sf http://localhost:6333/ >/dev/null; do sleep 2; done' || { echo "❌ Qdrant health check failed"; exit 1; }

echo "📥 Pulling models..."
./scripts/pull-models.sh

echo "📦 Installing dependencies..."
npm ci

echo "🔨 Building all packages..."
npm run build

echo "📚 Pruning monorepo for Docker build..."
npx turbo prune @eyegents/mcp-server --docker

echo "📚 Initial codebase indexing..."
docker compose -f docker/docker-compose.yml --profile indexing up indexer

echo "🔌 Starting MCP server..."
docker compose -f docker/docker-compose.yml up -d mcp-server

echo "⏳ Waiting for MCP server..."
timeout 30 bash -c 'until curl -sf http://localhost:3001/health >/dev/null; do sleep 1; done' || echo "⚠️  MCP health check timeout (may still be starting)"

echo "🤖 Setting up Aider environment..."
if command -v python3 >/dev/null; then
  python3 -m venv .venvs/aider
  source .venvs/aider/bin/activate
  pip install aider-install --quiet 2>/dev/null || pip install aider-install
  aider-install --quiet 2>/dev/null || aider-install
  deactivate
  echo "   ✅ Aider installed in .venvs/aider"
  echo "   Activate: source .venvs/aider/bin/activate"
  echo "   Run: aider (uses .aider.conf.yml automatically)"
else
  echo "   ⚠️  Python3 not found — skipping Aider installation"
  echo "   Install Python 3.12+ then run: python3 -m venv .venvs/aider"
fi

echo "✅ Verifying OpenCode..."
if command -v opencode >/dev/null; then
  opencode --version
else
  echo "⚠️  OpenCode not installed. Install with: curl -fsSL https://opencode.ai/install | bash"
  fi

echo ""
echo "✅ eyegents ready!"
echo "   Run 'opencode' to start coding with agents"
echo "   Run 'aider' for AI pair-programming (uses .aider.conf.yml)"
echo "   Run './scripts/dev.sh' for development mode"
echo "   MCP server: http://localhost:3001"
echo "   Qdrant UI:  http://localhost:6333/dashboard"
echo "   Ollama API: http://localhost:11434"
echo ""
echo "Mode info:"
echo "   EYEGENTS_MODE=$EYEGENTS_MODE"