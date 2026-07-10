# Aider-First Integration

This document details the formal integration of Aider as the primary AI coding agent in eyegents, following the engineering assessment roadmap.

## Integration Status ✅ COMPLETED

Aider has been implemented as the primary coding runtime across all operational modes:

- **Thin Mode**: Aider is the primary agent shell for all coding tasks
- **Full Mode**: Aider serves as the coding engine, with OpenCode handling orchestration
- **Mixed Workflows**: Seamless integration between Aider and existing eyegents agents

## Architecture Layer

### Agent Stack Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ OpenCode (Orchestration)                                │
├─────────────────────────────────────────────────────────┤
│ Aider (Coding Engine)  ←─────────────────────────────────┤
├─────────────────────────────────────────────────────────┤
│ eyegents MCP Server  ←───────────────────────────────────┤
├─────────────────────────────────────────────────────────┤
│ Ollama (Local Models)  ←─────────────────────────────────┤
├─────────────────────────────────────────────────────────┤
│ OpenRouter (Remote Models)  ←─────────────────────────────┤
├─────────────────────────────────────────────────────────┤
│ Vector Memory (Qdrant)  ←────────────────────────────────│
└─────────────────────────────────────────────────────────┘
```

### Agent Roles and Responsibilities

| Agent | Runtime | Primary Responsibilities | Mode Support |
|-------|---------|-------------------------|--------------|
| **Aider** | Coding Engine | File edits, code generation, refactoring | Thin + Full |
| **OpenCode** | Orchestration | Multi-agent coordination, project management | Full Only |
| **Backend/Frontend/QA/Ops** | eyegents Runtime | Specialized tasks, API development, testing, infrastructure | Both |

## Entry Points and CLI Interface

### Primary CLI Access

#### One-Command Aider Start
```bash
# Auto-detects optimal mode based on system resources
./bin/eyegents [aider-args...]

# Explicit thin mode (recommended for most coding)
./bin/eyegents-thin [aider-args...]

# Full mode with Docker services
./bin/eyegents-full [opencode-args...]
```

#### Script-Based Workflow
```bash
# Environment diagnosis and setup
./scripts/eyegents-doctor.sh

# Quick Aider setup
./scripts/setup-aider.sh

# System status and health
./scripts/status.sh
./scripts/health-check.sh [quick|full]

# Common task execution
./scripts/run-aider-task.sh "task description" [files...]
```

### CLI Argument Preservation

All Aider CLI arguments are preserved:
```bash
./bin/eyegents-thin --task "Implement auth middleware" \\
  --model openrouter/nvidia/nemotron-3-super-120b-a12b:free \\
  --read-only packages/auth/
```

## Configuration Management

### Environment Variables

```bash
EYEGENTS_MODE=full|thin           # System mode selection
EYEGENTS_LOCAL_ENABLED=true|false  # Local service (Ollama/Qdrant)
EYEGENTS_REMOTE_ENABLED=true|false # OpenRouter model access
EYEGENTS_COST_TIER=free|paid      # Cost preference
EYEGENTS_AGENT_SHELL=aider|opencode # Primary shell selection
```

### Model Configuration

#### Aider Model Settings

```yaml
# .aider.conf.yml
model: openrouter/nvidia/nemotron-3-super-120b-a12b:free
weak-model: openrouter/nvidia/nemotron-3-nano-30b-a3b:free

read:
  - CONVENTIONS.md
  - CLAUDE.md
  - AIDER_FIRST.md
```

#### OpenRouter Agent Routing

```json
// config/openrouter-routes.json
{
  "agentRoutes": {
    "backend": {
      "model": "deepseek/deepseek-v4-flash",
      "costPriority": true,
      "complexityThreshold": "medium"
    },
    "frontend": {
      "model": "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
      "costPriority": false,
      "complexityThreshold": "low"
    },
    "aider": {
      "model": "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
      "costPriority": true,
      "complexityThreshold": "any"
    }
  }
}
```

#### Local Model Configuration

```bash
# Ollama model requirements
Ollama models (local):
  • qwen2.5-coder:7b (primary coding)
  • qwen2.5:0.5b (small tasks)
  • bge-m3:latest (embeddings)

