# eyegents

Local-first AI coding platform with vectorized memory, multi-agent collaboration, and MCP tool integration.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        eyegents Platform                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │   OpenCode   │◄───│  eyegents    │◄───│   Vector Index    │  │
│  │   (Agent)    │    │  MCP Server  │    │   (Qdrant)        │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬──────────┘  │
│         │                   │                       │             │
│         ▼                   ▼                       ▼             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Ollama (Docker)                          │ │
│  │  qwen2.5-coder:7b  │  bge-m3:latest  │  nomic-embed-text   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Features

- **Multi-Agent System**: 7 specialized agents (orchestrator, backend, frontend, qa, ops, fullstack, certifier)
- **Vector Memory**: Persistent, semantic code/search/conversation/decision memory via Qdrant
- **MCP Integration**: GitHub API, filesystem, shell, vector tools exposed via MCP
- **Context Engineering**: Automatic context assembly with token budget management
- **Local-First**: Runs entirely on your hardware (Ollama + Qdrant in Docker)
- **External Fallback**: Automatic fallback to OpenCode Zen, OpenRouter, OpenAI
- **Model Auto-Upgrade**: Weekly checks for new Ollama model versions

## Quick Start

```bash
# Clone and bootstrap
git clone https://github.com/your-org/eyegents
cd eyegents
./scripts/bootstrap.sh

# Start coding
opencode
```

## Requirements

- Docker + Docker Compose v2
- Node.js 20+
- 4GB+ RAM (8GB recommended)
- GPU optional (NVIDIA with nvidia-container-toolkit)

## Project Structure

```
eyegents/
├── .opencode/           # OpenCode config, agents, skills, rules
├── .github/workflows/   # CI/CD, model updates, vector sync
├── docker/              # Docker Compose stack
├── mcp-server/          # MCP server with tools
├── vector-index/        # Code indexer, embedder, retriever
├── packages/            # Shared packages (monorepo)
│   ├── ollama-client/   # Ollama + fallback client
│   ├── qdrant-client/   # Qdrant vector DB client
│   ├── context-engine/  # Context assembly, memory, token budget
│   ├── agent-runtime/   # Multi-agent orchestration
│   └── ...
├── scripts/             # Bootstrap, dev, model management
└── CLAUDE.md            # Project context for agents
```

## Agents

| Agent | Role | Model |
|-------|------|-------|
| orchestrator | Task decomposition, routing, synthesis | qwen2.5-coder:7b |
| backend | APIs, DB, auth, messaging | qwen2.5-coder:7b |
| frontend | React/Vue, state, styling, a11y | qwen2.5-coder:7b |
| qa | Unit, integration, e2e, benchmarks | qwen2.5-coder:7b |
| ops | CI/CD, infra, monitoring, secrets | qwen2.5-coder:7b |
| fullstack | End-to-end features, integration | qwen2.5-coder:7b |
| certifier | Security, compliance, audit | qwen2.5-coder:7b |

## Skills

- `context-engineering` — Vector retrieval, context assembly
- `vector-memory` — Persistent memory operations
- `mcp-tools` — MCP client wrappers
- `github-operations` — PR, issues, reviews
- `code-review` — Security, performance, style checklists
- `testing-patterns` — Unit, integration, E2E, property patterns
- `security-audit` — Secret scan, dependency audit, SAST

## MCP Tools

```bash
# Vector search
mcp:eyegents:vector_search query="authentication middleware" limit=10

# Code search with language filter
mcp:eyegents:code_search query="password hashing" languages=["typescript"]

# GitHub operations
mcp:eyegents:github_create_pr title="feat: add auth" body="..." head="feature/auth"

# Filesystem
mcp:eyegents:fs_read path="src/auth.ts"
mcp:eyegents:fs_write path="src/new.ts" content="..."

# Shell (allowlisted)
mcp:eyegents:shell_exec command="npm" args=["test"]

# Skills
mcp:eyegents:skill_execute skillName="testing-patterns" task="generate unit tests"
```

## Development

```bash
# Dev mode with hot reload
./scripts/dev.sh

# Re-index codebase
docker compose -f docker/docker-compose.yml --profile indexing up indexer

# Run tests
npm run test

# Typecheck
npm run typecheck

# Lint
npm run lint
```

## Configuration

- `.env` — Environment variables (copy from `.env.example`)
- `.opencode/opencode.jsonc` — OpenCode config
- `docker/docker-compose.yml` — Service definitions
- `docker/qdrant-config/config.yaml` — Qdrant tuning

## Resource Limits

| Service | CPU | Memory |
|---------|-----|--------|
| Ollama | 3.0 | 2.5GB |
| Qdrant | 1.0 | 1GB |
| MCP Server | 0.5 | 512MB |
| Indexer | 1.0 | 1GB (on-demand) |

## License

MIT