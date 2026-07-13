# EyeGents Aider Developer Guide

## Overview

This guide is for developers contributing to the eyegents Aider integration project. It covers setup, development workflows, architecture, and testing for the Aider integration components.

## Prerequisites

Before working on the Aider integration, ensure you have:

1. **Node.js 20+** and **Yarn or npm** (for package installation)
2. **Python 3.12+** (required for Aider)
3. **Git 2+** (for version control)
4. **Docker** (optional, for testing the Docker container)
5. **OpenRouter API key** in `.secrets` file (optional for local development)

## Project Structure

```
/ <root>
├── packages/
│   ├── aider-adapter/          # TypeScript AiderAdapter
│   ├── agent-runtime/           # Orchestrator integration
│   ├── shared-types/            # Common TypeScript types
│   └── openrouter-client/       # OpenRouter API client
├── mcp-server/                 # MCP server implementation
│   ├── src/
│   │   ├── tools/
│   │   │   ├── aider-tools.ts    # Aider MCP tools
│   │   │   ├── openrouter-tools.ts # OpenRouter model tools
│   │   │   └── shell-tools.ts    # Shell execution tools
│   │   └── index.ts           # MCP server entry point
│   └── Dockerfile             # Build Docker image for container execution
├── bin/                        # Entry point scripts
│   ├── eyegents              # Auto-detect runtime (Aider primary)
│   ├── eyegents-thin         # Aider-only runtime
│   └── eyegents-full         # Docker + OpenCode + Aider
├── scripts/                    # Development scripts
│   ├── setup-alias.sh         # Setup shell aliases
│   ├── bootstrap.sh          # Bootstrap preparation (fast)
│   ├── aider-execute.sh       # CLI wrapper for Aider execution
│   ├── aider-mcp-search.sh    # Search script for Aider tools
│   └── aider-add-decision.sh  # Decision logging script
├── out/full/                   # Generated Docker build context (read-only)
│   ├── <packages>
│   └── turbo.json
├── docs/                       # Documentation
│   ├── guides/                # User/developer guides
│   └── decisions/             # Architecture Decision Records
└── .github/                    # CI/CD configuration
    └── workflows/             # GitHub Actions workflows
```

## Aider Adapter Development

### Core Components

1. **packages/aider-adapter/src/adapter.ts**
   - The `AiderAdapter` class that spawns Aider as a subprocess
   - Handles command building, execution, and output parsing
   - Manages binary resolution and version checks

2. **packages/aider-adapter/src/types.ts**
   - Zod schemas for type-safe data validation
   - `AiderRequestSchema`: Defines the structure of requests to Aider
   - `AiderResultSchema`: Defines the structure of Aider responses
   - `AiderStatusSchema`: Represents Aider availability/status
   - `AiderAdapterConfig`: Configuration for the AiderAdapter

3. **packages/aider-adapter/src/index.ts**
   - Re-exports the main components
   - Entry point for the AiderAdapter package

### Building and Testing

```bash
# Build the AiderAdapter package only (fast)
npx turbo run build --filter=@eyegents/aider-adapter

# Build all packages
tnpm run build

# Run tests for the AiderAdapter package
npx turbo run test --filter=@eyegents/aider-adapter

# Run all tests
npm test
```

### Common Development Tasks

1. **Fix binary resolution**
   - Modify `packages/aider-adapter/src/adapter.ts` to handle different binary locations
   - Test locally: `pnpm --filter @eyegents/aider-adapter exec node -e "console.log(require('./src/adapter').new AiderAdapter().checkAvailability())"`

2. **Add a new field to AiderRequestSchema**
   - Edit `packages/aider-adapter/src/types.ts` to add new properties
   - Update the adapter to pass the new field to Aider command line arguments

3. **Fix Aider command execution**
   - Debug issues in `packages/aider-adapter/src/adapter.ts` where Aider is spawned
   - Check for errors in the subprocess or output parsing

## MCP Server Development

### Core Components

1. **mcp-server/src/tools/aider-tools.ts**
   - MCP tool implementation for Aider execution
   - Includes `aider_execute` and `aider_check` tools

2. **mapp-server/src/index.ts**
   - Registers all MCP tools including aider tools

3. **mcp-server/Dockerfile**
   - Builds Docker image with Python 3.12+ and `aider-chat` installed
   - Includes all necessary TypeScript packages for the MCP server

### Building and Testing

```bash
# Build the MCP server
npx turbo run build --filter=@eyegents/mcp-server

# Build the entire Docker image
npm run build:docker

# Test Aider tools locally
node mcp-server/src/tools/aider-tools.ts
```

### Common Development Tasks

1. **Fix Aider tools logic**
   - Edit `mcp-server/src/tools/aider-tools.ts` to fix the Aider execution command building
   - Test by running Aider locally: `aider --version`

2. **Update Docker image**
   - Modify `mcp-server/Dockerfile` to use a different version of Python
   - Re-build: `docker compose -f docker/docker-compose.yml build mcp-server`

