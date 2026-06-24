# CLAUDE.md — eyegents Project Context

## Project Overview
**eyegents** — Local-first AI coding platform with vectorized memory, multi-agent collaboration, and MCP tool integration.

## Architecture
- **Orchestrator** → Routes to: backend, frontend, qa, ops, fullstack, certifier
- **Vector DB**: Qdrant (code, conversations, decisions, patterns)
- **LLM**: Ollama (qwen2.5-coder:7b primary, qwen2.5:0.5b small)
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

# Index codebase (run after major changes)
docker compose -f docker/docker-compose.yml --profile indexing up indexer

# Run tests
npm run test

# Typecheck all packages
npm run typecheck
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