# Resource requirements
- qwen2.5-coder:7b: ~7-8GB VRAM/RAM
- qwen2.5:0.5b: ~1GB VRAM/RAM
```

## Mode-Specific Behaviors

### Thin Mode Configuration

```bash
# System detection for thin mode
export EYEGENTS_MODE=thin
export EYEGENTS_LOCAL_ENABLED=false
export EYEGENTS_REMOTE_ENABLED=true
export EYEGENTS_COST_TIER=free
export EYEGENTS_AGENT_SHELL=aider
```

**Behavioral Characteristics:**

- ❌ No Docker services (Ollama, Qdrant, MCP server)
- ✅ Relies on OpenRouter for all LLM inference
- ✅ Uses free-tier models by default
- ✅ Aider is the exclusive coding agent
- ✅ Efficient for resource-constrained environments
- ✅ Ideal for CI/CD, lightweight development, or remote work

### Full Mode Configuration

```bash
# System detection for full mode
export EYEGENTS_MODE=full
export EYEGENTS_LOCAL_ENABLED=true
export EYEGENTS_REMOTE_ENABLED=true
export EYEGENTS_COST_TIER=mixed
export EYEGENTS_AGENT_SHELL=opencode
```

**Behavioral Characteristics:**

- ✅ Starts Docker services (Ollama, Qdrant, MCP server)
- ✅ Prioritizes local models (qwen2.5-coder:7b)
- ✅ Falls back to OpenRouter when needed
- ✅ OpenCode can coordinate multi-agent workflows
- ✅ Best for complex projects, team collaboration
- ✅ Requires 8GB+ RAM for optimal performance

## Integration Points

### 1. MCP Server Integration

#### Vector Tools

```typescript
// mcp-server/src/tools/vector-tools.ts
export const vectorTools = [
  {
    name: "vector_search",
    description: "Search code chunks, decisions, conversations, skill patterns",
    // ...
  },
  // ... other tools
];
```

#### Aider Adapter

```typescript
// packages/aider-adapter/src/adapter.ts
export class AiderAdapter {
  // Bridges eyegents multi-agent framework with Aider CLI
  // Supports cross-platform agent execution and result processing
}
```

### 2. OpenRouter Integration

#### Cost Tracking

```typescript
// packages/openrouter-client/src/cost-tracker.ts
export class CostTracker {
  // Tracks per-model costs, session totals, per-agent breakdown
  // Integrates with Aider usage patterns
}
```

#### Model Routing

```typescript
// packages/openrouter-client/src/router.ts
export class AgentRouter {
  // Routes agents to optimal models based on role, complexity, cost
  // Supports fallback chains and cost-aware selection
}
```

### 3. Context Assembly

#### ContextAssembler Integration

```typescript
// packages/context-engine/src/context-assembler.ts
export class ContextAssembler {
  // Assembles context for Aider with token budget management
  // Supports local vs remote model optimization
}
```

## Workflow Examples

### Example 1: Thin Mode Implementation

```bash
# Developer workstation with limited resources
./scripts/eyegents-doctor.sh  # Verify thin mode recommendation
./bin/eyegents-thin --task "Add input validation to login form" packages/auth/
```

**Flow:** Developer → Aider CLI → OpenRouter API → Code Generation

### Example 2: Full Mode Implementation

```bash
# Team development environment with Docker
./bin/eyegents-full --task "Implement user authentication"
```

**Flow:** Developer → OpenCode Orchestrator → eyegents Agents → Context → Aider → Code Generation

### Example 3: Mixed Mode Workflow

```bash
# Project initialization with Aider
./scripts/run-aider-task.sh "Initialize project structure" --model openrouter/nvidia/nemotron-3-super-120b-a12b:free

# Then switch to full mode for team collaboration
./bin/eyegents-full
```

## Tools and Scripts

### Comprehensive Tool Suite

| Script | Purpose | Primary Use Case |
|--------|---------|------------------|
| `setup-aider.sh` | Initial Aider environment setup | First-time installation |
| `start-aider.sh` | Start Aider with mode detection | Daily coding sessions |
| `run-aider-task.sh` | Common task wrapper | Feature implementation |
| `status.sh` | System status and health | Monitoring and debugging |
| `health-check.sh` | Service health validation | Environment validation |
| `manage-models.sh` | Model lifecycle management | Model selection and testing |
| `stop-services.sh` | Cleanup and shutdown | End of development day |
| `reindex.sh` | Codebase reindexing | After major changes |

### Script Integration Examples

#### Quick Development Workflow

```bash
# Step 1: Ensure environment is ready
scripts/eyegents-doctor.sh

# Step 2: Setup Aider if not present
scripts/setup-aider.sh

# Step 3: Execute coding task
./scripts/run-aider-task.sh "Add unit tests to auth module" packages/auth/

# Step 4: Validate work
git diff
./scripts/health-check.sh quick
```

#### Team Development Workflow

```bash
# 1: Bootstrap the environment
./scripts/bootstrap.sh

# 2: Start Aider for coding
./bin/eyegents-thin --task "Implement feature X" src/

# 3: Use full mode for complex coordination
./bin/eyegents-full

# 4: Monitor system health
./scripts/status.sh
./scripts/health-check.sh full
```

## Developer Experience

### Onboarding Experience

```bash
# New developer setup (follow this order)
# 1. Check environment
scripts/eyegents-doctor.sh

# 2. Install Aider (one-time)
scripts/setup-aider.sh

# 3. Configure mode preference
export EYEGENTS_MODE=thin  # For laptops without Docker

# 4. Start working
./bin/eyegents-thin --task "Your first task"
```

### Productivity Features

1. **Zero-Configuration Default**: Mode detection happens automatically
2. **Smart Defaults**: Free-tier models by default, escalation to paid when needed
3. **Resource Awareness**: Different behavior based on system capabilities
4. **Consistency**: Same interface across different development environments
5. **Fallback Safety**: Seamless transitions between local and remote models

## Testing and Validation

### Unit Tests

```bash
# Test local setup
./scripts/start-aider.sh --dry-run --task "Test validation"

