#!/usr/bin/env bash
# Deploy staging environment from develop branch
set -euo pipefail

echo "Deploying eyegents staging environment..."

BRANCH="${1:-develop}"
REGISTRY="ghcr.io"
IMAGE_PREFIX="${REGISTRY}/${GITHUB_REPOSITORY:-browneyes-sec/eyegents}"

echo "Branch: $BRANCH"
echo "Image prefix: $IMAGE_PREFIX"

echo "Pulling staging images..."
docker pull "${IMAGE_PREFIX}-mcp-server:staging" 2>/dev/null || echo "Warning: staging image not found, building locally"

echo "Starting staging services..."
docker compose -f docker/docker-compose.yml -f docker/docker-compose.openrouter.yml up -d

echo "Waiting for services..."
timeout 60 bash -c 'until curl -sf http://localhost:3001/health >/dev/null 2>&1; do sleep 2; done' || echo "Warning: MCP server health check timeout"

echo "Staging deployment complete."
echo "  MCP Server: http://localhost:3001"
echo "  Qdrant:     http://localhost:6333"
echo "  Ollama:     http://localhost:11434"
