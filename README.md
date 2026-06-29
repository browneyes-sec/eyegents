# eyegents

Local-first AI coding platform with vectorized memory, multi-agent collaboration, and MCP tool integration.

[![CI](https://github.com/browneyes-sec/eyegents/actions/workflows/ci.yml/badge.svg)](https://github.com/browneyes-sec/eyegents/actions/workflows/ci.yml)
[![Staging](https://github.com/browneyes-sec/eyegents/actions/workflows/staging.yml/badge.svg)](https://github.com/browneyes-sec/eyegents/actions/workflows/staging.yml)
[![Docs](https://github.com/browneyes-sec/eyegents/actions/workflows/docs-publish.yml/badge.svg)](https://github.com/browneyes-sec/eyegents/actions/workflows/docs-publish.yml)

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         eyegents Platform                           │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │   OpenCode   │◄───│  eyegents    │◄───│   Vector Index        │  │
│  │   (Agent)    │    │  MCP Server  │    │   (Qdrant)            │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬────────────┘  │
│         │                   │                       │               │
│         ▼                   ▼                       ▼               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Ollama (Docker)                          │   │
│  │  qwen2.5-coder:7b  │  bge-m3:latest  │  nomic-embed-text   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                            ▲                                        │
│                            │ OpenRouter (Remote)                    │
│  ┌─────────────────────────┴───────────────────────────────────┐   │
│  │  Nemotron 3 Super (free) │ DeepSeek V4 Flash │ Nemotron Ultra│   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Features

- **Multi-Agent System**: 7 specialized agents (orchestrator, backend, frontend, qa, ops, fullstack, certifier)
- **Vector Memory**: Persistent, semantic code/search/conversation/decision memory via Qdrant
- **MCP Integration**: GitHub API, filesystem, shell, vector tools exposed via MCP
- **Context Engineering**: Automatic context assembly with token budget management
- **Local-First**: Runs entirely on your hardware (Ollama + Qdrant in Docker)
- **External Fallback**: Automatic fallback to OpenCode Zen, OpenRouter, OpenAI
- **OpenRouter Integration**: Task-based routing to Nemotron (free) and DeepSeek models
- **Model Auto-Upgrade**: Weekly checks for new Ollama model versions

## Quick Start

```bash
# Clone and bootstrap
git clone https://github.com/browneyes-sec/eyegents
cd eyegents
./scripts/bootstrap.sh

# Start coding
opencode
```

### OpenRouter Setup (Optional)

```bash
# Set up isolated Python environment
python3 -m venv .venvs/openrouter
source .venvs/openrouter/bin/activate
pip install openai httpx pydantic python-dotenv

# Configure API key
cp config/openrouter.env .env.local
# Edit .env.local with your OPENROUTER_API_KEY

# Test connectivity
python scripts/openrouter-test.py
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
├── config/              # OpenRouter config (isolated)
│   ├── openrouter.env   # API keys, model IDs
│   └── openrouter-routes.json  # Agent-to-model routing rules
├── docker/              # Docker Compose stack
├── mcp-server/          # MCP server with tools
├── vector-index/        # Code indexer, embedder, retriever
├── packages/            # Shared packages (monorepo)
│   ├── ollama-client/   # Ollama + fallback client (untouched)
│   ├── openrouter-client/ # OpenRouter routing (isolated, new)
│   ├── qdrant-client/   # Qdrant vector DB client
│   ├── context-engine/  # Context assembly, memory, token budget
│   ├── agent-runtime/   # Multi-agent orchestration
│   └── ...
├── scripts/             # Bootstrap, dev, model management
│   └── openrouter-test.py  # OpenRouter connectivity test
└── CLAUDE.md            # Project context for agents
```

## Agents

| Agent | Role | Local Model | Remote Model |
|-------|------|-------------|--------------|
| orchestrator | Task decomposition, routing, synthesis | qwen2.5-coder:7b | Nemotron 3 Super (free) |
| backend | APIs, DB, auth, messaging | qwen2.5-coder:7b | DeepSeek V4 Flash |
| frontend | React/Vue, state, styling, a11y | qwen2.5-coder:7b | Nemotron 3 Super (free) |
| qa | Unit, integration, e2e, benchmarks | qwen2.5-coder:7b | DeepSeek V4 Flash |
| ops | CI/CD, infra, monitoring, secrets | qwen2.5-coder:7b | Nemotron 3 Super (free) |
| fullstack | End-to-end features, integration | qwen2.5-coder:7b | DeepSeek V4 Flash |
| certifier | Security, compliance, audit | qwen2.5-coder:7b | Nemotron 3 Ultra |

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

# Test OpenRouter connectivity
source .venvs/openrouter/bin/activate
python scripts/openrouter-test.py
```

## Configuration

- `.env` — Environment variables (copy from `.env.example`)
- `config/openrouter.env` — OpenRouter API keys and model IDs (isolated)
- `config/openrouter-routes.json` — Agent-to-model routing rules
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

## Documentation

Full documentation is available in the [`docs/`](docs/) directory:

| Section | Description |
|---------|-------------|
| [Architecture](docs/architecture/system-overview.md) | System design, data flow, agent routing, ADRs |
| [Operations](docs/operations/runbook.md) | Runbook, incident response, health checks |
| [Agent Ops](docs/agent-ops/context-engineering.md) | Context engineering, memory management, cost governance |
| [Security](docs/security/threat-model.md) | Threat model, secrets, container security |
| [Development](docs/development/getting-started.md) | Onboarding, contributing, testing |
| [Infrastructure](docs/infrastructure/docker-architecture.md) | Docker architecture, deployment |
| [API](docs/api/mcp-tools-reference.md) | MCP tools, OpenRouter integration |
| [Guides](docs/guides/quick-start.md) | Quick start, OpenRouter setup |

## License

MIT