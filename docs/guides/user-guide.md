# EyeGents Aider User Guide

## Quick Start

This document is for end users of the **eyeGents Aider** coding agent (primary AI assistant for eyegents projects). It covers the essentials for using Aider right away.

### 1. One-Button Get Started

Copy-paste this into your terminal **from the eyegents repo root**:

```bash
# If you've never set up eyegents before:
OPENROUTER_API_KEY=$(grep ^OPENROUTER_API_KEY .secrets | cut -d= -f2) aider
```

Or, after running the setup once (one-time only):

```bash
# Run setup script (adds "eyegents" to your shell)
bash scripts/setup-alias.sh

# Then in any directory:
# (restarts your shell or run "source ~/.bashrc")
eyegents
```

> **Note:** The `.secrets` file must exist with your OpenRouter key.

### 2. Prerequisites

- **Node.js 20+**: Required for eyegents packages
- **Python 3.12+**: Required for Aider (Python tool)
- **OpenRouter API Key**: Sign up at <https://openrouter.ai>, copy key to `.secrets`:
  ```
  OPENROUTER_API_KEY=sk-or-v1-your-key-here
  ```
- **Ollama (optional)**: Required for full Docker mode

### 3. Configuration Files

These config files are read by Aider on startup:

1. **`.aider.conf.yml`** – Aider project config (model, weak model, context files, git behavior)
2. **`CONVENTIONS.md`** – Your project's coding conventions
3. **`CLAUDE.md`** – Custom instructions for the coding assistant
4. **`.aiderignore`** – Patterns to exclude (like `.gitignore`)
5. **`.aider.model.settings.yml`** – Model behavior overrides (temperature, max tokens, headers)
6. **`.aider.model.metadata.json`** – Model metadata for cost tracking

### 4. Daily Workflows

#### A. Interactive Session

```bash
# Start in the project directory (eyegents root, or subdirectory)
OPENROUTER_API_KEY=$(grep ^OPENROUTER_API_KEY .secrets | cut -d= -f2) aider

# Then type your coding tasks:
# "Add input validation to the login form"
# "Fix the type error in packages/db/src/queries.ts"
# "Refactor the authentication logic for security"
```

#### B. One-Shot Edits (Quick Actions)

Use command-line arguments to edit files automatically:

```bash
# Add a JSDoc comment to a file
OPENROUTER_API_KEY=$(grep ^OPENROUTER_API_KEY .secrets | cut -d= -f2) aider \
  --message "Add a JSDoc comment to this function explaining its purpose" \
  packages/aider-adapter/src/adapter.ts

# Use a different model if you hit rate limits
OPENROUTER_API_KEY=$(grep ^OPENROUTER_API_KEY .secrets | cut -d= -f2) aider \
  --model openrouter/deepseek/deepseek-v4-flash:free \
  --message "Add error handling to the API service" \
  src/service.ts
```

#### C. Different Model Selections

- **Primary** (Qwen3 Coder): Default coding model, free, 1M context
- **Long-context fallback** (DeepSeek V4 Flash): Free, same 1M context
- **General router** (OpenRouter free): Routes to cheapest available free model

```bash
# Force Qwen3 Coder (default)
OPENROUTER_API_KEY=$(grep ^OPENROUTER_API_KEY .secrets | cut -d= -f2) aider \
  --model openrouter/qwen/qwen3-coder:free

# Force DeepSeek V4 Flash (long-context fallback)
OPENROUTER_API_KEY=$(grep ^OPENROUTER_API_KEY .secrets | cut -d= -f2) aider \
  --model openrouter/deepseek/deepseek-v4-flash:free
```

#### D. Docker Services (Full Environment)

If you want the full eyegents environment with Ollama + Qdrant + MCP server:

```bash
# Launch full stack
./scripts/bootstrap.sh --full   # Run once to start services

# Then from any directory:
OPENROUTER_API_KEY=$(grep ^OPENROUTER_API_KEY .secrets | cut -d= -f2) aider
```

