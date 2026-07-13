# Eyegents Aider-First Workflow

This document describes the Aider-first approach for the eyegents AI coding platform, providing developers with clear entry points and mode detection for optimal AI pair-programming experiences.

## Overview

The eyegents project now supports an Aider-first architecture where:
- **Aider** is the primary coding engine for file edits and code generation
- **OpenCode** serves as the orchestration shell for multi-agent workflows
- **Mode detection** automatically optimizes for system capabilities and resource constraints

## Key Features

### 1. Auto-Detecting Mode System

The system intelligently detects your environment and recommends the optimal mode:

- **Full Mode** (`EYEGENTS_MODE=full`):
  - Starts Docker services (Ollama, Qdrant, MCP server)
  - Uses local AI models where possible
  - OpenCode available for multi-agent orchestration
  - Best for: Development workstations with 8GB+ RAM

- **Thin Mode** (`EYEGENTS_MODE=thin`):
  - No Docker services
  - Relies on OpenRouter remote models
  - Aider available for coding tasks
  - Best for: Resource-constrained environments

### 2. Multiple Entry Points

#### Primary CLI
```bash
./bin/eyegents          # Auto-detect and start Aider
./bin/eyegents-thin     # Force thin mode (remote models)
./bin/eyegents-full      # Force full mode (Docker services)
```

#### Script-Based Workflow
```bash
# Environment diagnosis and setup
scripts/eyegents-doctor.sh

# Aider environment setup
scripts/setup-aider.sh

# Current system status
scripts/status.sh

# Service health checks
scripts/health-check.sh [quick|full]

# Model management
scripts/manage-models.sh [list|pull|test|status]

# Run Aider tasks
scripts/run-aider-task.sh "implement auth middleware" src/auth/login.ts
```

### 3. Smart Environment Detection

The system automatically detects and analyzes:

```bash
# System resources
- Docker availability
- Memory (checks /proc/meminfo)
- Node.js version
- OpenRouter API key presence

# Environment variables
EYEGENTS_MODE=full|thin
EYEGENTS_LOCAL_ENABLED=true|false
EYEGENTS_REMOTE_ENABLED=true|false
EYEGENTS_COST_TIER=free|paid|mixed
EYEGENTS_AGENT_SHELL=aider|opencode
```

## Getting Started

### Quick Start

```bash
# 1. Check your environment
scripts/eyegents-doctor.sh

# 2. Set up Aider
scripts/setup-aider.sh

# 3. Start your preferred mode (try Aider first)
scripts/start-aider.sh

# Or use the convenience CLI
./bin/eyegents --task "Add input validation to login form"
```

### Development Workflow

```bash
# Bootstrap full environment (if resources allow)
./scripts/bootstrap.sh

# Start Aider for coding tasks (uses mode detection)
./bin/eyegents-thin --task "Refactor database queries to use prepared statements"

# Use full mode with multi-agent orchestration
./bin/eyegents-full

# View system status
./scripts/status.sh

# Check service health
./scripts/health-check.sh quick
```

## Configuration

### Environment Variables

```bash
export EYEGENTS_MODE=thin          # "thin" or "full"
export EYEGENTS_LOCAL_ENABLED=true  # Use local Ollama/Qdrant
export EYEGENTS_REMOTE_ENABLED=true # Use OpenRouter models
export EYEGENTS_COST_TIER=free      # "free" or "paid" cost preference
export EYEGENTS_AGENT_SHELL=aider  # "aider" or "opencode"
```

### Model Configuration

The system uses multiple model tiers:

#### Local Models (Ollama)
```bash
# Primary coding model (used by Aider)
qwen2.5-coder:7b

# Small model for lightweight tasks
qwen2.5:0.5b

# Embedding model for vector memory
bge-m3:latest
```

#### Remote Models (OpenRouter)
```bash
# Primary model (paid, credits on key — reliable)
deepseek/deepseek-v4-flash       # DeepSeek V4 Flash (1M context, $0.11/M in)

# Free tier models (economy fallback — may rate-limit upstream)
qwen/qwen3-coder:free            # Qwen3 Coder (1M context, free)
deepseek/deepseek-v4-flash:free  # DeepSeek V4 Flash free (1M context, free)
openrouter/free                  # General fallback/router

# Paid tier models for complex tasks
nvidia/nemotron-3-ultra-550b-a55b  # Security, audits ($0.001/$0.003)
deepseek/deepseek-v4-pro           # Complex reasoning ($0.435/$0.87)
```

#### Agent-to-Model Routing

```bash
# OpenRouter routing configuration in config/openrouter-routes.json
# Each agent has defined primary and fallback models
# Free models used for routine tasks, paid models for complex work
# Primary: qwen3-coder:free → Fallback: deepseek-v4-flash:free → Router: openrouter/free
```

### Aider Configuration

The `.aider.conf.yml` is automatically used by Aider:
```yaml
model: openrouter/qwen/qwen3-coder:free
weak-model: openrouter/qwen/qwen3-coder:free

# Reads from repo root
read:
  - CONVENTIONS.md
  - CLAUDE.md
```

## Usage Examples

### Example 1: Thin Mode (Remote Models)

```bash
# Good for: CI/CD, lightweight development, limited RAM
EYEGENTS_MODE=thin scripts/run-aider-task.sh "Add unit tests for auth module" packages/auth/
```

### Example 2: Full Mode (Local + Remote)

