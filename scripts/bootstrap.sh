#!/bin/bash
# One-command setup: ./scripts/bootstrap.sh
set -euo pipefail

echo "🚀 eyegents bootstrap starting..."

command -v docker >/dev/null || { echo "❌ Docker required"; exit 1; }
command -v node >/dev/null || { echo "❌ Node 20+ required"; exit 1; }
command -v npm >/dev/null || { echo "❌ npm required"; exit 1; }

NODE_VERSION=$(node --version | cut -d. -f1 | sed 's/v//')
[[ $NODE_VERSION -ge 20 ]] || { echo "❌ Node 20+ required (found v$NODE_VERSION)"; exit 1; }

[[ -f .env ]] || { echo "📝 Creating .env from example..."; cp .env.example .env; }

echo "🐳 Starting core services (Ollama + Qdrant)..."
docker compose -f docker/docker-compose.yml up -d ollama qdrant

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