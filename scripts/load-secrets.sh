#!/usr/bin/env bash
# Load secrets from .secrets file into environment
# Usage: source scripts/load-secrets.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_FILE="${SCRIPT_DIR}/../.secrets"

if [ ! -f "$SECRETS_FILE" ]; then
  echo "ERROR: .secrets file not found at $SECRETS_FILE"
  echo "Copy .secrets.example to .secrets and fill in your keys."
  exit 1
fi

echo "Loading secrets from .secrets..."

while IFS='=' read -r key value; do
  # Skip empty lines and comments
  [[ -z "$key" || "$key" =~ ^# ]] && continue
  export "$key=$value"
  echo "  [OK] $key"
done < "$SECRETS_FILE"

# Propagate to .env for Aider compatibility (Aider reads .env at git root)
if [ -n "${OPENROUTER_API_KEY:-}" ]; then
  REPO_ROOT="${SCRIPT_DIR}/.."
  ENV_FILE="${REPO_ROOT}/.env"
  # Update OPENROUTER_API_KEY in .env if present, otherwise append
  if [ -f "$ENV_FILE" ] && grep -q "^OPENROUTER_API_KEY=" "$ENV_FILE"; then
    sed -i "s|^OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=${OPENROUTER_API_KEY}|" "$ENV_FILE"
  elif [ -f "$ENV_FILE" ]; then
    echo "OPENROUTER_API_KEY=${OPENROUTER_API_KEY}" >> "$ENV_FILE"
  fi
  echo "  [OK] .env bridge updated for Aider"
fi

echo ""
echo "Secrets loaded. Verify with: env | grep -E 'OPENROUTER|GH_PAT|GITHUB_PAT'"
