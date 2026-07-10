#!/bin/bash
# Store an Aider-assisted architectural decision in Qdrant
# Usage (inside aider session):
#   /run scripts/aider-add-decision.sh "context" "rationale" "outcome" "tag1,tag2"
#
# This feeds Aider-generated decisions back into the decisions Qdrant collection,
# making them available to OpenCode-based agents via ContextAssembler.getDecisions().

set -euo pipefail

MCP_URL="${MCP_URL:-http://localhost:3001}"
CONTEXT="${1:-}"
RATIONALE="${2:-}"
OUTCOME="${3:-}"
TAGS="${4:-aider}"

if [ -z "$CONTEXT" ] || [ -z "$RATIONALE" ] || [ -z "$OUTCOME" ]; then
  echo "Usage: $0 <context> <rationale> <outcome> [tags]"
  echo "  context   — What was the problem?"
  echo "  rationale — Why this solution?"
  echo "  outcome   — What was decided?"
  echo "  tags      — Comma-separated tags (default: aider)"
  exit 1
fi

# Convert comma-separated tags to JSON array
TAG_ARRAY=$(echo "$TAGS" | jq -R 'split(",") | map(gsub("^\\s+|\\s+$"; ""))')

# Verify MCP server is reachable
if ! curl -sf "${MCP_URL}/health" > /dev/null 2>&1; then
  echo "ERROR: MCP server not reachable at ${MCP_URL}"
  echo "Start it with: docker compose -f docker/docker-compose.yml up -d mcp-server"
  exit 1
fi

# Store decision via MCP vector_upsert
PAYLOAD=$(jq -n \
  --arg ctx "$CONTEXT" \
  --arg rat "$RATIONALE" \
  --arg out "$OUTCOME" \
  --argjson tags "$TAG_ARRAY" \
  '{
    name: "vector_upsert",
    arguments: {
      collection: "decisions",
      payload: {
        context: $ctx,
        rationale: $rat,
        outcome: $out,
        tags: ($tags + ["aider"]),
        author: "aider",
        status: "accepted"
      }
    }
  }')

RESPONSE=$(curl -sf "${MCP_URL}/tools/call" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" 2>&1)

if [ $? -ne 0 ]; then
  echo "ERROR: MCP vector_upsert call failed"
  echo "$RESPONSE"
  exit 1
fi

echo "Decision stored in Qdrant:"
echo "  Context:   $CONTEXT"
echo "  Rationale: $RATIONALE"
echo "  Outcome:   $OUTCOME"
echo "  Tags:      $TAGS + aider"
echo "$RESPONSE" | jq '.' 2>/dev/null || true
