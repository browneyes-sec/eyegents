# CLAUDE.md — eyegents Project Context

## Project Overview
**eyegents** — Local-first AI coding platform with vectorized memory, multi-agent collaboration, and MCP tool integration.

**Documentation**: See [`docs/`](docs/) for full architecture, operations, and API reference.

## Architecture
- **Orchestrator** → Routes to: backend, frontend, qa, ops, fullstack, certifier
- **Vector DB**: Qdrant (code, conversations, decisions, patterns)
- **LLM (Local)**: Ollama (qwen2.5-coder:7b primary, qwen2.5:0.5b small)
- **LLM (Remote)**: OpenRouter (Nemotron 3 Super/Ultra, DeepSeek V4 Flash/Pro)
- **MCP**: Custom server with GitHub, FS, Shell, Vector tools
- **Skills**: Domain-specific patterns loaded as few-shot

## Key Conventions
- **Language**: TypeScript (strict), Python for ML/ops
- **Runtime**: Node 20+, Docker for services
- **Testing**: Vitest (unit), Playwright (e2e), property-based
- **Linting**: Biome (fast, Rust-based)
- **Formatting**: Biome (single tool)
- **Git**: Conventional commits, trunk-based, PR required

## Vector Index Schema
| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `code_chunks` | Semantic code search | `filePath`, `language`, `astType`, `content`, `embedding` |
| `conversations` | Session memory | `sessionId`, `messages[]`, `summary`, `decisions[]` |
| `decisions` | Architectural memory | `context`, `rationale`, `outcome`, `tags` |
| `skill_patterns` | Few-shot examples | `skillName`, `pattern`, `example` |

## Agent Skills (Loaded at Runtime)
- `context-engineering`: retrieve, assemble, index
- `vector-memory`: remember, recall, forget
- `mcp-tools`: search_code, get_decision, propose_decision
- `github-operations`: create_pr, review, search
- `code-review`: security, performance, style
- `testing-patterns`: unit, integration, e2e, property
- `security-audit`: secrets, vulns, compliance

## MCP Tools Available
- `vector_search` — Hybrid search across all collections
- `vector_upsert` — Store code, decisions, conversations
- `github_api` — PR, issues, code search, reviews
- `filesystem` — Read, write, glob, grep, stat
- `shell` — Allowlisted commands (npm, git, docker, etc.)
- `skill_execute` — Run skill workflows

## Resource Limits (Critical)
- **Total RAM budget**: ≤ 3.5GB (host has 3.7GB)
- **Ollama**: 2.5GB limit, 2 concurrent, 2 models loaded
- **Qdrant**: 1GB limit, mmap threshold 50MB
- **MCP Server**: 512MB
- **Indexer**: 1GB (runs on-demand)
- **OpenCode**: ~500MB

## Model Management
- Primary: `qwen2.5-coder:7b` (coding specialist)
- Small: `qwen2.5:0.5b` (titles, summaries, simple tasks)
- Embeddings: `bge-m3:latest` (1024-dim, multilingual)
- Alt embedding: `nomic-embed-text:latest` (768-dim, fast)
- **Auto-upgrade**: Weekly GitHub Action checks Ollama library

## Playwright on WSL (Ubuntu 26.04+)

Playwright doesn't natively support Ubuntu 26.04. Fix:

```bash
# One-time setup:
bash scripts/setup-playwright.sh

# Or manually:
~/.local/share/uv/tools/aider-chat/bin/python -m pip install --upgrade playwright
~/.local/share/uv/tools/aider-chat/bin/python -m playwright install chromium-headless-shell

# Download system libs (no sudo needed):
cd /tmp && apt-get download libnspr4 libnss3 libasound2t64
# Then extract .so files to ~/.local/lib/playwright-deps/

# Set env vars (done automatically by eyegents alias):
export PLAYWRIGHT_BROWSERS_PATH="${HOME}/.local/share/playwright-browsers"
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export LD_LIBRARY_PATH="${HOME}/.local/lib/playwright-deps:${LD_LIBRARY_PATH:-}"
```

