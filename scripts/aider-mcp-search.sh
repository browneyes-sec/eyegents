#!/bin/bash
# Aider <-> eyegents MCP bridge — Vector search from Aider sessions
# Usage (inside aider session): /run scripts/aider-mcp-search.sh "auth middleware" 5
# Returns: top-N code chunks from Qdrant via MCP server
#
# Prerequisites: docker compose stack running (Qdrant + MCP server)
#   docker compose -f docker/docker-compose.yml up -d qdrant mcp-server

set -euo pipefail

QUERY="${1:-}"
LIMIT="${2:-5}"
MCP_URL="${MCP_URL:-http://localhost:3001}"

if [ -z "$QUERY" ]; then
  echo "Usage: $0 <query> [limit]"
  echo "  query  — natural language search query"
  echo "  limit  — max results (default: 5)"
  exit 1
fi

# Verify MCP server is reachable
if ! curl -sf "${MCP_URL}/health" > /dev/null 2>&1; then
  echo "ERROR: MCP server not reachable at ${MCP_URL}"
  echo "Start it with: docker compose -f docker/docker-compose.yml up -d mcp-server"
  exit 1
fi

# Execute vector search via MCP tools/call endpoint
RESPONSE=$(curl -sf "${MCP_URL}/tools/call" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"vector_search\",
    \"arguments\": {
      \"query\": \"${QUERY}\",
      \"limit\": ${LIMIT},
      \"collections\": [\"code_chunks\", \"decisions\"]
    }
  }" 2>&1)

if [ $? -ne 0 ]; then
  echo "ERROR: MCP vector_search call failed"
  echo "$RESPONSE"
  exit 1
fi

# Pretty-print the results
echo "$RESPONSE" | jq -r '.content[0].text' 2>/dev/null | jq '.' 2>/dev/null || echo "$RESPONSE"