3. **Add custom context files**
   - Add custom files to the Docker image by copying them into the Dockerfile
   - Example: `COPY my-custom-file.txt ./`

## Docker Development

### Running the MCP Server Locally via Docker

```bash
# Set environment variables
docker compose -f docker/docker-compose.yml up -d mcp-server

# Check if the server is running
docker compose -f docker/docker-compose.yml logs mcp-server -f

# Test the aider_check tool using `mcpo` CLI
mcpo --server http://localhost:3001 --tools aider_check
```

### Testing Aider Integration

1. **Local Aider integration test**

```bash
# Clone the repo
cd /path/to/eyegents

# Start the Docker services
docker compose -f docker/docker-compose.yml up -d ollama qdrant mcp-server

# Run a simple test using the AiderAdapter
node -e "
const { AiderAdapter } = require('@eyegents/aider-adapter');
(async () => {
const adapter = new AiderAdapter();
const status = await adapter.checkAvailability();
console.log('Aider availability:', status.available);
})();
"
```

2. **Integration tests**

```bash
# Run integration tests for the AiderAdapter
npx turbo run test --filter=@eyegents/integration-testing
```

## CI/CD Pipeline

The CI pipeline for the Aider integration includes:

1. **Build verification**
   - Ensure all packages build correctly
   - Run TypeScript strict mode checks

2. **Code quality checks**
   - Run linters (Biome, Prettier)
   - Run type checkers (tsc --noEmit)

3. **Aider-specific checks**
   - Validate aider-lint-gate for Aider-authored commits
   - Ensure all Aider configuration files are committed

### Common Dev Tasks in CI/CD

1. **Add aider-lint-gate job to CI**
   - Add a new job to the GitHub Actions workflow file
   - Ensure it runs after the Aider-related jobs

2. **Update aider configuration**
   - Update the aider configuration if there are changes to the API or behavior
   - Test the changes in the CI pipeline

## Contributing Guidelines

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Add tests for new functionality
4. Ensure all existing tests pass
5. Commit with conventional commits
6. Push to your fork
7. Create a pull request

### Code Style

- Use TypeScript strict mode
- Follow the existing code style and conventions
- Use 2-space indentation (2 spaces per indent level)
- No trailing whitespace
- Ensure no console.log statements in production code

### Commit Convention

```bash
# Commit convention
co-author: pabl0wsl <pabl0wsl@gmail.com>
```

### Testing

- Unit tests for the AiderAdapter
- Integration tests for MCP tools
- E2E tests for Aider execution

## Context Engineering

Context engineering is how eyegents assembles and feeds relevant project context to AI agents (Aider, Orchestrator, etc.). It follows a **three-layer model**:

### Layer 1: Static Context (Files)

Files that are always loaded into every Aider session:

| File | Purpose | Loaded via |
|------|---------|-----------|
| `CONVENTIONS.md` | Project-wide coding conventions, style, patterns | `--read CONVENTIONS.md` |
| `CLAUDE.md` | Agent instructions, architecture, key decisions | `--read CLAUDE.md` |
| `.aider.conf.yml` | Aider configuration (model, git settings) | Auto-loaded by Aider |
| `.aiderignore` | Files to exclude from repo-map | `--aiderignore .aiderignore` |

These files are *prompt-cached* — the LLM reads them once and keeps them in context window for the entire session.

### Layer 2: Dynamic Context (Repo-Map + Vector Search)

Aider automatically builds a **repo-map** (condensed tree of your codebase) and includes it in every request. Configuration:

```yaml
# .aider.conf.yml
map-tokens: 4096        # Max tokens for repo-map (default: 2k)
map-refresh: files      # Refresh strategy: files | auto | always
```

Beyond Aider's built-in repo-map, eyegents provides **semantic vector search** via Qdrant:

```typescript
// packages/qdrant-client — search code_chunks collection
const results = await qdrant.search("code_chunks", {
  query: "authentication middleware",
  limit: 5,
  filter: { language: "typescript" },
});
```

Vector search is used by the Orchestrator **before** dispatching to Aider, to pull in relevant code snippets and prior patterns.

### Layer 3: Learned Context (Qdrant Decisions)

Every architectural decision made during an Aider session is stored in the `decisions` collection:

```typescript
await qdrant.upsert("decisions", {
  id: uuid(),
  vector: embed(decisionText),
  payload: {
    context: "Why we chose adapter pattern over direct exec",
    rationale: "Three-layer architecture enables Docker isolation",
    outcome: "AiderAdapter with spawn/exec fallback",
    tags: ["architecture", "aider", "adapter"],
    author: "aider",
    timestamp: Date.now(),
  },
});
```

On subsequent sessions, the Orchestrator queries the `decisions` collection to retrieve relevant prior decisions — creating a **feedback loop** where past context informs future work.

### Context Assembly Flow

