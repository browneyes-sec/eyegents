# Contributing Guide

Thank you for contributing to eyegents. This document covers the conventions and workflow for contributing.

## Branch Strategy

| Branch       | Purpose                     | Deploys to  |
|--------------|-----------------------------|-------------|
| `main`       | Production-ready code       | Production  |
| `develop`    | Integration / staging       | Staging     |
| `feature/*`  | New features and fixes      | —           |

Feature branches are created from `develop` and merged back via pull request.

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

**Allowed types:**

- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — maintenance tasks (deps, CI, tooling)
- `docs:` — documentation changes
- `refactor:` — code restructuring without behavior change
- `test:` — adding or updating tests

**Examples:**

```
feat(mcp): add tool invocation caching
fix(indexer): handle empty document chunks
chore(deps): update vitest to v3
```

## Pull Request Process

1. Create a feature branch from `develop`
2. Make your changes with clear, atomic commits
3. Push and open a PR targeting `develop`
4. Ensure **CI passes** (lint, typecheck, test, build)
5. Request review from a **certifier**
6. Address feedback and get approval before merging

## Code Review Checklist

Reviews focus on:

- **Security** — no secrets, no unsafe input handling, proper sanitization
- **Performance** — no unnecessary allocations, efficient algorithms
- **Style** — consistent with project conventions, idiomatic TypeScript
- **Tests** — adequate coverage for new/changed logic

## Testing

Run tests locally before pushing:

```bash
npm test
```

See [Testing](./testing.md) for details on the testing strategy.

## Linting

The project uses **Biome** for formatting and linting:

```bash
npm run lint        # check for issues
npm run lint:fix    # auto-fix issues
```

Always run lint before committing.
