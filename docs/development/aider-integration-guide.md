# Aider-First Integration

## Overview

This document provides comprehensive guidance for implementing and working with Aider as the primary AI coding agent in eyegents, following the established Aider-first integration from the AIder_Feature branch.

## Quick Start

```bash
# View available entry points
ls -la bin/

# One-command Aider start (auto-detects mode)
./bin/eyegents --task "implement feature"

# System diagnosis (recommended first)
./scripts/eyegents-doctor.sh

# Quick setup (one-time)
./scripts/setup-aider.sh
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ OpenCode (Orchestration)                              │
├─────────────────────────────────────────────────────────┤
│ Aider (Coding Engine) ←─────────────────────────────────┤
├─────────────────────────────────────────────────────────┤
│ eyegents MCP Server  ←───────────────────────────────────┤
├─────────────────────────────────────────────────────────┤
│ Qdrant Vector Memory  ←─────────────────────────────────┤
├─────────────────────────────────────────────────────────┤
│ Ollama (Local Models)  ←─────────────────────────────────┤
├─────────────────────────────────────────────────────────┤
│ OpenRouter (Remote Models)  ←─────────────────────────────┤
└─────────────────────────────────────────────────────────┘
```

## Entry Points

### Primary CLI

| Command | Mode | Use Case | Description |
|---------|------|----------|-------------|
| `./bin/eyegents` | Auto | Coding tasks | Smart mode detection |
| `./bin/eyegents-thin` | Thin | Resource-constrained | Remote models only |
| `./bin/eyegents-full` | Full | Development | Full service stack |

### Script-Based Workflow

| Script | Purpose | Typical Usage |
|--------|---------|---------------|
| `eyegents-doctor.sh` | Environment diagnosis | `scripts/eyegents-doctor.sh` |
| `start-aider.sh` | Aider startup helper | `scripts/start-aider.sh` |
| `run-aider-task.sh` | Common task wrapper | `scripts/run-aider-task.sh "task" [files...]` |
| `status.sh` | System status | `scripts/status.sh` |
| `health-check.sh` | Service health | `scripts/health-check.sh [quick|full]` |
| `setup-aider.sh` | Initial setup | `scripts/setup-aider.sh` |

## Mode Detection

### Automatic Mode Selection

The system automatically detects optimal mode based on:

```bash
# Memory (Linux/macOS)
if [ -f "/proc/meminfo" ]; then
  MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
  MEM_GB=$((MEM_KB / 1024 / 1024))
fi

# Docker availability
docker --version >/dev/null 2>&1 && has_docker=true
```

### Mode Decision Logic

1. **Full Mode** (Docker + 8GB+ RAM): `full`
2. **Thin Mode** (No Docker or <8GB RAM): `thin`
3. **Default**: `thin` (safer, resource-efficient)

### Environment Variables

```bash
export EYEGENTS_MODE=full|thin     # Force specific mode
export EYEGENTS_LOCAL_ENABLED=true  # Use local Ollama/Qdrant
export EYEGENTS_REMOTE_ENABLED=true # Use OpenRouter
export EYEGENTS_COST_TIER=free|paid # Cost preference
export EYEGENTS_AGENT_SHELL=aider|opencode # Primary shell
```

## Configuration Files

### .aider.conf.yml

```yaml
# Aider configuration for eyegents
model: openrouter/nvidia/nemotron-3-super-120b-a12b:free
weak-model: openrouter/nvidia/nemotron-3-nano-30b-a3b:free

read:
  - CONVENTIONS.md
  - CLAUDE.md
  - docs/development/aider-first-integration.md

auto-commits: true
dirty-commits: false
map-tokens: 4096
```

### OpenRouter Configuration

```json
// config/openrouter-routes.json
{
  "agentRoutes": {
    "aider": {
      "model": "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
      "costPriority": true
    }
  }
}
```

### OpenRouter Models Available

```bash
# Free tier models (used by default)
openrouter/nvidia/nemotron-3-super-120b-a12b:free
openrouter/nvidia/nemotron-3-nano-30b-a3b:free

# Paid tier models (for complex tasks)
openrouter/nvidia/nemotron-3-ultra-550b-a55b
deepseek/deepseek-v4-flash
deepseek/deepseek-v4-pro
```

## Model Configuration

### Local Models (Ollama)

