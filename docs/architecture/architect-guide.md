# Eyegents Architecture Guide

## System Overview

Eyegents is a **local-first AI coding platform** built on a hybrid architecture combining traditional backend services with AI-powered agents. The system provides a unified interface for developers to interact with AI assistants, leveraging both local deployments and cloud services as needed.

### Core Architecture Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                            │
├───────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Eyegents CLI   │  │  Eyegents Web   │  │  Aider AI       │  │
│  │   (Entry Point) │  │   Interface     │  │   Pair-Programming│  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                              │
│                                                              │
└───────────────────────────────────────────────────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  Eyegents Core  │  │  External LLM   │  │  Containerized   │  │
│  Orchestration  │  │  Services       │  │  MCP Server      │  │
│  (Backend)      │  │  (OpenRouter)    │  │  (Docker Image)  │  │
└─────────────────┘  └─────────────────┘  └─────────────────┘  │
         │                       │                       │
    ┌───────────┐      ┌───────────┐      ┌───────────┐      │
    │   Qdrant  │      │   Ollama   │      │  Aider     │      │
    │ Vector DB │      │  (Model)   │      │  (Python)  │      │
    └───────────┘      └───────────┘      └───────────┘      │
```

### Architecture Components

1. **Eyegents CLI (Entry Point)**
   - `eyegents` shell script that auto-detects deployment mode
   - Provides unified interface for all operations

2. **Core Orchestration Service**
   - Manages agent lifecycle and task distribution
   - Routes queries to appropriate agents
   - Maintains conversation memory and context

3. **External LLM Services**
   - OpenRouter integration for cloud-based language models
   - Local Ollama deployment for on-premise inference
   - Model management and load balancing

4. **Containerized Services**
   - Docker-based modular services
   - MCP server for tool execution
   - Scalable microservices architecture

## Component Breakdown

### 1. Core Orchestration Service

**Files**:
- `packages/agent-runtime/src/orchestrator.ts`
- `packages/shared-types/src/index.ts`

**Responsibilities**:
- Multi-agent coordination
- Task decomposition and routing
- Memory management
- API endpoint management

**Key Features**:
```typescript
interface Task {
  description: string;
  preferredAgent?: AgentRole;
  context?: Record<string, any>;
}

interface AgentMessage {
  role: string;
  content: string;
  metadata?: Record<string, any>;
}
```

### 2. External LLM Services

**Files**:
- `packages/openrouter-client/`
- `config/openrouter-routes.json`

**Integration Pattern**:
```typescript
const config = {
  primary: "nemotron-3-super:free",
  fallback: "deepseek-v4-flash",
  weakModel: "nemotron-3-nano:free"
}
```

### 3. Containerized Services

**Docker Architecture**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 py3-pip
RUN python3 -m venv /opt/aider-venv
RUN /opt/aider-venv/bin/pip install aider-chat==0.86.2
RUN ln -sf /opt/aider-venv/bin/aider /usr/local/bin/aider
```

### 4. Aider Integration Components

**Three-Layer Architecture**:

#### Layer 1: TypeScript Adapter
```typescript
export class AiderAdapter {
  // Binary resolution logic
  // Command building
  // Output parsing and error handling
}
```

#### Layer 2: Docker MCP Tools
```typescript
export const aiderTools: Tool[] = [
  {
    name: "aider_execute",
    description: "Execute Aider coding tasks",
    handler: async (args) => { /* Docker execution */ }
  },
  // ... other tools
]
```

#### Layer 3: Shell Scripts
```bash
#!/bin/bash
# aider-execute.sh
# CLI wrapper for Aider tasks
```

## Workflow Patterns

### Coding Workflow
```
1. User types task in Eyegents CLI
2. Orchestrator routes task to Aider (or other agents)
3. Aider reads project context and applies changes
4. System validates changes via lint/check
5. Results integrated into project
```

### Task Decomposition
```
1. Parse user intent using NLP classification
2. Determine required agent roles
3. Check available models/context
4. Break down complex tasks into subtasks
5. Route subtasks to appropriate agents
```

### Context Management
```
1. Load CONVENTIONS.md + CLAUDE.md (static context)
2. Apply repo-map for codebase awareness (dynamic context)
3. Maintain conversation history
4. Store decisions in Qdrant vector database
```

## State Management

### Vector Memory Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `code_chunks` | Semantic code search | `filePath`, `language`, `astType`, `content`, `embedding` |
| `conversations` | Session memory | `sessionId`, `messages[]`, `summary`, `decisions[]` |
| `decisions` | Architectural memory | `context`, `rationale`, `outcome`, `tags` |
| `skill_patterns` | Few-shot examples | `skillName`, `pattern`, `example` |

### State Flow
```
User Request → Orchestrator → Aider Agent
  ↓             ↓                ↓
  Context      Context         Git diff
  Retrieval    Map           Integration
  (Qdrant)      (Repo-map)     (File system)
```

## Configuration

### Model Configuration

