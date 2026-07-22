#!/usr/bin/env bash
# Scripts/manage-models.sh
# Manage Aider/OpenRouter models
# Usage: scripts/manage-models.sh [list|pull|test|set]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

function show_help() {
  echo "Aider/OpenRouter model management"
  echo ""
  echo "Usage: $0 <command>"
  echo ""
  echo "Commands:"
  echo "  list      List available models"
  echo "  pull      Pull latest models via Ollama"
  echo "  test      Test OpenRouter connectivity"
  echo "  set       Configure model preferences"
  echo "  status    Show current model configuration"
}

function list_models() {
  echo "🔍 Available models for eyegents:"
  echo ""
  echo "📍 Local models (Ollama):"
  curl -s http://localhost:11434/api/tags 2>/dev/null | jq -r '.models[] | "  • " + .name' 2>/dev/null || echo "  ❌ Qdrant not running or unable to fetch"
  echo ""
  echo "🌐 OpenRouter models (via aider-execute):"
  echo "  • openrouter/nvidia/nemotron-3-super-120b-a12b:free  # Super free model"
  echo "  • openrouter/nvidia/nemotron-3-nano-30b-a3b:free    # Free small model"
  echo "  • openrouter/nvidia/nemotron-3-ultra-550b-a55b       # Ultra paid model"
  echo "  • deepseek/deepseek-v4-flash                        # Fast coding"
  echo "  • deepseek/deepseek-v4-pro                          # Complex reasoning"
  echo "  • moonshotai/kimi-k2.7-code                         # Kimi coding specialist (paid)"
  echo "  • moonshotai/kimi-k2.6                              # Kimi general-purpose (paid)"
  echo "  • moonshotai/kimi-k3                                # Kimi flagship 1M ctx (paid)"
}

function test_connectivity() {
  echo "🔄 Testing OpenRouter connectivity..."
  if [ -f ".venvs/openrouter/bin/python3" ]; then
    source .venvs/openrouter/bin/activate
    python scripts/openrouter-test.py
  else
    echo "⚠️  OpenRouter venv not found. Creating..."
    python3 -m venv .venvs/openrouter
    source .venvs/openrouter/bin/activate
    pip install requests --quiet
    python -c "
import requests
import os
key = os.environ.get('OPENROUTER_API_KEY')
if not key:
    print('❌ OPENROUTER_API_KEY not set')
    exit(1)
try:
    resp = requests.get('https://openrouter.ai/api/v1/models', headers={'Authorization': f'Bearer {key}'})
    print(f'✅ Connected ({resp.status_code})')
    print(f'Models available: {len(resp.json().get(\"data\", []))}')
except Exception as e:
    print(f'❌ Connection failed: {e}')
"
  fi
}

function show_model_prefs() {
  echo "📋 Current eyegents model configuration:"
  echo ""
  # Aider model from .aider.conf.yml
  if grep -q "model:" .aider.conf.yml; then
    AIDER_MODEL=$(grep "model:" .aider.conf.yml | head -1 | cut -d' ' -f2)
    echo "🤖 Aider model: $AIDER_MODEL"
  fi

  # OpenRouter routing configuration
  if [ -f "config/openrouter-routes.json" ]; then
    echo ""
    echo "🔀 OpenRouter agent routing:"
    cat config/openrouter-routes.json | jq -r '.agentRoutes | to_entries[] | "  • " + .key + " → " + .value.model'
  fi

  # Local model configuration (qwen2.5-coder:7b)
  echo ""
  echo "💻 Local models:"
  echo "  • qwen2.5-coder:7b (Ollama) - Primary coding agent"
  echo "  • qwen2.5:0.5b (Ollama) - Small tasks"
  echo "  • bge-m3:latest (Ollama) - Embeddings"

  # Mode-specific defaults
  echo ""
  echo "⚙️  Mode-specific defaults:"
  echo "  • Thin mode: Uses OpenRouter models (default Aider)"
  echo "  • Full mode: Prioritizes local Ollama, uses OpenRouter when needed"
}

case "$1" in
  list)
    list_models
    ;;
  pull)
    echo "📥 Pulling latest models (this may take a while)..."
    ./scripts/pull-models.sh 2>/dev/null || echo "❌ pull-models.sh not available or failed"
    ;;
  test)
    test_connectivity
    ;;
  status)
    show_model_prefs
    ;;
  set)
    echo "⚠️  Model preference setup requires manual configuration"
    echo "  Edit .aider.conf.yml for Aider model preference"
    echo "  Edit config/openrouter-routes.json for agent routing"
    echo "  Check docker/docker-compose.yml for Ollama/Qdrant settings"
    ;;
  *)
    show_help
    ;;
esac
