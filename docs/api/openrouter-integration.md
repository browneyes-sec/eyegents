# OpenRouter Integration

Remote LLM fallback via OpenRouter for tasks requiring more capability than local models.

## Setup

### 1. Get API Key

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Generate an API key
3. Free models (Nemotron 3 Super/Nano) require no payment

### 2. Create .secrets File

```bash
# .secrets (gitignored)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx
GH_PAT=ghp_xxxxxxxxxxxxxxxxxxxx
```

### 3. Load Secrets

```bash
source scripts/load-secrets.sh
```

### 4. GitHub Secrets (CI/CD)

Add to repository settings:

| Secret | Value |
|--------|-------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `GH_PAT` | GitHub personal access token |

### 5. Docker Environment

The OpenRouter overlay adds environment variables:

```bash
docker compose -f docker-compose.yml -f docker-compose.openrouter.yml up -d
```

## Models

| Model | OpenRouter ID | Context | Input Cost | Output Cost | Tier |
|-------|---------------|---------|------------|-------------|------|
| Nemotron 3 Super | `nvidia/nemotron-3-super-120b-a12b:free` | 1M | $0 | $0 | Free |
| Nemotron 3 Nano | `nvidia/nemotron-3-nano-30b-a3b:free` | 262K | $0 | $0 | Free |
| Nemotron 3 Ultra | `nvidia/nemotron-3-ultra-550b-a55b` | 1M | $0.001 | $0.003 | Paid |
| DeepSeek V4 Flash | `deepseek/deepseek-v4-flash` | 1M | $0.112 | $0.224 | Paid |
| DeepSeek V4 Pro | `deepseek/deepseek-v4-pro` | 1M | $0.435 | $0.87 | Paid |

## Routing

Each agent role maps to a primary and fallback model. Routing is configured in `config/openrouter-routes.json`.

### Agent Routes

| Agent | Primary | Fallback | Notes |
|-------|---------|----------|-------|
| orchestrator | local qwen2.5-coder:7b | Nemotron 3 Super | Hybrid: local for simple, remote for complex |
| backend | DeepSeek V4 Flash | local qwen2.5-coder:7b | Fast coding tasks |
| frontend | local qwen2.5-coder:7b | Nemotron 3 Super | UI tasks stay local |
| qa | DeepSeek V4 Flash | local qwen2.5-coder:7b | Fast test generation |
| ops | local qwen2.5-coder:7b | Nemotron 3 Super | Infra tasks stay local |
| fullstack | DeepSeek V4 Flash | local qwen2.5-coder:7b | E2E features |
| certifier | Nemotron 3 Ultra | DeepSeek V4 Pro | Deep reasoning for security |

### Complexity Detection

The orchestrator agent uses complexity detection to route between local and remote:

- **Simple tasks** (token count < 2048, no complex keywords) → local model
- **Complex tasks** (token count >= 2048 or complex keywords) → Nemotron 3 Super

Complex keywords: `decompose`, `plan`, `architecture`, `refactor`, `multi-step`, `break down`, `coordinate`

## Cost Tracking

Every request is logged with:

- Model used
- Agent role
- Token counts (input/output)
- Cost in USD
- Timestamp

### Session Summary

```python
# Via MCP tool
openrouter_costs()
```

Returns per-model and per-agent breakdowns.

### Daily Budget

Default: $5.00/day. Configurable in the OpenRouter client initialization.

## Fallback

### Circuit Breaker

When OpenRouter is unreachable or rate-limited:

1. First failure: Retry with exponential backoff (1s, 2s, 4s)
2. Second consecutive failure: Switch to fallback model
3. Third consecutive failure: Circuit opens, all requests route locally
4. Recovery: Circuit half-opens after 60s, tests with one request

### Automatic Recovery

The circuit breaker automatically recovers when the API becomes available again. No manual intervention required.

## Testing

```bash
# Activate virtual environment
source .venvs/openrouter/bin/activate

# Run connectivity test
python scripts/openrouter-test.py
```

The test script:

1. Checks API key configuration
2. Tests each model with a simple prompt
3. Verifies TypeScript integration files
4. Displays routing configuration
5. Reports pass/fail summary

### Expected Output

```
eyegents OpenRouter Connectivity Test
============================================================
[OK] API key found: sk-or-v1-xxxx...
[OK] Site: eyegents

Testing Nemotron 3 Super (free)...
  [OK] Response: eyegents connected
  [OK] Latency: 1.23s | Tokens: 12in/8out

...

ALL TESTS PASSED
```
