# OpenRouter Setup

Enable remote LLM fallback for tasks requiring more capability than local models.

## 1. Get API Key

1. Go to [openrouter.ai](https://openrouter.ai)
2. Sign up or log in
3. Navigate to **Keys** → **Create Key**
4. Copy the API key (starts with `sk-or-v1-`)

Free models (Nemotron 3 Super, Nemotron 3 Nano) are available without adding payment.

## 2. Create .secrets File

```bash
# In the project root
cat > .secrets << 'EOF'
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx
GH_PAT=ghp_xxxxxxxxxxxxxxxxxxxx
EOF
```

The `.secrets` file is gitignored — never commit it.

## 3. Test Connectivity

```bash
# Activate the Python virtual environment
source .venvs/openrouter/bin/activate

# Run the test script
python scripts/openrouter-test.py
```

Expected output:

```
eyegents OpenRouter Connectivity Test
============================================================
[OK] API key found: sk-or-v1-xxxx...
[OK] Site: eyegents

Testing Nemotron 3 Super (free)...
  [OK] Response: eyegents connected
  [OK] Latency: 1.23s | Tokens: 12in/8out

Testing DeepSeek V4 Flash...
  [OK] Response: eyegents connected
  [OK] Latency: 0.98s | Tokens: 12in/10out

ALL TESTS PASSED
```

## 4. Configure Routing

Edit `config/openrouter-routes.json` to customize agent-to-model mappings:

```json
{
  "agentRoutes": {
    "backend": {
      "primary": {
        "model": "deepseek-flash",
        "description": "DeepSeek V4 Flash for backend coding tasks"
      },
      "fallback": {
        "model": "local",
        "description": "Fall back to local qwen2.5-coder:7b"
      }
    }
  }
}
```

### Available Models

| Reference | OpenRouter ID | Cost | Best For |
|-----------|---------------|------|----------|
| `qwen-coder` | `qwen/qwen3-coder:free` | Free | Primary coding model |
| `deepseek-flash-free` | `deepseek/deepseek-v4-flash:free` | Free | Long-context fallback |
| `openrouter-free` | `openrouter/free` | Free | General fallback/router |
| `nemotron-ultra` | `nvidia/nemotron-3-ultra-550b-a55b` | $0.001/$0.003 | Security audits |
| `deepseek-pro` | `deepseek/deepseek-v4-pro` | $0.435/$0.87 | Complex reasoning |

## 5. Docker Integration

### Local Development

Load secrets and start with the OpenRouter overlay:

```bash
# Load secrets into environment
source scripts/load-secrets.sh

# Start with OpenRouter
docker compose -f docker/docker-compose.yml -f docker/docker-compose.openrouter.yml up -d
```

### Environment Variables

The overlay adds these to the MCP server:

```yaml
OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
CODING_MODEL=${CODING_MODEL:-openrouter/qwen/qwen3-coder:free}
FALLBACK_MODEL=${FALLBACK_MODEL:-openrouter/deepseek/deepseek-v4-flash:free}
ROUTER_MODEL=${ROUTER_MODEL:-openrouter/free}
GH_PAT=${GH_PAT}
OPENROUTER_SITE_URL=https://github.com/browneyes-sec/eyegents
OPENROUTER_SITE_TITLE=eyegents
```

### GitHub Secrets (CI/CD)

Add to repository settings → Secrets and variables → Actions:

| Name | Value |
|------|-------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `GH_PAT` | GitHub personal access token |

## 6. Verify

```bash
# Check MCP server has OpenRouter configured
curl http://localhost:3001/health

# Test via MCP tool (in OpenCode)
> Use openrouter_health to check connectivity
```

## Cost Management

### Daily Budget

Default: $5.00/day. Configurable in the client initialization:

```typescript
const client = new OpenRouterClient({
  apiKey: process.env.OPENROUTER_API_KEY,
  dailyBudget: 10.0  // $10/day
});
```

### Cost Tracking

```bash
# Via MCP tool
openrouter_costs()
```

Returns per-model and per-agent usage breakdowns.

### Free Tier Usage

Nemotron 3 Super and Nano are free. Use these for orchestration and lightweight tasks to minimize costs.

## Troubleshooting

### "API key not valid"

1. Check `.secrets` file exists and has correct key
2. Run `source scripts/load-secrets.sh`
3. Verify key at [openrouter.ai/keys](https://openrouter.ai/keys)

### "Rate limited"

- Free models have rate limits
- Switch to a paid model for high-throughput tasks
- Implement retry with exponential backoff (handled by circuit breaker)

### "Model not available"

- Check model ID in `config/openrouter-routes.json`
- Verify the model is listed at [openrouter.ai/models](https://openrouter.ai/models)
- Use `openrouter_models` MCP tool to list available models
