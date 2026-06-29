# Deployment Guide

Local, staging, and production deployment procedures.

## Local Development

```bash
# One-command setup
./scripts/bootstrap.sh

# Or manually
docker compose -f docker/docker-compose.yml up -d
npm ci
npm run build
```

Services start with health checks and dependency ordering. The MCP server waits for Ollama and Qdrant to be healthy.

### With OpenRouter

```bash
# Load secrets
source scripts/load-secrets.sh

# Start with OpenRouter overlay
docker compose -f docker/docker-compose.yml -f docker/docker-compose.openrouter.yml up -d
```

## Staging

Staging runs on the `develop` branch. The `deploy-staging.sh` script handles deployment:

```bash
# Triggered on push to develop
./scripts/deploy-staging.sh
```

Staging uses the same Docker Compose stack as local, deployed to a staging host with environment-specific configuration.

## Production

Production builds use GitHub Actions. The `docker-build.yml` workflow:

1. Triggers on push to `main`
2. Builds multi-architecture images (amd64, arm64)
3. Pushes to GitHub Container Registry (GHCR)
4. Tags with version and `latest`

### Workflow

```
main push → docker-build.yml → build → push to ghcr.io/browneyes-sec/eyegents/*
```

### Image Tags

| Tag | Purpose |
|-----|---------|
| `latest` | Most recent main build |
| `v0.1.0` | Semantic version tag |
| `sha-abc1234` | Commit-specific |

### Pulling Production Images

```bash
# MCP server
docker pull ghcr.io/browneyes-sec/eyegents/mcp-server:latest

# Vector indexer
docker pull ghcr.io/browneyes-sec/eyegents/vector-index:latest
```

## Environment Variables

### Local (.env)

```bash
# Copy example
cp .env.example .env

# Required
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=pablo
GITHUB_REPO=eyegents

# Optional
OPENROUTER_API_KEY=sk-or-...
```

### GitHub Secrets (CI/CD)

| Secret | Purpose |
|--------|---------|
| `GITHUB_TOKEN` | GitHub API access for PR/issue tools |
| `GH_PAT` | Personal access token for broader repo access |
| `OPENROUTER_API_KEY` | OpenRouter API for remote LLM fallback |

### Docker Environment

Services receive environment variables via Compose:

```yaml
environment:
  - QDRANT_URL=http://qdrant:6333
  - OLLAMA_URL=http://ollama:11434
  - GITHUB_TOKEN=${GITHUB_TOKEN}
  - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
```

## OpenRouter Overlay

The OpenRouter overlay adds environment variables without duplicating the base Compose file:

```bash
# Base stack only
docker compose -f docker/docker-compose.yml up -d

# Base + OpenRouter
docker compose -f docker/docker-compose.yml -f docker/docker-compose.openrouter.yml up -d
```

The overlay file (`docker-compose.openrouter.yml`) only defines the `mcp-server` service environment additions.

## Health Verification

After deployment, verify all services:

```bash
# Check containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Ollama
curl http://localhost:11434/api/tags

# Qdrant
curl http://localhost:6333/health

# MCP Server
curl http://localhost:3001/health
```

## Scaling Notes

eyegents is designed for single-host deployment. For multi-host scenarios:

- Ollama: Use a single GPU-equipped host
- Qdrant: Supports clustering via `QDRANT__CLUSTER__` config
- MCP Server: Stateless, can be horizontally scaled
- Indexer: Single instance, runs on-demand
