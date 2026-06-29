# Getting Started

Welcome to the eyegents project. This guide will help you set up your development environment and start contributing.

## Prerequisites

- **Docker** — for running local services (Ollama, Qdrant)
- **Node.js 20+** — runtime for packages and tooling
- **Git** — version control

## Quick Start

```bash
# Clone the repo
git clone https://github.com/your-org/eyegents.git
cd eyegents

# Bootstrap the project (installs deps, sets up configs)
./scripts/bootstrap.sh

# Open in your editor
opencode
```

## IDE Setup

Use **VS Code** with the following extensions:

- **TypeScript** — IntelliSense, type checking, and navigation
- Biome — formatting and linting support (optional, CLI is primary)

## First Task

Once your environment is running:

1. **Run the test suite** to verify everything works:
   ```bash
   npm test
   ```

2. **Read `CLAUDE.md`** in the project root — it contains key architectural decisions and conventions.

3. **Explore `packages/`** — each subdirectory is a workspace package. Start with `packages/core` for the core library.

## Getting Help

- **`CLAUDE.md`** — project conventions, architecture, and common patterns
- **`docs/`** — detailed documentation on development workflows, testing, and more
- **GitHub Issues** — report bugs, ask questions, or request features
