# Aider as First-Class A2A Agent

**Date:** 2026-07-09
**Status:** Accepted
**Author:** orchestrator

## Context

The eyegents platform has a 7-agent architecture (orchestrator, backend, frontend, qa,
ops, fullstack, certifier) communicating via typed JSON AgentMessages through a central
orchestrator. Aider (an AI pair-programming agent) was initially integrated as a parallel
terminal-level coding tool sharing credentials and conventions but not participating in
the A2A protocol.

To make Aider a true multi-agent participant, it needed:
1. A role in the AgentRoleSchema
2. Model routing in openrouter-routes.json
3. Keyword routing in the orchestrator
4. A TypeScript adapter for programmatic invocation
5. MCP tool access for remote execution

## Decision

Add `"aider"` as an eighth agent role in the multi-agent framework, backed by a three-layer
adapter architecture:

```
Layer 1: @eyegents/aider-adapter (TypeScript, host-side)
  - Spawns Aider Python CLI as subprocess
  - Returns structured diffs and changed files
  - Integrates with CostTracker for token tracking
  - Reads CONVENTIONS.md + CLAUDE.md for context

Layer 2: aider_execute MCP tool (runs in Docker container)
  - Proxy for remote execution
  - Checks Aider availability in container
  - Executes via Python subprocess when available
  - Graceful fallback with setup instructions

Layer 3: scripts/aider-execute.sh (shell)
  - Direct CLI wrapper for developer terminal
  - Activates venv, loads credentials, captures diff
```

Model routing follows the existing nemotron-super:free primary with deepseek-v4-flash
paid fallback pattern, keeping costs at $0 for most sessions.

## Consequences

Positive:
- Orchestrator can now decompose tasks and route coding subtasks to Aider
- AiderAdapter provides programmatic access from TypeScript (no CLI needed)
- Full A2A protocol compliance via AgentRoleSchema
- CostTracker can estimate aider token usage
- Decisions can be automatically stored in Qdrant after aider tasks

Risk:
- Aider Python CLI must be available where the adapter runs (host vs Docker)
- Token estimation is heuristic (Aider doesn't report token counts)
- Auto-commit disabled by default — requires explicit opt-in
- Git hooks bypass risk mitigated by CI aider-lint-gate

## Related Files

- `packages/aider-adapter/src/adapter.ts` — Core AiderAdapter class
- `packages/aider-adapter/src/types.ts` — Zod schemas for A2A messages
- `mcp-server/src/tools/aider-tools.ts` — MCP tool `aider_execute` + `aider_check`
- `packages/shared-types/src/index.ts` — Added `"aider"` to AgentRoleSchema
- `config/openrouter-routes.json` — Added aider route config
- `packages/agent-runtime/src/orchestrator.ts` — Added aider to ROUTING_RULES
- `scripts/aider-execute.sh` — CLI shell wrapper
- `.aider.conf.yml` — Aider project config
- `CONVENTIONS.md` — eyegents coding conventions