## OpenRouter Agent Routing (Isolated Package)
| Agent | Primary | Fallback | Notes |
|-------|---------|----------|-------|
| orchestrator | local qwen2.5-coder:7b | Qwen3 Coder (free) | Hybrid: local for simple, remote for complex |
| backend | DeepSeek V4 Flash | Qwen3 Coder (free) | Fast coding tasks |
| frontend | local qwen2.5-coder:7b | Qwen3 Coder (free) | UI tasks stay local |
| qa | DeepSeek V4 Flash | Qwen3 Coder (free) | Fast test generation |
| ops | local qwen2.5-coder:7b | Qwen3 Coder (free) | Infra tasks stay local |
| fullstack | DeepSeek V4 Flash | Qwen3 Coder (free) | E2E features |
| certifier | Nemotron 3 Ultra | DeepSeek V4 Pro | Deep reasoning for security |
| aider | OpenRouter free (openrouter/free) | Qwen3 Coder (free) | AI pair-programming via Aider adapter |

## OpenRouter Models
| Model | ID | Context | Cost | Use Case |
|-------|----|---------|------|---------|
| DeepSeek V4 Flash (paid) | `deepseek/deepseek-v4-flash` | 1M | $0.112/$0.224 | **Primary coding model** (credits on key) |
| Qwen3 Coder (free) | `qwen/qwen3-coder:free` | 1M | $0 | Economy fallback, no rate limit |
| DeepSeek V4 Flash (free) | `deepseek/deepseek-v4-flash:free` | 1M | $0 | Long-context free fallback |
| OpenRouter free | `openrouter/free` | varies | $0 | **Aider primary** — routes to cheapest free model |
| Nemotron 3 Ultra | `nvidia/nemotron-3-ultra-550b-a55b` | 1M | $0.001/$0.003 | Security audits |
| DeepSeek V4 Pro | `deepseek/deepseek-v4-pro` | 1M | $0.435/$0.87 | Complex reasoning |
| Kimi K2.7-Code | `moonshotai/kimi-k2.7-code` | 262K | $0.95/$4.00 | Coding specialist, agentic coding |
| Kimi K2.6 | `moonshotai/kimi-k2.6` | 262K | $0.95/$3.00 | General purpose, vision, reasoning |
| Kimi K3 | `moonshotai/kimi-k3` | 1M | $3.00/$15.00 | Flagship, complex reasoning |

## External Fallback Strategy
| Scenario | Fallback |
|----------|----------|
| Ollama OOM / crash | OpenCode Zen / Nemotron-3-Ultra (via provider) |
| Qdrant unavailable | In-memory vector index (HNSWlib) + file cache |
| Local model quality insufficient | OpenRouter / OpenAI via `/connect` |
| GPU unavailable | CPU-optimized: `OLLAMA_NUM_THREAD=4`, `num_ctx=8192` |

## Security Rules
- No secrets in code (use `.env`, GitHub secrets)
- All PRs require certifier approval
- Dependencies scanned weekly (Dependabot + OSV)
- Container images: distroless, non-root, read-only FS

## Development Workflow
```bash
# One-command bootstrap
./scripts/bootstrap.sh

# Dev with hot reload
./scripts/dev.sh

# One-command Aider start (auto-detects mode)
scripts/start-aider.sh

# Index codebase (run after major changes)
docker compose -f docker/docker-compose.yml --profile indexing up indexer

# Reindex after changes (alternative)
./scripts/reindex.sh

# Run tests
npm run test

# Typecheck all packages
npm run typecheck

# Test OpenRouter connectivity
source .venvs/openrouter/bin/activate
python scripts/openrouter-test.py

# Health checks (quick/full)
./scripts/health-check.sh [quick|full]
```

## Agent Routing Keywords
| Agent | Keywords |
|-------|----------|
| backend | api, database, server, auth, deploy, k8s, docker, microservice |
| frontend | react, vue, component, css, ui, ux, state, redux, hook |
| qa | test, spec, coverage, lint, benchmark, e2e, integration |
| ops | deploy, pipeline, monitor, logs, terraform, ansible, ci, cd |
| certifier | security, audit, compliance, vulnerability, secrets, gdpr |
| fullstack | feature, end-to-end, full stack, integration |
| certifier | security, audit, compliance, vulnerability, secrets, gdpr |
| aider | code, edit, refactor, implement, pair-program, ai coding |

## Decision Logging Format
When making architectural decisions, log via:
```json
{
  "type": "decision",
  "context": "What was the problem?",
  "rationale": "Why this solution?",
  "outcome": "What was decided?",
  "tags": ["architecture", "database"],
  "author": "backend"
}
```