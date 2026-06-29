# Quick Start

Get eyegents running in 5 minutes.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose v2)
- Node.js 20+
- npm 10+
- 3.7GB+ RAM available for Docker

## Setup

```bash
# Clone the repository
git clone https://github.com/browneyes-sec/eyegents.git
cd eyegents

# Run bootstrap (installs everything)
./scripts/bootstrap.sh
```

The bootstrap script:

1. Verifies Docker and Node.js are installed
2. Starts Ollama and Qdrant containers
3. Waits for services to be healthy
4. Pulls required models (qwen2.5-coder:7b, bge-m3)
5. Installs npm dependencies
6. Builds all TypeScript packages
7. Indexes the codebase
8. Starts the MCP server

## Verify

```bash
# Check all containers are running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Expected:
# eyegents-ollama    Up (healthy)    0.0.0.0:11434->11434/tcp
# eyegents-qdrant    Up (healthy)    0.0.0.0:6333->6333/tcp, 0.0.0.0:6334->6334/tcp
# eyegents-mcp       Up (healthy)    0.0.0.0:3001->3001/tcp

# Test MCP health
curl http://localhost:3001/health
# → {"status":"ok","service":"eyegents-mcp","timestamp":"..."}

# Test Qdrant
curl http://localhost:6333/collections
# → {"result":{"collections":[...]}}

# Test Ollama
curl http://localhost:11434/api/tags
# → {"models":[...]}
```

## First Task

Start OpenCode and ask the orchestrator to build a feature:

```bash
# Start OpenCode
opencode

# In the chat, ask:
> Build a REST API endpoint for user authentication with JWT tokens
```

The orchestrator will:

1. Decompose the task into subtasks
2. Route to the appropriate agent (backend)
3. Retrieve relevant context from the vector database
4. Generate code using the optimal model
5. Create a PR when complete

## What's Running

| Service | URL | Purpose |
|---------|-----|---------|
| MCP Server | http://localhost:3001 | Tool server for agents |
| Qdrant Dashboard | http://localhost:6333/dashboard | Vector database UI |
| Ollama API | http://localhost:11434 | Local LLM inference |

## Development Mode

For hot-reload development:

```bash
./scripts/dev.sh
```

This starts all services with file watching enabled.

## Troubleshooting

### Ollama won't start

```bash
# Check Docker resources
docker system info | grep -i memory

# Ensure 2.5GB+ available for Ollama
```

### MCP server fails to connect

```bash
# Check Qdrant health
curl http://localhost:6333/health

# Check Ollama health
curl http://localhost:11434/api/tags

# Restart MCP server
docker compose -f docker/docker-compose.yml restart mcp-server
```

### Indexer timeout

The indexer may take several minutes for large codebases. Run it manually:

```bash
docker compose --profile indexing up indexer
```

## Next Steps

- [OpenRouter Setup](openrouter-setup.md) — Enable remote LLM fallback
- [First Agent](first-agent.md) — Build a custom agent
- [MCP Tools Reference](../api/mcp-tools-reference.md) — All available tools