```bash
# Primary coding model (used by Aider)
qwen2.5-coder:7b
# Requirement: ~7-8GB VRAM/RAM

# Small model for lightweight tasks
qwen2.5:0.5b
# Requirement: ~1GB VRAM/RAM

# Embedding model for vector memory
bge-m3:latest
# Requirement: ~500MB VRAM/RAM
```

### Remote Models (OpenRouter)

| Model | Tier | Cost | Use Case |
|-------|------|------|----------|
| Nemotron Super (free) | Free | $0 | Default coding tasks |
| Nemotron Nano (free) | Free | $0 | Lightweight tasks |
| DeepSeek Flash | Paid | $0.112M/token | Fast coding |
| DeepSeek Pro | Paid | $0.435M/token | Complex reasoning |

## Workflow Examples

### Example 1: Thin Mode Usage

```bash
# Developer workstation without Docker
./bin/eyegents-thin --task "implement authentication middleware"

# With specific files
./bin/eyegents-thin --task "refactor auth module" packages/auth/
```

### Example 2: Full Mode Usage

```bash
# Team development with Docker
./bin/eyegents-full --task "implement user authentication"

# As part of multi-agent workflow
./bin/eyegents-full
```

### Example 3: Script-Based Workflow

```bash
# Complete workflow for feature development
scripts/eyegents-doctor.sh  # 1. Diagnose environment
scripts/setup-aider.sh      # 2. Install Aider (one-time)
scripts/run-aider-task.sh "implement feature X" src/  # 3. Execute task
```

### Example 4: Reusable Task Script

```bash
# scripts/run-aider-task.sh template
scripts/run-aider-task.sh "add unit tests for auth module" packages/auth/
```

## Developer Experience

### First-Time Setup

```bash
# 1. Check environment compatibility
scripts/eyegents-doctor.sh

# 2. Install Aider (one-time)
scripts/setup-aider.sh

# 3. Start development
./bin/eyegents-thin
```

### Daily Workflow

```bash
# Morning: Check system health
./scripts/health-check.sh quick

# During work: Use Aider for coding
./bin/eyegents-thin --task "implement dashboard component" src/dashboard/

# Midday: Status check
./scripts/status.sh

# Evening: Cleanup
./scripts/stop-services.sh
```

### Configuration Examples

#### Thin Mode Configuration

```bash
export EYEGENTS_MODE=thin
export EYEGENTS_LOCAL_ENABLED=false
export EYEGENTS_REMOTE_ENABLED=true
export EYEGENTS_COST_TIER=free
export EYEGENTS_AGENT_SHELL=aider
```

#### Full Mode Configuration

```bash
export EYEGENTS_MODE=full
export EYEGENTS_LOCAL_ENABLED=true
export EYEGENTS_REMOTE_ENABLED=true
export EYEGENTS_COST_TIER=mixed
export EYEGENTS_AGENT_SHELL=opencode
```

## Tools Reference

### Essential Tools

| Tool | Purpose | Command |
|------|---------|---------|
| eyegents-doctor.sh | Environment assessment | `scripts/eyegents-doctor.sh` |
| start-aider.sh | Aider startup | `scripts/start-aider.sh` |
| run-aider-task.sh | Task wrapper | `scripts/run-aider-task.sh "task" [files...]` |

### Maintenance Tools

| Tool | Purpose | Command |
|------|---------|---------|
| status.sh | System status | `scripts/status.sh` |
| health-check.sh | Service health | `scripts/health-check.sh [quick|full]` |
| stop-services.sh | Cleanup | `scripts/stop-services.sh` |
| setup-aider.sh | Aider setup | `scripts/setup-aider.sh` |
| manage-models.sh | Model management | `scripts/manage-models.sh [command]` |

## Troubleshooting

### Common Issues and Solutions

#### Issue: Aider not installed

```bash
# Install Aider
scripts/setup-aider.sh
./bin/eyegents-thin --task "test installation"
```

#### Issue: Docker services unavailable

```bash
# Check system resources
./scripts/status.sh

# Use thin mode if no Docker
scripts/eyegents-doctor.sh
export EYEGENTS_MODE=thin
./bin/eyegents-thin --task "work"
```

#### Issue: OpenRouter not accessible

```bash
# Test connectivity
scripts/manage-models.sh test

# Check API key
if [ -f ".secrets" ]; then
  source .secrets
  echo "OPENROUTER_API_KEY: ${OPENROUTER_API_KEY:-missing}"
fi
```

### Help Commands

