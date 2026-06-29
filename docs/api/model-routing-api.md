# Model Routing API

Agent-to-model routing resolution for OpenRouter integration.

## AgentRouter

The `AgentRouter` class resolves which model to use for a given agent role and task.

### `resolveModel(agentRole, taskComplexity, prompt)`

Resolves the optimal model for a request.

```typescript
import { AgentRouter } from "@eyegents/openrouter-client";

const router = new AgentRouter(config);

const resolution = router.resolveModel("backend", "complex", "Implement JWT auth middleware");
// → {
//   modelId: "deepseek-flash",
//   openrouterId: "deepseek/deepseek-v4-flash",
//   isLocal: false,
//   reason: "Agent 'backend' uses deepseek-flash for complex tasks"
// }
```

### Resolution Object

```typescript
interface ModelResolution {
  modelId: string;        // Internal model reference (e.g., "deepseek-flash")
  openrouterId: string;   // OpenRouter model ID (e.g., "deepseek/deepseek-v4-flash")
  isLocal: boolean;       // true if using local Ollama model
  reason: string;         // Human-readable routing decision
}
```

### Local Model Resolution

When `isLocal` is true, the model routes to Ollama:

```typescript
const resolution = router.resolveModel("frontend", "simple", "Add CSS hover effect");
// → {
//   modelId: "local",
//   openrouterId: "qwen2.5-coder:7b",
//   isLocal: true,
//   reason: "Agent 'frontend' uses local model for simple tasks"
// }
```

## Complexity Detection

Task complexity is detected automatically from the prompt:

### Token Length

Prompts exceeding 2048 tokens are classified as complex.

### Keyword Detection

Keywords in the prompt trigger complex classification:

| Category | Keywords |
|----------|----------|
| Planning | `decompose`, `plan`, `architecture`, `refactor`, `multi-step` |
| Coordination | `break down`, `coordinate`, `orchestrate` |
| Analysis | `analyze`, `evaluate`, `compare`, `trade-off` |
| Security | `audit`, `vulnerability`, `compliance`, `security` |

### Override

Complexity can be explicitly set:

```typescript
const resolution = router.resolveModel("backend", "simple", "complex prompt...");
// Forces simple routing regardless of prompt content
```

## Configuration

Routing is defined in `config/openrouter-routes.json`:

```json
{
  "models": {
    "nemotron-super": {
      "openrouterId": "nvidia/nemotron-3-super-120b-a12b:free",
      "contextWindow": 1048576,
      "maxOutput": 16384,
      "costPerMillionInput": 0,
      "costPerMillionOutput": 0,
      "strengths": ["agent orchestration", "multi-step planning"],
      "tier": "free"
    }
  },
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
  },
  "localModels": {
    "primary": "qwen2.5-coder:7b",
    "small": "qwen2.5:0.5b",
    "embedding": "bge-m3:latest"
  }
}
```

### Model Tiers

- **free**: No cost, rate-limited (Nemotron Super, Nemotron Nano)
- **paid**: Per-token billing (Nemotron Ultra, DeepSeek Flash, DeepSeek Pro)

### Agent Route Strategies

**Primary/Fallback**: Most agents use this pattern:

```json
{
  "primary": { "model": "deepseek-flash" },
  "fallback": { "model": "local" }
}
```

**Simple/Complex**: The orchestrator uses complexity-based routing:

```json
{
  "simple": { "model": "local" },
  "complex": { "model": "nemotron-super" },
  "complexityThreshold": 2048,
  "complexKeywords": ["decompose", "plan", "architecture"]
}
```

## Integration

The router is used by the `openrouter_complete` MCP tool:

```typescript
// In MCP server
const result = await client.complete({
  model: "auto",
  messages: [{ role: "user", content: prompt }],
  agentRole: "backend",
  taskComplexity: "complex"
});
```

The client automatically resolves the model, handles fallback, and tracks costs.
