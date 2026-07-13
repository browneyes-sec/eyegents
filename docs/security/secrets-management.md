# Secrets Management

## Local Development

### .secrets File
- **Location**: Project root (`/home/pabl0wsl/eyegents/.secrets`)
- **Purpose**: Store API keys and tokens for local development
- **Access**: Read-only by scripts, never committed to git
- **Format**: `KEY=value` (shell-compatible)

### Loading Secrets
Use the provided script to load secrets into your environment:
```bash
source scripts/load-secrets.sh
```

**What it does:**
1. Reads `.secrets` file
2. Validates each key is non-empty
3. Exports variables to current shell
4. Verifies connectivity to external services

### .secrets.example
Template file showing required secrets without actual values:
```
OPENROUTER_API_KEY=your_key_here
GH_PAT=your_github_pat_here
CODING_MODEL=openrouter/qwen/qwen3-coder:free
FALLBACK_MODEL=openrouter/deepseek/deepseek-v4-flash:free
ROUTER_MODEL=openrouter/free
```

## CI/CD (GitHub Actions)

### GitHub Secrets
Store these in repository settings (Settings → Secrets and variables → Actions):

| Secret | Description | Usage |
|--------|-------------|-------|
| `OPENROUTER_API_KEY` | OpenRouter API authentication | LLM routing |
| `GH_PAT` | GitHub Personal Access Token | API operations |
| `CODING_MODEL` | Primary coding model identifier | Agent routing (default: qwen3-coder:free) |
| `FALLBACK_MODEL` | Long-context fallback model | Agent routing (default: deepseek-v4-flash:free) |
| `ROUTER_MODEL` | General fallback router | Agent routing (default: openrouter/free) |

### Naming Convention
- Use `GH_PAT` (not `GITHUB_PAT`) due to GitHub reserved variable restrictions
- All secrets prefixed by service: `OPENROUTER_`, `GH_`, etc.
- Model names use uppercase with underscores

### Workflow Usage
```yaml
env:
  OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  GH_PAT: ${{ secrets.GH_PAT }}
```

## Docker Environment

### .env File
- **Location**: Project root (`/home/pabl0wsl/eyegents/.env`)
- **Purpose**: Docker Compose environment variables
- **Access**: Read by docker-compose, never committed

### docker-compose.yml Integration
```yaml
services:
  ollama:
    env_file:
      - .env
  qdrant:
    env_file:
      - .env
```

### Environment Variables
```bash
# OpenRouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Models
CODING_MODEL=openrouter/qwen/qwen3-coder:free
FALLBACK_MODEL=openrouter/deepseek/deepseek-v4-flash:free
ROUTER_MODEL=openrouter/free

# Qdrant
QDRANT_API_KEY=your_qdrant_key
QDRANT_URL=http://qdrant:6333
```

## Secret Rotation

### Schedule
- **Quarterly**: Rotate all API keys (minimum)
- **Immediately**: After any suspected exposure
- **On-demand**: When team member leaves

### Rotation Process
1. Generate new key in provider dashboard
2. Update `.secrets` file (local)
3. Update GitHub Secrets (CI/CD)
4. Update `.env` file (Docker)
5. Test connectivity
6. Revoke old key after 24-hour grace period

### Audit Trail
- Log all key rotations in `SECURITY_ROTATIONS.md`
- Include date, key type, reason, and responsible party
- Review quarterly access logs

## Never Commit Secrets

### Pre-commit Hooks
Automated checks prevent secret commits:
```bash
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
      - id: no-commit-to-branch
        args: ['--branch', 'main', '--branch', 'master']
```

### .gitignore Rules
```
# Secrets
.secrets
.env
.env.local
.env.*.local

# Generated
*.pem
*.key
*.cert
```

### Manual Verification
Before committing, run:
```bash
git diff --cached | grep -i "key\|secret\|password\|token"
```

## Secret Naming Conventions

### GitHub PAT
- **Name**: `GH_PAT` (not `GITHUB_PAT`)
- **Reason**: GitHub Actions reserved `GITHUB_TOKEN` namespace
- **Scope**: Minimal permissions (repo, workflow)

### OpenRouter
- **Name**: `OPENROUTER_API_KEY`
- **Format**: `sk-or-...`
- **Scope**: Read-only, rate-limited

### Models
- **Names**: `CODING_MODEL`, `FALLBACK_MODEL`, `ROUTER_MODEL`
- **Format**: Provider/model:variant
- **Example**: `openrouter/qwen/qwen3-coder:free`

## Emergency Response

### Suspected Exposure
1. **Immediately**: Rotate exposed secret
2. **Check logs**: Audit access for unauthorized use
3. **Notify team**: Share details in #security channel
4. **Document**: Update incident log
5. **Review**: Assess impact and update controls

### Automated Detection
- GitHub secret scanning alerts
- Pre-commit hooks block commits
- Docker image scanning (no secrets in layers)
- Runtime monitoring for unusual API calls