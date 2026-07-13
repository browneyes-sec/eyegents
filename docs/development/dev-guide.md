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