```json
// config/openrouter-routes.json
{
  "eyegents": {
    "primary": "openrouter/nvidia/nemotron-3-super-120b-a12b:free",
    "fallback": "openrouter/deepseek/deepseek-v4-flash",
    "weak": "openrouter/nvidia/nemotron-3-nano-30b-a3b:free"
  },
  "monitoring": {
    "maxTokens": 8192,
    "temperature": 0.2,
    "logLevel": "info"
  }
}
```

### Agent Routing

```typescript
const ROUTING_RULES = {
  code: "aider",
  edit: "aider",
  refactor: "aider",
  implement: "aider",
  test: "qa",
  documentation: "frontend",
  security: "certifier",
  deployment: "ops"
};
```

## Technology Stack

### Backend
- **TypeScript** (strict mode)
- **Node.js 20+**
- **Express** (REST API)
- **Zod** (type validation)

### AI/ML
- **OpenRouter** (API for cloud LLMs)
- **Ollama** (local model service)
- **Aider** (AI pair-programming CLI)
- **Qdrant** (vector database)

### Infrastructure
- **Docker** (containerization)
- **Docker Compose** (orchestration)
- **Node 20-alpine** (base image)
- **Bash** (shell scripts and automation)

### DevOps
- **GitHub Actions** (CI/CD)
- **Biome** (linting and formatting)
- **Vitest** (unit testing)
- **GitHub** (version control)

## Deployment Strategies

### 1. Local Development
```bash
# Setup and run locally
./scripts/bootstrap.sh --quick
./scripts/bootstrap.sh --thin
./scripts/bootstrap.sh --full
```

### 2. Containerized Deployment
```bash
docker compose -f docker/docker-compose.yml up -d
```

### 3. Cloud Deployment
```bash
# Via OpenRouter's managed infrastructure
# Uses HA with automatic failover
```

## Security Considerations

### API Key Management
- Store API keys in `.secrets` (gitignored)
- Use environment variables for local development
- Implement token expiration and refresh

### Rate Limiting
```javascript
// OpenRouter rate limit handling
const rateLimiter = {
  requests: 0,
  resetTime: new Date(),
  limit: 50,
  increment() {
    this.requests++;
    if (this.requests >= this.limit) {
      throw new Error("Rate limit exceeded");
    }
  }
};
```

### Access Control
- API key validation
- Authentication middleware
- Role-based access control
- Request logging and monitoring

## Monitoring and Observability

### Metrics
- Request latency
- Model usage statistics
- Error rates
- Token consumption

### Logging
```javascript
const logger = {
  info: (message, metadata) => { /* Log to JSON */ },
  error: (error, context) => { /* Log error stack */ },
  warn: (message, data) => { /* Log warnings */ }
};
```

### Health Checks
```bash
# Docker health checks
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# API endpoint health
curl http://localhost:3001/health
```

## Context Engineering Architecture

Context engineering is a first-class architectural concern in eyegents. It follows a **three-layer model** with an explicit **feedback loop** that connects execution outcomes back into future context.

### Three-Layer Context Model

```
┌────────────────────────────────────────────────────┐
│ LAYER 1: STATIC CONTEXT (Always loaded)            │
├────────────────────────────────────────────────────┤
│  • CONVENTIONS.md        — Project conventions     │
│  • CLAUDE.md             — Agent instructions       │
│  • .aider.conf.yml       — Aider configuration      │
│  • .aiderignore          — Exclude patterns         │
│  Loaded via --read flags on every Aider invocation  │
└────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────┐
│ LAYER 2: DYNAMIC CONTEXT (Per-session)              │
├────────────────────────────────────────────────────┤
│  • Repo-map (Aider-built codebase tree)             │
│  • Vector search hits (Qdrant code_chunks)          │
│  • Task-specific files from request.files[]         │
│  Assembled by Orchestrator before dispatching       │
└────────────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────┐
│ LAYER 3: LEARNED CONTEXT (Cross-session)            │
├────────────────────────────────────────────────────┤
│  • Prior decisions from Qdrant decisions collection │
│  • Skill patterns from Qdrant skill_patterns        │
│  • Conversation history from Qdrant conversations   │
│  Retrieved via semantic similarity to current task  │
└────────────────────────────────────────────────────┘
```

### Context Assembly Pipeline

The Orchestrator runs this pipeline **before every agent dispatch**:

```
Request: "Add auth middleware to Express app"
    │
    ├─► Vector Search (code_chunks)
    │     Query: "express auth middleware"
    │     Result: 5 relevant code snippets
    │
    ├─► Decision Search (decisions)
    │     Query: "authentication pattern"
    │     Result: 3 prior decisions about auth
    │
    ├─► Static Files
    │     Read: CONVENTIONS.md, CLAUDE.md
    │
    ├─► Build Context Packet
    │     Merge all into structured context block
    │
    └─► Append to Aider Request
          Context packet + task → AiderAdapter.execute()
```

### Context Token Budget

