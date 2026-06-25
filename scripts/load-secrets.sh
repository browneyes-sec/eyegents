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

echo ""
echo "Secrets loaded. Verify with: env | grep -E 'OPENROUTER|GH_PAT|GITHUB_PAT'"