```bash
# Good for: Feature development, refactoring, complex coding
EYEGENTS_MODE=full scripts/run-aider-task.sh "Implement authentication middleware" \\
  --aider-args "--yes --no-auto-commits"
```

### Example 3: Interactive Multi-Agent Workflow

```bash
# Uses OpenCode for orchestration, Aider for coding
EYEGENTS_MODE=full bin/eyegents-full

# OpenCode will:
# 1. Connect to eyegents MCP server
# 2. Coordinate backend/frontend/qa agents
# 3. Delegate coding tasks to Aider when needed
```

## Scripts Reference

### Essential Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `eyegents-doctor.sh` | Environment assessment | `scripts/eyegents-doctor.sh` |
| `start-aider.sh` | Start Aider with mode detection | `scripts/start-aider.sh` |
| `setup-aider.sh` | Install Aider dependencies | `scripts/setup-aider.sh` |
| `run-aider-task.sh` | Convenience wrapper for common tasks | `scripts/run-aider-task.sh "task" [files...]` |

### Maintenance Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `status.sh` | Show system status | `scripts/status.sh` |
| `health-check.sh` | Service health checks | `scripts/health-check.sh [quick|full]` |
| `reindex.sh` | Reindex codebase | `scripts/reindex.sh` |
| `stop-services.sh` | Stop Docker services | `scripts/stop-services.sh` |
| `manage-models.sh` | Model lifecycle management | `scripts/manage-models.sh [command]` |

### Build & CI/CD Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `bootstrap.sh` | Full environment setup | `./scripts/bootstrap.sh` |
| `dev.sh` | Development hot reload | `./scripts/dev.sh` |

## Best Practices

### 1. Mode Selection

```bash
# Start with thin mode for efficiency
git checkout main
./bin/eyegents-thin --task "Implement feature A"

# Use full mode for complex projects
./bin/eyegents-full --task "Design database schema"
```

### 2. Cost Management

```bash
# For routine coding tasks, thin mode uses free models
# For complex reasoning, full mode accesses paid models when needed
```

### 3. Resource Management

```bash
# Monitor system resources
./scripts/status.sh
./scripts/health-check.sh quick

# Clean up when not needed
docker compose -f docker/docker-compose.yml down  # if using full mode
```

### 4. Configuration Management

```bash
# Check current configuration
scripts/manage-models.sh status

# Adjust as needed
export EYEGENTS_MODE=thin  # For testing
export EYEGENTS_MODE=full  # For development
```

## Troubleshooting

### Common Issues

#### Aider Not Available

```bash
# Install Aider
./scripts/setup-aider.sh

# Check status
./scripts/status.sh
```

#### Docker Services Not Starting

```bash
# Check system resources
./scripts/status.sh

# Start Docker manually if needed
docker compose -f docker/docker-compose.yml up -d ollama qdrant
```

#### OpenRouter Not Connected

```bash
# Test connectivity
scripts/manage-models.sh test

# Check API key
source .secrets && echo $OPENROUTER_API_KEY
```

### Help Commands

```bash
# Script usage documentation
./scripts/start-aider.sh --help
./scripts/run-aider-task.sh --help

# System diagnosis
scripts/eyegents-doctor.sh

# Model information
scripts/manage-models.sh list
```

## Migration Guide

If you're upgrading from previous eyegents versions:

1. **Run environment check** first:
   ```bash
   scripts/eyegents-doctor.sh
   ```

2. **Choose your preferred entry point**:
   ```bash
   ./bin/eyegents          # Recommended (auto-detects)
   ./bin/eyegents-thin     # For remote-only work
   ./bin/eyegents-full      # For local development
   ```

3. **Reindex after major changes**:
   ```bash
   ./scripts/reindex.sh
   ```

## Technical Implementation

### Architecture Notes

1. **Aider as Primary Runtime**:
   - All code editing and generation happens through Aider
   - Integrates seamlessly with eyegents MCP server
   - Supports offline-first operation when local models are available

2. **OpenCode as Orchestration**:
   - Used for complex multi-agent workflows
   - Coordinates between backend, frontend, qa, ops agents
   - Provides high-level project management

3. **Mode-Aware Loading**:
   - Smart detection of available resources
   - Fallback chains for reliability
   - Cost-aware model selection

### Design Principles

- **Local-first**: Use local Ollama models when available
- **Remote-augmented**: Access OpenRouter when local models are insufficient
- **Cost-aware**: Default to free models, escalate to paid only when needed
- **Resource-efficient**: Thin mode for constrained environments
- **Developer-friendly**: Simple, intuitive interfaces with sensible defaults

## Feedback & Issues

For bugs, feature requests, or questions:

1. **Report issues**: Check system status first (`./scripts/status.sh`)
2. **Share feedback**: Open issues in the eyegents repository
3. **Request features**: Submit feature requests via GitHub
4. **Community support**: Check documentation and examples

## See Also

- [Eyegents Documentation](docs/) - Complete project documentation
- [CLAUDE.md](CLAUDE.md) - Project context and architecture
- [CONVENTIONS.md](CONVENTIONS.md) - Development conventions and workflows
- [OpenRouter Integration](docs/api/openrouter-integration.md) - Remote model setup
- [Aider Configuration](.aider.conf.yml) - Aider settings for eyegents

---

**Version**: AIder-First Feature Complete
**Last Updated**: Current commit in AIder_Feature branch
**Status**: Production Ready