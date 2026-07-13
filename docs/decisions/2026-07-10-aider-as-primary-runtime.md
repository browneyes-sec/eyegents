# Aider as Primary Coding Agent Runtime

**Date:** 2026-07-10
**Status:** Accepted
**Author:** orchestrator

## Context

The eyegents platform (local-first AI coding with vectorized memory, multi-agent collaboration, and MCP tool integration) has a 7-agent architecture (orchestrator, backend, frontend, qa, ops, fullstack, certifier) communicating via typed JSON AgentMessages through a central orchestrator.

**Key Problem:** Need a primary coding agent. The Ochestrator previously selected from existing seven agents, but for eyegents' primary use case (coding/deb naming), the existing agents were insufficient.

**Decision:** Aider (AI pair-programming tool) becomes the **primary coding agent runtime**, replacing OpenCode as the default agent runtime. It's integrated via a three-layer architecture:
1. **TypeScript host-side adapter** (AiderAdapter)
2. **Docker MCP tool proxy** (aider_execute)
3. **Shell entry points** (bin/eyegents, etc.)

Aider participates as an eighth agent in the A2A protocol, matching the OpenRouter routing pattern of free primary (Nemotron 3 Super) with paid fallback (DeepSeek V4 Flash).

## Decision

### Architectural Layers

```
Layer 1: @eyegents/aider-adapter (TypeScript, host-side)
  ├─ spawns aider CLI via subprocess
  ├─ returns structured diffs (changedFiles, summary, tokenEstimate)
  ├─ consumes .env/OPENROUTER_API_KEY for auth
  ├─ reads CONVENTIONS.md + CLAUDE.md for context

Layer 2: aider_execute MCP tool (Docker container)
  ├─ proxy for remote execution
  ├─ checks aider availability in container
  ├─ executes via Python subprocess when available
  ├─ actionable error messages guide users to host execution

Layer 3: bin/eyegents family of entry points
  ├─ bin/eyegents — auto-detect (thin vs full mode)
  ├─ bin/eyegents-thin — Aider-only (no Docker)
  ├─ bin/eyegents-full — Docker stack + OpenCode fallback
```

### Entry Points

- **bin/eyegents**: Auto-detect based on Docker availability + memory
- **bin/eyegents-thin**: Immediate Aider-only coding
- **bin/eyegents-full**: Docker services orchestration with optional OpenCode

### Model Routing

- **Primary**: openrouter/qwen/qwen3-coder:free (1M token, $0) — Qwen3 Coder
- **Long-Context Fallback**: openrouter/deepseek/deepseek-v4-flash:free (1M token, $0)
- **General Router**: openrouter/free — routes to cheapest available free model

### Runtime Modes

| Mode | Docker? | Services | Notes |
|------|---------|----------|-------|
| thin | No | Local Aide only | Fast, low overhead |
| full | Yes | Ollama + Qdrant + MCP | Docker dev environment |

### Context Engineering

**Static Context** (read-only):
- CONVENTIONS.md: Project coding conventions
- CLAUDE.md: Assistant-specific instructions
- .aider.conf.yml: Aider configuration
- .aider.model.settings.yml: Model behavior overrides
- .aider.model.metadata.json: Model metadata (cost, limits)

**Dynamic Context** (repo-map):
- Aider scans codebase on first use (4096 token map, files refresh mode)
- Reduces token usage for large repo conversations

### A2A Protocol Integration

**AgentRoleSchema**: Added `"aider"` as an eighth role:
```json
{"role": "aider", "type": "coding", "models": ["qwen3-coder", "deepseek-flash-free"]}
```

**Orchestrator.routing_rules**: routes code edits, refactoring, implementation tasks to `AiderAdapter`.

**Model routing**: Follows existing pattern in `config/openrouter-routes.json`.

### Developer Experience

**One-button setup**:
```bash
# Install aliases once
source bin/
# Or just use the one-liner from repo root
OPENROUTER_API_KEY=$(grep ^OPENROUTER_API_KEY .secrets | cut -d= -f2) aider
```

**Bootstrap**: `./scripts/bootstrap.sh --quick/--thin/--full`

**Debugging**:
- `aider --list-models` for Aider CLI
- Check `.venvs/aider/bin/aider` for host binary
- Docker container: `docker exec mcp/server aider --version`

**Error recovery**:
```
aider: Rate limit exceeded → use --model deepseek-flash
       Python not found → apt-get install python3
```

### Decision Logging

All decisions are stored in Qdrant `decisions` collection:
```json
{
  "context": "Need primary coding agent for eyegents",
  "rationale": "Aider provides best coding tasks for TypeScript/JavaScript",
  "outcome": "Aider becomes eighth A2A agent with three-layer architecture",
  "tags": ["architecture", "coding-agent", "runtime"],
  "author": "orchestrator"
}
```

### Key Files

- **packages/aider-adapter/**: TypeScript adapter, Zod schemas
- **mcp-server/**: MCP server with aider_* tools
- **mcp-server/Dockerfile**: Embed Python+Aider in Docker image (~1.1GB)
- **bin/**: Entry point scripts auto-detect mode
- **scripts/**: setup, bootstrap, and shell utilities
- **docs/decisions/**: ADR documentation
- **out/**: Generated Docker build context

### Consequences

**Positive**:
- One unified coding agent for all eyegents projects
- Seamless integration with existing A2A orchestrator protocol
- Rich context (code + project conventions) for better tasks
- Cost-effective with free primary model (Nemotron)

**Risk**:
- Aider Python dependency on host vs Docker behavior
- Token estimation heuristic (cost tracking)
- Git hook bypass (mitigated by CI aider-lint-gate)
- Docker overhead (~1.1GB for MCP server)

### Related Files

- `packages/aider-adapter/src/adapter.ts`
- `packages/aider-adapter/src/types.ts`
- `mcp-server/src/tools/aider-tools.ts`
- `mcp-server/src/tools/openrouter-tools.ts`
- `packages/agent-runtime/src/orchestrator.ts`
- `packages/shared-types/src/index.ts`
- `config/openrouter-routes.json`
- `bin/eyegents`, `bin/eyegents-thin`, `bin/eyegents-full`
- `scripts/setup-alias.sh`
- `scripts/bootstrap.sh`

### Tests

All existing tests pass:
- Unit tests for TypeScript strict mode
- CI validation with aider-lint-gate
- Typecheck passes
- Build passes

### Future Considerations

1. Local Aider installation robustness (venv detection, binary resolution)
2. Cost tracking with actual aider token usage (not heuristic)
3. Aider config sync between host and container
4. UI for selecting Aider vs OpenCode mode in Docker
5. Aider training data for eyegents domain

**References**: eygent's existing OpenCode integration pattern, OpenRouter routing conventions, A2A protocol specification.