# Pull Request: Integrate Magenta Workflow Engine

## Summary
This PR reconciles the `feature/workflow-engine` branch with `main`, adding support for the **Magenta** agentic AI workflow engine for SOAR delivery. It includes:

- New `magenta` agent route in `config/openrouter-routes.json`
- Magenta‑related documentation in `README.md`
- A `Makefile` target and shell script for installing Playwright with Chromium dependencies
- Updated `.gitignore` to exclude `.magenta/` artifacts
- Support script `scripts/install-playwright.sh`

## Changes

### `config/openrouter-routes.json`
- Added agent route `magenta` with primary model `qwen-coder` (free) and fallback `deepseek-flash-free` (free)

### `README.md`
- Added **Workflow Engine (Magenta Integration)** section under `## Development`

### `Makefile`
- Added `playwright-install` target that executes `scripts/install-playwright.sh`

### `scripts/install-playwright.sh` (new)
- Installs Playwright with Chromium and required system dependencies
- Retries once if initial installation fails

### `.gitignore`
- Added `.magenta/` to ignored paths

## Validation
- [ ] `npx biome lint --write` passes
- [ ] `npm test` passes
- [ ] Manual browsing of `README.md` renders correctly
- [ ] `make playwright-install` succeeds on supported OS

## Related Issues
- Required for Magenta workflow engine integration (https://github.com/browneyes-sec/magenta)
