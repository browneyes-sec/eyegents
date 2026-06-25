# Docker Architecture

Docker Compose as the service layer — no Kubernetes. Designed for local-first development with production parity.

## Design Philosophy

eyegents uses Docker Compose as the sole service orchestration layer. This is intentional:

- **Simplicity**: One `docker compose up` starts the entire stack
- **Local-first**: Developers run the same stack as CI/CD
- **Resource-aware**: Tight RAM budgets (3.7GB host) require explicit limits
- **On-demand indexing**: The vector indexer runs only when needed, not as a persistent service

## Services

| Service | Image | Purpose | Always Running |
|---------|-------|---------|----------------|
| `ollama` | `ollama/ollama:latest` | Local LLM inference (qwen2.5-coder, bge-m3) | Yes |
| `qdrant` | `qdrant/qdrant:v1.12.0` | Vector database for code, conversations, decisions | Yes |
| `mcp-server` | Custom build | MCP tool server (stdio + HTTP health) | Yes |
| `indexer` | Custom build | Code indexing pipeline (profile-gated) | On-demand |

## Multi-Stage Builds

Both custom images (mcp-server, vector-index) use 3-stage builds:

```
base -> deps -> builder -> production
```

### Stage Breakdown

1. **base**: `node:20-alpine` with git (mcp-server) or python3/make/g++ (indexer)
2. **deps**: `npm ci` with workspace-specific packages only
3. **builder**: Compile TypeScript across all workspaces
4. **production**: Copy only `dist/` artifacts + minimal runtime dependencies

This keeps production images small — no dev dependencies, no source files, no build tools.

## Health Checks

Every persistent service has automated health checks:

| Service | Check | Interval | Timeout | Retries | Start Period |
|---------|-------|----------|---------|---------|--------------|
| ollama | `ollama ps` | 10s | 5s | 5 | 30s |
| qdrant | `wget localhost:6333/health` | 10s | 5s | 5 | 10s |
| mcp-server | `wget localhost:3001/health` | 10s | 5s | 3 | 15s |

### Dependency Ordering

Services start in order via `depends_on` with health conditions:

```
ollama (healthy) ──┐
                   ├──> mcp-server (healthy)
qdrant (healthy) ──┘
                   └──> indexer (on-demand, profile: indexing)
```

The MCP server waits for both Ollama and Qdrant to be healthy before starting.

## Resource Limits

Strict limits prevent OOM on constrained hosts:

| Service | CPU Limit | RAM Limit | CPU Reserve | RAM Reserve |
|---------|-----------|-----------|-------------|-------------|
| ollama | 3.0 | 2.5G | 1.5 | 1G |
| qdrant | 1.0 | 1G | 0.5 | 512M |
| mcp-server | 0.5 | 512M | — | — |
| indexer | — | 1G | — | — |

**Total budget**: ~4.5G peak (all services running), ~3.5G typical (without indexer).

## Volumes

Named volumes for persistent data:

| Volume | Mount Point | Purpose |
|--------|-------------|---------|
| `ollama-data` | `/root/.ollama` | Model weights and cache |
| `qdrant-data` | `/qdrant/storage` | Vector collections and indexes |
| `indexer-cache` | `/cache` | Indexing state and chunk cache |

The workspace is mounted read-only into the indexer (`/workspace:ro`).

## Network

All services share a custom bridge network:

```yaml
networks:
  default:
    name: eyegents-net
```

Services reference each other by container name (e.g., `http://qdrant:6333`, `http://ollama:11434`). No port mapping is required for inter-service communication.

## OpenRouter Overlay

The OpenRouter integration uses a Compose overlay file:

```bash
docker compose -f docker-compose.yml -f docker-compose.openrouter.yml up
```

The overlay merges environment variables (API keys, model IDs) into the mcp-server service without duplicating the base configuration.

## Profiles

The indexer uses a Compose profile to run on-demand:

```bash
# Start indexer (runs once, then exits)
docker compose --profile indexing up indexer

# Or via npm script
npm run index
```

This keeps the indexer out of the default `docker compose up` lifecycle.
