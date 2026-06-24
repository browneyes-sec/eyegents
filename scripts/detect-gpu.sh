#!/bin/bash
# GPU detection for Ollama optimization
set -euo pipefail

if command -v nvidia-smi &>/dev/null && nvidia-smi -L 2>/dev/null | grep -q "GPU"; then
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -1)
    GPU_MEM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -1)
    echo "GPU detected: $GPU_NAME (${GPU_MEM}MB)"
    export OLLAMA_GPU_LAYERS=999
    export OLLAMA_GPU_OVERHEAD=0
    exit 0
else
    echo "No GPU detected — running CPU-optimized"
    export OLLAMA_GPU_LAYERS=0
    export OLLAMA_NUM_THREAD=4
    export OLLAMA_NUMA=1
    exit 1
fi