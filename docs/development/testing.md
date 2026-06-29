# Testing Strategy

Eyegents uses a layered testing approach to ensure quality at every level.

## Unit Tests

**Framework:** [Vitest](https://vitest.dev/)

Unit tests live alongside source files or in `__tests__/` directories:

```
packages/**/*.test.ts
```

Run unit tests:

```bash
npm test
```

Vitest provides fast, isolated test execution with built-in TypeScript support and mocking.

## Integration Tests

Integration tests verify that components work together correctly:

- **MCP tool tests** — validate tool definitions, invocations, and response formatting
- **API tests** — test HTTP endpoints and request/response contracts

These tests typically use real service instances (via Docker Compose) rather than mocks.

## E2E Tests

**Framework:** [Playwright](https://playwright.dev/)

End-to-end tests validate complete user flows through the UI. They run against a fully booted application stack.

## Property-Based Tests

**Library:** rapid-check

Property-based tests generate random inputs to find edge cases and invariant violations. Use these for data transformation functions, parsers, and validation logic where exhaustive testing is impractical.

## OpenRouter Tests

The OpenRouter integration is tested via a standalone Python script:

```bash
./scripts/openrouter-test.py
```

This requires a valid OpenRouter API key configured in your environment.

## CI Testing Pipeline

Every push triggers the following pipeline in order:

1. **Lint** — Biome formatting and lint checks
2. **Typecheck** — TypeScript type checking
3. **Test** — Vitest unit and integration tests
4. **Build** — Full project build

All stages must pass before a PR can be merged.