```
User Request
    │
    ▼
┌──────────────────────────────────────────┐
│ Orchestrator Context Assembly             │
│                                          │
│ 1. Vector Search → relevant code chunks  │  ← Qdrant code_chunks
│ 2. Decision Search → prior decisions      │  ← Qdrant decisions
│ 3. Load static files → CONVENTIONS, CLAUDE│  ← Filesystem
│ 4. Build context packet                   │
│ 5. Append to Aider request                │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ Aider Execution                          │
│                                          │
│ 1. Receive context packet + task          │
│ 2. Apply repo-map to understand codebase  │
│ 3. Generate edits                         │
│ 4. Capture git diff                       │
│ 5. Return structured result               │
└──────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────┐
│ Post-Execution (Feedback Loop)            │
│                                          │
│ 1. Store decision → Qdrant decisions      │
│ 2. Index changed files → Qdrant code_chunks│
│ 3. Update conversation memory              │
│ 4. Return summary to user                 │
└──────────────────────────────────────────┘
```

## Loop Engineering

Loop engineering is the practice of designing **feedback cycles** that improve future AI interactions based on past outcomes.

### The Four Feedback Loops

| Loop | Trigger | Storage | Effect |
|------|---------|---------|--------|
| **Decision Memory** | After every successful edit | Qdrant `decisions` | Next session retrieves relevant decisions |
| **Code Re-indexing** | After file changes | Qdrant `code_chunks` | Vector search returns updated code |
| **Conversation History** | After every exchange | Qdrant `conversations` | Session continuity across turns |
| **Skill Pattern Learning** | When a pattern is reused | Qdrant `skill_patterns` | Few-shot examples grow over time |

### Decision Memory Loop (Most Important)

This is the core loop that makes eyegents "smarter" over time:

```
1. Aider makes a change → git diff captured
2. Adapter parses diff → identifies changed files
3. Orchestrator extracts decision context:
   - What was the task?
   - What was changed?
   - Why that approach?
4. Decision stored in Qdrant with embedding
5. NEXT SESSION: Similar task triggers vector search
6. Relevant decision injected into Aider's context
7. Aider makes better-informed decisions
```

### Implementing a New Loop

To add a new feedback loop:

1. **Identify the trigger** (e.g., "test failure detected")
2. **Define the data** to store (e.g., `{ testName, error, fix }`)
3. **Choose the Qdrant collection** (or create a new one)
4. **Store on trigger** in the adapter's post-execution phase
5. **Retrieve on relevant input** during context assembly

Example — adding a "test failure recovery" loop:

```typescript
// In orchestrator's context assembly
const failures = await qdrant.search("test_failures", {
  query: request.task,
  limit: 3,
  filter: { project: repoName },
});

// Inject into Aider's read-only context
request.files = [
  ...request.files,
  ...failures.map(f => f.payload.relevantFile),
];
```

### Loop Anti-Patterns

- **Stale context**: Storing decisions but never pruning old/irrelevant ones. Fix: add TTL or relevance threshold.
- **Context overload**: Retrieving too many decisions and overflowing the context window. Fix: strict `limit` and `scoreThreshold`.
- **Echo chamber**: Only retrieving decisions that confirm the current approach. Fix: diversify vector search with `offset` or diversity penalty.
- **Missing loop closure**: Storing data but never retrieving it. Fix: every `upsert` should have a corresponding `search` use case.

## Common Issues and Solutions

### 1. Aider not found error

**Problem**: The Aider binary is not found in the system.

**Solution**:
```bash
# Install Aider locally
pip install aider-chat && aider --version

# Or in a project-specific virtual environment
python3 -m venv .venvs/aider
source .venvs/aider/bin/activate
pip install aider-chat
deactivate
```

### 2. API rate limiting

**Problem**: Running out of API requests for the OpenRouter API.

**Solution**:
```bash
# Use the paid model instead
OPENROUTER_API_KEY=sk-or-v1-your-key aider \
  --model openrouter/deepseek/deepseek-v4-flash \
  --message "Your task"
```

### 3
 **Error 404: Path '/path/to/file.ts' does not exist**

**Problem**: The file you're trying to edit doesn't exist.

**Solution**:
```bash
# List files in the project
find packages -name "*.ts" | grep adapter
```

### 4. Changes not being applied

**Problem**: The changes made by Aider are not being applied to the files.

**Solution**:
```bash
# Try applying the changes manually
git checkout -- packages/aider-adapter/src/adapter.ts
```

## Further Reading

- [Architecture Decision Records](docs/decisions/)
- [User Guide](docs/guides/user-guide.md)
- [Architecture Guide](docs/architecture/architect-guide.md)
- [Contributing Guidelines](CONTRIBUTING.md)

## References

- [TypeScript Strict Mode Documentation](https://www.typescriptlang.org/docs/handbooks/typescript-in-5-minutes.html)
- [Aider Documentation](https://github.com/karpathy/aider.git)
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [GitHub Actions Documentation](https://docs.github.com/actions)