```bash
# Script usage
./scripts/run-aider-task.sh --help
./scripts/start-aider.sh --help

# Environment diagnosis
scripts/eyegents-doctor.sh

# Model information
scripts/manage-models.sh list
```

## Integration with Existing Workflows

### Git Commit Hooks

Integration with eyegents Git conventions:

```bash
# Aider will respect Conventional Commits
# auto-commits: true in .aider.conf.yml
# Conventional Commits: feat:, fix:, refactor:, etc.
```

### Linting and Testing

```bash
# Biome linting (automatic after Aider edits)
npx biome lint --write

# Vitest for unit tests
npm test

# Playwright for e2e tests
npm run test:e2e
```

### Version Control

```bash
# Aider commits are auto-attributed
# attribute-author: true
attribute-committer: true

# Respect eyegentsignore
.aiderignore
```

## Migration Guide

### From Previous eyegents Versions

#### Upgrading to Aider-First

```bash
# 1. Switch to AIder_Feature branch
git checkout AIder_Feature

# 2. Run environment check
scripts/eyegents-doctor.sh

# 3. Setup Aider (if not present)
./scripts/setup-aider.sh

# 4. Use new entry points
./bin/eyegents  # Recommended (auto-detects)
# OR
./bin/eyegents-thin  # For consistent behavior
```

### Configuration Migration

#### Environment Variables

```bash
# OLD way (project-specific)
export OPENROUTER_API_KEY="..."

# NEW way (mode-aware)
export EYEGENTS_MODE=full
export EYEGENTS_REMOTE_ENABLED=true
export EYEGENTS_COST_TIER=free
```

#### CLI Usage

```bash
# OLD: Direct Aider invocation
./venvs/aider/bin/aider --task "..."

# NEW: Mode-aware entrypoint
./bin/eyegents --task "..."
```

## Best Practices

### 1. Mode Selection

```bash
# Start with thin mode for efficiency
scripts/eyegents-doctor.sh
./bin/eyegents-thin --task "feature implementation"

# Use full mode for complex projects
./bin/eyegents-full --task "database schema design"
```

### 2. Cost Management

```bash
# For routine tasks, thin mode uses free models
# For complex reasoning, full mode can use paid models when needed
```

### 3. Resource Management

```bash
# Monitor system resources regularly
./scripts/status.sh
./scripts/health-check.sh quick

# Clean up unused services
./scripts/stop-services.sh
```

### 4. Configuration Management

```bash
# Keep mode preference consistent
export EYEGENTS_MODE=full  # For development
# OR
export EYEGENTS_MODE=thin  # For production

# Adjust based on project needs
```

## Advanced Features

### Custom Configuration

```bash
# Override defaults
export EYEGENTS_MODE=full
export EYEGENTS_COST_TIER=paid
export EYEGENTS_MODEL=deepseek/deepseek-v4-pro

# Test custom configuration
scripts/eyegents-doctor.sh
./bin/eyegents-thin
```

### Multi-Workspace Support

```bash
# Use different modes for different projects
export EYEGENTS_MODE=thin  # For web projects (smaller)
./bin/eyegents-thin --task "implement UI component" packages/ui/

export EYEGENTS_MODE=full  # For data projects (bigger)
./bin/eyegents-full --task "build data pipeline" packages/data/
```

## See Also

- [Aider-First Architecture Guide](AIDER_FIRST.md) - Complete workflow documentation
- [CLAUDE.md](CLAUDE.md) - Project context
- [CONVENTIONS.md](CONVENTIONS.md) - Development conventions
- [docs/development/getting-started.md](docs/development/getting-started.md) - General development
- [docs/agent-ops/agent-lifecycle.md](docs/agent-ops/agent-lifecycle.md) - Agent lifecycle
- [docs/agent-ops/context-engineering.md](docs/agent-ops/context-engineering.md) - Context assembly

## References

1. **Aider Documentation**: https://aider.chat/
2. **OpenRouter Models**: https://openrouter.ai/models
3. **Ollama**: https://ollama.ai/
4. **Qdrant**: https://qdrant.io/
5. **MCP Protocol**: https://modelcontextprotocol.io/

## Version Information

- **Mode System**: v1.0 (Added in AIder_Feature)
- **Aider Integration**: v1.0 (Added in AIder_Feature)
- **Compatible with**: eyegents 2.0+
- **Last Updated**: Current AIder_Feature branch

---

**Note**: This documentation is part of the ongoing Aider-first integration work. For more recent updates, refer to the AIder_Feature branch documentation.