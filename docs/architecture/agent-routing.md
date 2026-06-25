# Agent Routing

## Task Complexity Detection

Tasks are classified into three tiers using a combination of keyword heuristics and token length analysis:

| Tier | Signals | Example |
|---|---|---|
| **Simple** | Single-concern keywords, < 200 tokens | "Fix the typo in README" |
| **Medium** | Multi-file implications, 200–800 tokens | "Add pagination to the users endpoint" |
| **Complex** | Architectural keywords, > 800 tokens | "Refactor auth to support OAuth2 with session persistence" |

Keywords checked: `refactor`, `migrate`, `architect`, `security`, `performance`, `database`, `auth`, `deploy`, `ci/cd`, `testing strategy`.

## Per-Agent Model Assignments

| Agent | Primary Model | Rationale |
|---|---|---|
| **orchestrator** | Hybrid (local + remote) | Needs fast routing decisions locally, complex decomposition remotely |
| **backend** | DeepSeek (OpenRouter) | Strong code generation for server logic |
| **frontend** | DeepSeek (OpenRouter) | Strong code generation for UI components |
| **qa** | Ollama local | Test generation is prompt-heavy, cost-sensitive |
| **ops** | Ollama local | Script generation, config files — low complexity |
| **fullstack** | DeepSeek (OpenRouter) | Cross-cutting tasks need model quality |
| **certifier** | Nemotron Ultra (OpenRouter) | Final review demands highest reasoning quality |

## Fallback Chain

```
Local (Ollama)
    │ timeout / quality gate failure
    ▼
OpenRouter Free (Nemotron)
    │ rate limit / unavailable
    ▼
OpenRouter Paid (DeepSeek)
    │ budget exhausted / unavailable
    ▼
OpenAI (GPT-4o)
    │ last resort
    ▼
Error — task deferred with user notification
```

Each hop in the chain is gated by:
- **Timeout** — 10s local, 30s remote
- **Quality gate** — Output length and structure validation
- **Budget check** — Remaining daily budget > estimated task cost
- **Availability** — Health check against provider endpoint

## Cost Governance

| Control | Mechanism |
|---|---|
| **Daily budget cap** | Hard limit on total API spend per calendar day |
| **Per-model cost tracking** | Token-level cost calculation per provider |
| **Cost-aware routing** | Prefers cheaper models when quality is sufficient |
| **Spend alerts** | Warning at 70% and 90% of daily budget |
| **Free-tier prioritization** | OpenRouter free models attempted before paid |
| **Usage dashboard** | Real-time cost visibility per agent and model |
