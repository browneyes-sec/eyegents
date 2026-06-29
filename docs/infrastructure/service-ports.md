# Service Ports

Port mapping for local development and production deployment.

## Port Map

| Service | Port | Protocol | Purpose | Exposed |
|---------|------|----------|---------|---------|
| Ollama | 11434 | HTTP | LLM inference API | Yes |
| Qdrant | 6333 | HTTP | REST API + Dashboard | Yes |
| Qdrant | 6334 | gRPC | High-performance vector ops | Yes |
| MCP Server | 3001 | HTTP | Health check endpoint | Yes |
| MCP Server | stdio | stdio | MCP protocol transport | No (in-container) |
| Indexer | — | — | No network (profile-gated) | No |

## Ollama (11434)

```bash
# Health check
curl http://localhost:11434/api/tags

# List loaded models
curl http://localhost:11434/api/ps

# Generate completion
curl http://localhost:11434/api/generate -d '{"model":"qwen2.5-coder:7b","prompt":"Hello"}'
```

## Qdrant (6333/6334)

```bash
# REST API health
curl http://localhost:6333/health

# Dashboard
open http://localhost:6333/dashboard

# List collections
curl http://localhost:6333/collections

# gRPC (used by qdrant-client for high-throughput operations)
# Port 6334 — accessed by MCP server internally, not from host
```

## MCP Server (3001)

```bash
# Health check
curl http://localhost:3001/health
# {"status":"ok","service":"eyegents-mcp","timestamp":"..."}

# MCP protocol runs over stdio (not HTTP)
# The HTTP server exists solely for health checks and Docker orchestration
```

## Indexer

The indexer has no exposed ports. It:

- Connects to Qdrant (6333) and Ollama (11434) internally via the Docker network
- Runs as a one-shot process (not a long-running server)
- Is gated behind the `indexing` profile

```bash
# Run indexer
docker compose --profile indexing up indexer

# Or
npm run index
```

## Inter-Service Communication

Services communicate over the `eyegents-net` bridge network using container names:

```
mcp-server ──> qdrant:6333 (REST)
mcp-server ──> ollama:11434 (HTTP)
indexer    ──> qdrant:6333 (REST)
indexer    ──> ollama:11434 (HTTP)
```

No port mapping is needed for internal traffic — only the host-facing ports listed above require `-p` mappings.

## Firewall Notes

For local development, only these ports need to be open:

- `11434` — Ollama (if calling from host tools)
- `6333` — Qdrant dashboard
- `6334` — Qdrant gRPC (optional, for high-throughput clients)
- `3001` — MCP health check

All other traffic stays within the Docker network.