> **Full mode**: Uses Docker + OpenCode + Aider (Aider is the fallback). Great for development with all services.

### 5. Managing Changes

#### Auto-Commits Status

By default, Aider runs with **no-auto-commits** — it won't modify files directly. You'll need to:

1. See the changes it proposes:
   ```bash
   All proposed changes will appear after you finish your task (Aider will show a summary of what it would do)
   ```

2. If you like the changes, Aider will output a Git diff. Copy the diff and apply it:
   ```bash
   # Or Aider can auto-commit with --yes
docker exec mcp-server aider --yes --message "Your task"
   ```

#### Safe Modes

- `--no-auto-commits` (default): Never auto-commits changes
- `--no-dirty-commits`: Never create dirty commits (always clean)
- `--yes`: Non-interactive (accepts all proposed changes)

### 6. Troubleshooting

#### "Rate Limit Exceeded"

```bash
# Use the long-context fallback model
OPENROUTER_API_KEY=$(grep ^OPENROUTER_API_KEY .secrets | cut -d= -f2) aider \
  --model openrouter/deepseek/deepseek-v4-flash:free \
  --message "Your task"
```

#### "Aider not found" or "Python not found"

```bash
# Install Aider (system-wide or project venv)
pip install aider-chat && aider --version
# Or in a project venv:
python3 -m venv .venvs/aider && source .venvs/aider/bin/activate && pip install aider-chat
```

#### "Missing .secrets file"

```bash
# Create .secrets file with your OpenRouter key
# Import this into your preferred text editor and save:
OPENROUTER_API_KEY=sk-or-v1-your-key-here
# Remove any spaces before "OPENROUTER_API_KEY"
```

#### Docker Required for Full Mode

```bash
# Install Docker
# For Mac: brew install docker
# For Linux: sudo apt-get install docker.io
# For Windows: download from docker.com
```

### 7. CLI Cheat Sheet

| Task | Command | Description |
|------|---------|-------------|
| Start coding | `OPENROUTER_API_KEY=$(grep ^OPENROUTER_API_KEY .secrets | cut -d= -f2) aider` | Interactive coding session |
| Quick edit | `OPENROUTER_API_KEY=$(grep ^OPENROUTER_API_KEY .secrets | cut -d= -f2) aider --yes --message "task" file.ts` | Edit file automatically |
| Use specific model | `OPENROUTER_API_KEY=$(grep ^OPENROUTER_API_KEY .secrets | cut -d= -f2) aider --model openrouter/qwen/qwen3-coder:free` | Force specific coding model |
| Interactive in project | `cd packages/aider-adapter && OPENROUTER_API_KEY=$(grep ^OPENROUTER_API_KEY ../.secrets | cut -d= -f2) aider` | Start in specific subdirectory |
| Quick bootstrap | `./scripts/bootstrap.sh --quick` | Just check prerequisites |
| Full setup | `./scripts/bootstrap.sh --full` | Docker + build + all services |

### 8. Key Configuration Files Reference

| File | Purpose |
|------|---------|
| `.aider.conf.yml` | Aider project-wide configuration |
| `CONVENTIONS.md` | Project coding conventions |
| `CLAUDE.md` | Custom instructions for Aider |
| `.aiderignore` | Patterns to ignore (like .gitignore) |
| `.aider.model.settings.yml` | Model-specific behavior (temperature, max tokens) |
| `.aider.model.metadata.json` | Model metadata (costs, token limits) |

### 9. Further Reading

For developers who want to integrate with eyegents' multi-agent architecture, see:
- `docs/decisions/2026-07-10-aider-as-primary-runtime.md` (ADR)
- `docs/development/dev-guide.md` (contributor guide)
- `docs/architecture/architect-guide.md` (technical architecture)

---
*Created as part of eyegents Aider integration (PABLO project)
Copyright (c) 2026*