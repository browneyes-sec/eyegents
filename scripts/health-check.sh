#!/usr/bin/env bash
# Scripts/health-check.sh
# Run comprehensive health checks on eyegents services
# Usage: scripts/health-check.sh [quick|full]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MODE="${1:-quick}"

echo "🏥 Eyegents Health Check ($MODE)"
echo "==========================="

HEALTHY=0
TOTAL=0

# Function to check service
check_service() {
  local name=$1
  local url=$2
  local timeout=${3:-5}
  
  TOTAL=$((TOTAL + 1))
  
  if curl -sf -m "$timeout" "$url" >/dev/null 2>&1; then
    echo "✅ $name: healthy"
    HEALTHY=$((HEALTHY + 1))
  else
    echo "❌ $name: unhealthy"
    return 1
  fi
}

# Quick checks
if [ "$MODE" = "quick" ]; then
  check_service "Qdrant" "http://localhost:6333/health" 5
  check_service "Ollama" "http://localhost:11434/api/tags" 5
  check_service "MCP Server" "http://localhost:3001/health" 5
elif [ "$MODE" = "full" ]; then
  check_service "Qdrant" "http://localhost:6333/health" 5
  check_service "Ollama" "http://localhost:11434/api/tags" 5
  check_service "MCP Server" "http://localhost:3001/health" 5
  check_service "Git" "/usr/bin/git --version" 2
  command -v docker >/dev/null && check_service "Docker" "docker ps" 2 || echo "❌ Docker: not available"
fi

# Environment checks
echo ""
echo "📋 Environment checks:"
[ -f ".secrets" ] && echo "✅ .secrets present" || echo "⚠️  .secrets not found"
[ -f ".venvs/aider/bin/aider" ] && echo "✅ Aider installed" || echo "⚠️  Aider not installed"

echo ""
echo "🎯 Summary: $HEALTHY/$TOTAL services healthy"

if [ "$HEALTHY" -eq "$TOTAL" ]; then
  echo "✅ All services healthy"
  exit 0
else
  echo "❌ Some services unhealthy"
  exit 1
fi