| Source | Budget (tokens) | Notes |
|--------|-----------------|-------|
| Static files (CONVENTIONS + CLAUDE) | ~2,000 | Prompt-cached per session |
| Repo-map | 4,096 | Configurable via `map-tokens` |
| Vector search results | ~3,000 | 5 chunks × ~600 tokens each |
| Prior decisions | ~1,500 | 3 decisions × ~500 tokens each |
| Request task | ~500 | User's natural language input |
| **Total context** | **~11,096** | Well within 16k-32k model limits |

## Feedback Loop Engineering

Feedback loops are the mechanism by which eyegents **learns from past executions** and improves future outcomes. Each loop consists of four phases:

### The Generic Feedback Loop

```
                  ┌──────────┐
                  │  TRIGGER  │
                  │  (Event)  │
                  └────┬─────┘
                       │
                       ▼
                  ┌──────────┐
    ┌─────────────│  STORE   │─────────────┐
    │             │ (Vector) │             │
    │             └──────────┘             │
    │                                     │
    ▼                                     ▼
┌──────────┐                       ┌──────────┐
│ RETRIEVE │◄─────────────────────│  APPLY   │
│ (Search) │    Similar task      │ (Inject) │
└──────────┘                       └──────────┘
```

### Implemented Loops

#### 1. Decision Memory Loop (★ Primary)

**Purpose**: Remember architectural decisions to inform future edits.

```
Trigger: Successful Aider edit (exit code 0)
 Store: {
   collection: "decisions",
   payload: { context, rationale, outcome, tags, author }
 }
Retrieve: On every task, search by semantic similarity
  Apply: Inject matching decisions as read-only context
```

**Files involved**: `packages/aider-adapter/src/adapter.ts` (exec → store), `packages/agent-runtime/src/orchestrator.ts` (retrieve → inject)

#### 2. Code Re-indexing Loop

**Purpose**: Keep vector index current after file changes.

```
Trigger: File system change detected (or post-edit)
 Store: Re-index changed files in `code_chunks`
Retrieve: On every context assembly
  Apply: Return updated snippets in vector search results
```

**Files involved**: `vector-index/src/indexer.ts`

#### 3. Conversation History Loop

**Purpose**: Maintain session continuity across multiple turns.

```
Trigger: Every Aider exchange completes
 Store: { role, content, summary, timestamp } in `conversations`
Retrieve: On subsequent turns within same session
  Apply: Include prior exchanges as chat history
```

**Files involved**: `packages/agent-runtime/src/orchestrator.ts`

#### 4. Skill Pattern Loop

**Purpose**: Grow library of reusable few-shot examples.

```
Trigger: Developer marks a pattern as reusable
 Store: { skillName, pattern, example } in `skill_patterns`
Retrieve: When skill is requested by name
  Apply: Inject pattern as few-shot example into prompt
```

**Files involved**: `packages/agent-runtime/src/skills.ts`

### Loop Health Metrics

| Metric | What it measures | Target |
|--------|-----------------|--------|
| **Retrieval relevance** | % of retrieved decisions that match task | >80% |
| **Context utilization** | % of context tokens that influenced output | >60% |
| **Loop coverage** | % of tasks that retrieve ≥1 prior decision | >90% |
| **Staleness ratio** | % of stored decisions older than 30 days unused | <10% |

### Loop Anti-Patterns (Architecture Review Checklist)

- [ ] **Stale context storm**: Are we filtering by recency or TTL? Every stored decision should have a `timestamp` and be pruned after a configurable window.
- [ ] **Context window overflow**: Are we enforcing `limit` on retrievals? Aider has a 16k-32k context window — dynamic context must not consume >60%.
- [ ] **Echo chamber bias**: Are we retrieving diverse decisions? Consider `scoreThreshold` + `offset` to avoid always getting the same top-3 results.
- [ ] **Write-only storage**: Does every `upsert` have a corresponding `search`? If data is stored but never retrieved, it's dead weight in the vector DB.
- [ ] **Missing loop closure**: After storing a decision, does the next similar task retrieve it? Trace the full loop end-to-end for each collection.

## Performance Considerations

### Scaling Strategies
- **Horizontal scaling**: Add more containers behind load balancer
- **Auto-scaling**: Based on queue length and resource usage
- **Caching**: Bloom filters for frequent lookups, CDN for static content

### Optimization Techniques
- **Repo-map minimization**: Cache frequently accessed code sections
- **Streaming responses**: Stream large responses incrementally
- **Connection pooling**: Reuse HTTP connections for better throughput

## Future Enhancements

### 1. Advanced AI Integration
- Implement custom tools for IDE integration
- Add support for more language models
- Implement fine-tuning for domain-specific knowledge

### 2. Enhanced Context Management
- Implement transformer-based context compression
- Add semantic search across conversations
- Support for multiple memory time scales

### 3. Improved Developer Experience
- Web interface for session management
- Real-time collaboration features
- Built-in debugging tools

## References
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Aider GitHub](https://github.com/karpathy/aider)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---
*Eyegents Platform - Architecture Documentation*
*Generated from code patterns and design decisions*