# Check system health
./scripts/health-check.sh quick

# Validate Aider installation
./scripts/manage-models.sh test
```

### Integration Tests

```bash
# Complete workflow simulation
./scripts/run-aider-task.sh "Implement login functionality" \\
  packages/auth/ --dry-run

# Multi-agent coordination (requires OpenCode)
./bin/eyegents-full --help
```

### Environment Validation

```bash
# Comprehensive status check
./scripts/status.sh

# Health validation
./scripts/health-check.sh full

# Model availability test
./scripts/manage-models.sh list
```

## Migration Guide

### From Previous eyegents Versions

#### Upgrade Steps

1. **Update to latest Aider_Feature branch**:
   ```bash
   git checkout AIder_Feature
   ./scripts/bootstrap.sh
   ```

2. **Verify environment**:
   ```bash
   scripts/eyegents-doctor.sh
   ```

3. **Install Aider** (if not present):
   ```bash
   scripts/setup-aider.sh
   ```

4. **Start using the new entry points**:
   ```bash
   ./bin/eyegents  # Recommended (auto-detects mode)
   # OR
   ./bin/eyegents-thin  # For consistent remote-only behavior
   ```

#### Migration Decision Tree

```
┌─────────────────────────────┐
│ Do you have Docker?         │
└─────────────┬───────────────┘
              │ Yes
┌─────────────▼───────────────┐
│ Do you have 8GB+ RAM?       │
└─────────────┬───────────────┘
              │ Yes
┌─────────────▼───────────────┐
│ First use: ./bin/eyegents-full │
└─────────────────────────────┘
              │ No
┌─────────────▼───────────────┐
│ First use: ./bin/eyegents-thin │
└─────────────────────────────┘
```

### Configuration Migration

#### Environment Variables

```bash
# OLD way (project-specific)
export OPENROUTER_API_KEY="..."

# NEW way (consistent across modes)
export EYEGENTS_MODE=full
export EYEGENTS_REMOTE_ENABLED=true
export EYEGENTS_AGENT_SHELL=aider
```

#### CLI Usage Migration

```bash
# OLD: Direct Aider
./venvs/aider/bin/aider --task "..."

# NEW: Mode-aware entrypoint
./bin/eyegents --task "..."
```

## Maintenance and Operations

### Daily Operations

```bash
# Start of day
scripts/status.sh
./scripts/health-check.sh quick

# During development
./bin/eyegents-thin --task "Feature work"

# Midday check
./scripts/health-check.sh quick

# End of day (cleanup)
./scripts/stop-services.sh
```

### Troubleshooting Guide

#### Problem: "Command not found"

```bash
# Aider not installed
./scripts/setup-aider.sh
./bin/eyegents-thin --task "Test"
```

#### Problem: "Connection refused"

```bash
# Check if services are running
./scripts/status.sh

# Start services if needed
./scripts/bootstrap.sh

# Or use thin mode if no Docker
scripts/eyegents-doctor.sh
```

#### Problem: "No resources available"

```bash
# Check system resources
scripts/eyegents-doctor.sh

# Force thin mode if needed
export EYEGENTS_MODE=thin
./bin/eyegents-thin --task "Work"
```

## Future Enhancements

### Planned Improvements

1. **Enhanced Mode Detection**:
   - CPU architecture detection
   - GPU availability checks
   - Network bandwidth awareness

2. **Advanced Integration**:
   - Aider skill discovery and loading
   - MCP tool auto-registration
   - OpenCode-to-Aider communication protocols

3. **Performance Optimization**:
   - Model caching strategies
   - Context pre-loading
   - Background indexing

### Roadmap Integration

This Aider-first integration aligns with the project roadmap:

#### Short-Term Goals ✅ (This Sprint)
- [x] Integrate Aider as supported agent shell
- [x] Mode detection and CLI entry points
- [x] Documentation updates (docs/development, docs/agent-ops)

#### Mid-Term Goals (Next Sprints)
- [ ] Create architecture roadmap docs
- [ ] Add MCP tools for cost summary and routing inspection
- [ ] Formalize Aider skill loading and agent capabilities

#### Long-Term Goals
- [ ] Production deployment patterns
- [ ] Enterprise-level Aider orchestration
- [ ] Advanced model management

## Conclusion

The Aider-first integration delivers a developer-centric AI coding experience that:

1. **Simplifies Developer Experience**: One command, multiple modes
2. **Optimizes Resource Usage**: Intelligent mode detection
3. **Ensures Cost Efficiency**: Cost-aware model routing
4. **Maintains Flexibility**: Multiple deployment patterns
5. **Supports Scalability**: From solo developer to team workflows

This implementation establishes Aider as the primary coding engine while preserving OpenCode's orchestration capabilities, creating a cohesive and productive AI-assisted development environment for the eyegents platform.

---

**Integration Version**: 1.0 (AIder_Feature Branch)
**Compatibility**: eyegents 2.0+
**Documentation**: Complete (AIDER_FIRST.md, docs/)