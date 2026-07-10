#!/bin/bash
# Validates that Aider model metadata aligns with openrouter-routes.json
# Prevents model ID drift between the TypeScript routing config and Aider's metadata
#
# Usage: bash scripts/validate-aider-models.sh
# Exit 0 = aligned, Exit 1 = mismatch found

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/.."
ROUTES_FILE="${REPO_ROOT}/config/openrouter-routes.json"
METADATA_FILE="${REPO_ROOT}/.aider.model.metadata.json"

echo "🔍 Validating Aider model alignment..."

# Check files exist
if [ ! -f "$ROUTES_FILE" ]; then
  echo "❌ Routes file not found: $ROUTES_FILE"
  exit 1
fi

if [ ! -f "$METADATA_FILE" ]; then
  echo "❌ Aider metadata file not found: $METADATA_FILE"
  echo "   Run Phase 2 of the Aider integration to create it."
  exit 1
fi

# Extract OpenRouter IDs from routes.json
declare -A ROUTE_IDS
while IFS='=' read -r ref id; do
  ROUTE_IDS["$ref"]="$id"
done < <(jq -r '.models | to_entries[] | "\(.key)=\(.value.openrouterId)"' "$ROUTES_FILE")

# Check each route model exists in Aider metadata with openrouter/ prefix
ERRORS=0
for ref in "${!ROUTE_IDS[@]}"; do
  openrouter_id="${ROUTE_IDS[$ref]}"
  metadata_key="openrouter/${openrouter_id}"

  if ! jq -e ".\"${metadata_key}\"" "$METADATA_FILE" > /dev/null 2>&1; then
    echo "❌ Mismatch: ${ref} (${openrouter_id}) not found in ${METADATA_FILE}"
    echo "   Expected key: ${metadata_key}"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✅ ${ref} -> ${metadata_key}"
  fi
done

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "❌ ${ERRORS} model(s) not aligned. Update .aider.model.metadata.json to match openrouter-routes.json."
  exit 1
fi

echo ""
echo "✅ All Aider model metadata aligned with openrouter-routes.json"
