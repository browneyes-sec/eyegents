#!/bin/bash
# Development mode with hot reload
set -euo pipefail

echo "🔧 Starting eyegents dev environment..."

docker compose -f docker/docker-compose.yml up -d ollama qdrant

timeout 60 bash -c 'until docker exec eyegents-ollama ollama ps &>/dev/null; do sleep 2; done'
timeout 30 bash -c 'until curl -sf http://localhost:6333/ >/dev/null; do sleep 2; done'

echo "📦 Installing/watching dependencies..."
npm run dev &
DEV_PID=$!

echo "🔌 Starting MCP server (dev mode)..."
(cd mcp-server && npm run dev) &
MCP_PID=$!

echo "👀 Watching for file changes (indexer)..."
docker compose -f docker/docker-compose.yml --profile indexing up indexer &
INDEXER_PID=$!

cleanup() {
  echo "🛑 Shutting down..."
  kill $DEV_PID $MCP_PID $INDEXER_PID 2>/dev/null || true
  docker compose -f docker/docker-compose.yml down
  exit 0
}
trap cleanup INT TERM

wait