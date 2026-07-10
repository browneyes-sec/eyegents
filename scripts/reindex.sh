#!/usr/bin/env bash
# Scripts/reindex.sh
# Reindex the codebase with Qdrant
# Usage: scripts/reindex.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ ! -f "docker/docker-compose.yml" ]; then
  echo "❌ Not a eyegents repository"
  exit 1
fi

# Check if in full mode or use docker directly
if command -v docker >/dev/null; then
  echo "🔄 Reindexing codebase with Qdrant..."
  docker compose -f docker/docker-compose.yml --profile indexing up indexer
else
  echo "❌ Docker required for reindexing"
  exit 1
fi

echo "✅ Reindexing complete"
