# Changelog

## [Unreleased]

### Added
- Magenta workflow engine integration (`feature/workflow-engine` branch)
- New `magenta` agent route in OpenRouter configuration
- Make target `playwright-install` and install script for Playwright with Chromium dependencies
- `.magenta/` exclusion in `.gitignore`
- README section documenting the Magenta integration

### Changed
- Updated `Makefile` with `playwright-install` target
- Extended `config/openrouter-routes.json` with `magenta` agent routes
- Enhanced `scripts/install-playwright.sh` with retry logic and system dependency handling
