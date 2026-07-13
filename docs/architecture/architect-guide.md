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
