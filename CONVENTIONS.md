# eyegents Coding Conventions

## Language & Runtime
- TypeScript strict mode (`strict: true` in `tsconfig.base.json`)
- Node.js 20+. ESM modules (`"type": "module"` in package.json where applicable)
- Python 3.12+ for ops/ML scripts in `scripts/`

## Formatter & Linter
- Biome (not ESLint or Prettier). Run: `npx biome lint --write && npx biome format --write`
- No semicolon exceptions. No `any` types. Prefer `unknown` + type guards.

## Monorepo Structure
- Each `packages/<name>/` is a workspace package. Imports use `@eyegents/<name>` alias.
- New shared types go in `packages/shared-types/src/index.ts` with Zod schemas.
- Always add `export type` for re-exported types (isolatedModules compatible).

## Agent & Routing Patterns
- Agent roles are enum members in `shared-types`: `orchestrator | backend | frontend | qa | ops | fullstack | certifier`
- Model routing is data-driven via `config/openrouter-routes.json` + `AgentRouter` class. Do NOT hardcode model IDs in business logic.
- CostTracker must be updated when adding new OpenRouter models.

## MCP Tools
- New MCP tools go in `mcp-server/src/tools/`. Add to `ALL_TOOLS` in `mcp-server/src/index.ts`.
- Tool handlers must validate inputs with Zod and return `{ content: [{ type: "text", text: JSON.stringify(result) }] }`.

## Git Conventions
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `ci:`
- Scope optional: `feat(openrouter-client):`, `fix(context-engine):`
- Never commit `.env`, `.secrets`, `*.key`, or `node_modules/`

## Testing
- Vitest for unit tests. Test file: `<module>.test.ts` next to source.
- Playwright for e2e. Property-based tests for data-transformation logic.
- Minimum 80% branch coverage on `packages/` sources.

## Docker
- Resource limits defined per service in `docker/docker-compose.yml`. Always specify `cpus` and `memory` for new services.
- Never expose credentials in Dockerfile ARGs or ENV without secret mounting.

## Security
- Secrets sourced from `.secrets` (gitignored). Accessed via `scripts/load-secrets.sh`.
- All shell commands in MCP tools run through the allowlist in `mcp-server/src/tools/shell-tools.ts`.
