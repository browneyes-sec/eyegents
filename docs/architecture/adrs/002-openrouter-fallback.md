# ADR-002: OpenRouter for Remote Fallback

## Status

Accepted

## Context

Local models (qwen2.5-coder:7b) are sufficient for most coding tasks, but certain workloads exceed local model capabilities:

- Complex multi-file refactoring with cross-cutting concerns
- Architectural reasoning requiring broad codebase understanding
- Final review and certification of changes (quality gate)
- Tasks involving unusual languages or frameworks not well-represented in the local model's training data

Running self-hosted larger models is not viable due to hardware constraints on target developer machines.

## Decision

Integrate **OpenRouter** as the remote model provider with the following model assignments:

| Model | Use Case | Cost Tier |
|---|---|---|
| **Nemotron Ultra** | Certifier agent, complex reasoning | Free tier (OpenRouter) |
| **DeepSeek** | Backend, frontend, fullstack agents | Paid (low cost) |
| **GPT-4o** | Last-resort fallback | Paid (high cost) |

OpenRouter is chosen over direct provider APIs because it provides:
- A single API key for multiple providers
- Automatic failover between providers
- Unified billing and usage tracking
- Free tier access to capable models (Nemotron)

## Consequences

### Positive

- Access to 70B+ parameter models without self-hosting
- Single integration point for multiple model providers
- Free tier models (Nemotron Ultra) available for quality-critical tasks
- Automatic provider failover built into OpenRouter

### Negative

- **API key management** — OpenRouter API key must be securely stored and rotated; compromise exposes paid model access
- **Network dependency** — Remote fallback is unavailable offline; degradation is graceful but quality drops
- **Cost exposure** — DeepSeek and GPT-4o calls incur per-token charges; runaway loops or excessive context could exhaust budget
- **Data leaves the machine** — Code context sent to remote providers; users must accept this tradeoff for quality-critical tasks

### Mitigations

- Daily budget caps with hard enforcement prevent runaway costs
- Opt-in only — remote models are never called without user configuration
- API keys stored in environment variables, never committed to repositories
- Audit logging tracks every remote call with token counts and costs
