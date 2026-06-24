#!/bin/bash
# Model management with quantization selection
set -euo pipefail

echo "📥 Pulling models for eyegents..."

MODELS=(
  "qwen2.5-coder:7b-q4_K_M"
  "qwen2.5:0.5b-q4_K_M"
  "bge-m3:latest"
  "nomic-embed-text:latest"
)

TOTAL_RAM_GB=$(free -g | awk '/^Mem:/{print $2}')
if [[ $TOTAL_RAM_GB -lt 4 ]]; then
  echo "⚠️  Low RAM detected ($TOTAL_RAM_GB GB) — using Q3_K_L for 7b model"
  MODELS[0]="qwen2.5-coder:7b-q3_K_L"
fi

for model in "${MODELS[@]}"; do
  echo "  → Pulling $model..."
  docker exec eyegents-ollama ollama pull "$model" || {
    echo "  ⚠️  Failed to pull $model, trying without quantization tag..."
    base_model=$(echo "$model" | cut -d: -f1)
    docker exec eyegents-ollama ollama pull "$base_model"
  }
done

echo "🏷️  Tagging primary model..."
docker exec eyegents-ollama ollama tag qwen2.5-coder:7b-q4_K_M qwen2.5-coder:7b 2>/dev/null || \
docker exec eyegents-ollama ollama tag qwen2.5-coder:7b-q3_K_L qwen2.5-coder:7b 2>/dev/null || true

echo "✅ Models ready:"
docker exec eyegents-ollama ollama list