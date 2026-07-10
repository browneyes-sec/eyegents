#!/usr/bin/env bash
# Scripts/eyegents-doctor.sh
# Environment readiness and mode suggestion for eyegents

set -euo pipefail

echo "🔍 Eyegents environment scan..."

# Basic tools
command -v git >/dev/null || { echo "❌ git missing"; exit 1; }
command -v node >/dev/null || { echo "❌ node missing"; exit 1; }
command -v python3 >/dev/null || { echo "❌ python3 missing"; exit 1; }

NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "⚠️ Node < 20 detected (v$NODE_VERSION) — full mode may be unstable."
fi

# Docker check
if command -v docker >/dev/null; then
  DOCKER_OK=1
  echo "✅ docker available"
else
  DOCKER_OK=0
  echo "⚠️ docker not found — full mode not available, thin mode only."
fi

# Memory hint (Linux/macOS)
TOTAL_MEM=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}')
if [ -n "${TOTAL_MEM:-}" ]; then
  GB=$((TOTAL_MEM / 1024 / 1024))
  echo "💻 approx RAM: ${GB}GB"
  if [ "$GB" -lt 8 ]; then
    echo "⚠️ <8GB RAM — recommend EYEGENTS_MODE=thin"
  fi
fi

# OpenRouter key
if grep -q "OPENROUTER_API_KEY" .secrets 2>/dev/null; then
  echo "✅ OpenRouter key present in .secrets"
else
  echo "⚠️ OPENROUTER_API_KEY missing in .secrets — remote mode limited."
fi

# Suggest mode
if [ "$DOCKER_OK" -eq 1 ] && [ "${GB:-8}" -ge 8 ]; then
  echo "👉 Recommended: EYEGENTS_MODE=full for this machine."
else
  echo "👉 Recommended: EYEGENTS_MODE=thin for this machine."
fi
