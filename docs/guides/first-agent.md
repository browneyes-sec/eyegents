# Building Your First Agent

Step-by-step guide to creating a custom agent with OpenRouter model routing.

## Overview

Agents in eyegents are defined by:

1. **Role**: What the agent does (e.g., `backend`, `frontend`)
2. **Model**: Which LLM powers the agent
3. **Routing**: When to use primary vs fallback model

## Step 1: Define the Agent Role

Choose a role name and description. Roles map to agent responsibilities:

| Existing Roles | Purpose |
|----------------|---------|
| `orchestrator` | Task decomposition and routing |
| `backend` | API, database, server logic |
| `frontend` | UI components, CSS, state |
| `qa` | Testing, coverage, benchmarks |
| `ops` | Deployment, CI/CD, monitoring |
| `fullstack` | End-to-end features |
| `certifier` | Security audits, compliance |

Create a new role (e.g., `data-engineer`):

```json
{
  "role": "data-engineer",
  "description": "Data pipelines, ETL, analytics"
}
```

## Step 2: Add to Routing Configuration

Edit `config/openrouter-routes.json`:

```json
{
  "agentRoutes": {
    "data-engineer": {
      "primary": {
        "model": "deepseek-flash",
        "description": "DeepSeek V4 Flash for data pipeline tasks"
      },
      "fallback": {
        "model": "local",
        "description": "Fall back to local qwen2.5-coder:7b"
      }
    }
  }
}
```

### Routing Strategies

**Primary/Fallback**: Use primary model, fall back on failure:

```json
{
  "primary": { "model": "deepseek-flash" },
  "fallback": { "model": "local" }
}
```

**Simple/Complex**: Route based on task complexity:

```json
{
  "simple": { "model": "local" },
  "complex": { "model": "nemotron-super" },
  "complexityThreshold": 2048,
  "complexKeywords": ["pipeline", "transform", "aggregate"]
}
```

## Step 3: Register the Agent Role

If adding a new role (not extending existing), update the schema in the OpenRouter client:

```typescript
// In packages/openrouter-client/src/types.ts
export const AgentRoleSchema = z.enum([
  "orchestrator",
  "backend",
  "frontend",
  "qa",
  "ops",
  "fullstack",
  "certifier",
  "data-engineer"  // Add your new role
]);
```

## Step 4: Test the Agent

### Via MCP Tool

In OpenCode, test the new agent:

```
> Use openrouter_complete with agentRole "data-engineer" to design a data pipeline for user analytics
```

### Via Python Script

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"]
)

response = client.chat.completions.create(
    model="deepseek/deepseek-v4-flash",
    messages=[
        {"role": "system", "content": "You are a data engineer for the eyegents project."},
        {"role": "user", "content": "Design a real-time analytics pipeline for user events."}
    ],
    max_tokens=4096
)

print(response.choices[0].message.content)
```

### Verify Routing

```bash
# Check routing configuration
curl http://localhost:3001/health  # MCP server running

# In OpenCode, use the openrouter_routes tool
> Show me the routing configuration for the data-engineer agent
```

## Step 5: Add Keywords for Routing

If using the orchestrator's complexity detection, add keywords for your domain:

```json
{
  "agentRoutes": {
    "orchestrator": {
      "complexKeywords": [
        "decompose", "plan", "architecture", "refactor",
        "pipeline", "transform", "aggregate"  // Add data-engineer keywords
      ]
    }
  }
}
```

## Complete Example

### `config/openrouter-routes.json` addition:

```json
{
  "models": {
    "deepseek-flash": {
      "openrouterId": "deepseek/deepseek-v4-flash",
      "contextWindow": 1048576,
      "maxOutput": 16384,
      "costPerMillionInput": 0.112,
      "costPerMillionOutput": 0.224,
      "strengths": ["fast coding", "code generation", "data pipelines"],
      "tier": "paid"
    }
  },
  "agentRoutes": {
    "data-engineer": {
      "primary": {
        "model": "deepseek-flash",
        "description": "DeepSeek V4 Flash for data pipeline tasks"
      },
      "fallback": {
        "model": "local",
        "description": "Fall back to local qwen2.5-coder:7b"
      }
    }
  }
}
```

### Agent behavior:

1. **Simple task** (e.g., "write a SQL query") → routes to local model
2. **Complex task** (e.g., "design a real-time analytics pipeline with Kafka and ClickHouse") → routes to DeepSeek V4 Flash
3. **On failure** → falls back to local model

## Best Practices

- Start with a free model (Nemotron Super) for testing
- Use `primary/fallback` routing for most agents
- Reserve `simple/complex` for the orchestrator
- Test with `openrouter_health` before deploying
- Monitor costs with `openrouter_costs`

## Next Steps

- [OpenRouter Setup](openrouter-setup.md) — Full setup guide
- [Model Routing API](../api/model-routing-api.md) — Routing internals
- [MCP Tools Reference](../api/mcp-tools-reference.md) — All available tools
