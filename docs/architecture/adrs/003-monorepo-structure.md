# ADR-003: Monorepo Structure

## Status

Accepted

## Context

Eyegents consists of multiple packages that share types, utilities, and configuration:

- `@eyegents/core` — Shared types, interfaces, and constants
- `@eyegents/mcp-server` — MCP server implementation and tool handlers
- `@eyegents/vector-store` — Qdrant integration and embedding pipeline
- `@eyegents/agents` — Agent definitions, routing logic, model assignments
- `@eyegents/cli` — Command-line interface and user interaction layer

These packages have tight coupling: type changes in `core` often require coordinated updates in `mcp-server` and `agents`. Managing this across separate repositories introduces merge coordination overhead and version skew risk.

## Decision

Use a **monorepo** structure managed with **npm workspaces** and **Turborepo** for build orchestration.

```
eyegents/
├── packages/
│   ├── core/
│   ├── mcp-server/
│   ├── vector-store/
│   ├── agents/
│   └── cli/
├── docker/
├── docs/
├── package.json          (workspace root)
├── turbo.json
└── tsconfig.base.json
```

**Build tool:** Turborepo handles caching, parallel builds, and dependency-aware task ordering.

**Docker builds:** Multi-stage Dockerfiles reference workspace packages; Docker Compose orchestrates the full stack (Ollama, Qdrant, MCP server).

## Consequences

### Positive

- **Single CI pipeline** — One workflow validates all packages; no cross-repo coordination
- **Shared dependencies** — One `node_modules` tree, deduplicated; version conflicts caught at install time
- **Atomic changes** — A single commit can update types in `core`, implementation in `mcp-server`, and tests in `agents`
- **Simplified refactoring** — Cross-package renames and API changes are IDE-refactorable in one pass
- **Consistent tooling** — One ESLint config, one TypeScript config, one test framework across all packages

### Negative

- **Repository size** — All history lives in one repo; `git clone` pulls everything even if you only work on one package
- **Build cache invalidation** — Turborepo's caching is effective but cold builds are slower than building a single package
- **CI complexity** — The pipeline must handle multiple build targets and Docker image builds in sequence
- **Contributor coordination** — Multiple developers editing shared packages may create merge conflicts more frequently

### Mitigations

- Turborepo remote caching (Vercel or self-hosted) reduces cold build times
- Shallow clones (`--depth 1`) for CI and contributor onboarding
- Package-level `CODEOWNERS` for review gating on shared packages
- Independent versioning per package via `changesets` for release management
