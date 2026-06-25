# ADR-001: Local-first LLM

## Status

Accepted

## Context

Eyegents requires an LLM backend for code understanding, generation, and context assembly. Key constraints:

- **Privacy** — Source code and project context should not leave the machine unless explicitly permitted
- **Latency** — Round-trip to remote APIs adds 200–2000ms; local inference eliminates network overhead
- **Cost control** — Remote API calls accumulate cost per token; a local model eliminates per-query charges
- **Offline capability** — Development should not require an internet connection

## Decision

Use **Ollama** with **qwen2.5-coder:7b** as the primary LLM backend. All code indexing, embedding generation, and simple-to-medium reasoning tasks are handled locally.

Remote models (via OpenRouter) are used only as a fallback when local inference is insufficient in quality or when the task explicitly requires a larger model.

## Consequences

### Positive

- Zero cost for most inference workloads
- Complete data privacy — code never leaves the machine by default
- Sub-second latency for local inference
- Full offline functionality for core features

### Negative

- **RAM constraints** — qwen2.5-coder:7b requires ~8GB VRAM/RAM; machines with less may experience degraded performance or swap thrashing
- **Model quality tradeoffs** — 7B parameter models produce lower quality output than 70B+ remote models for complex reasoning, multi-file refactoring, and architectural decisions
- **Maintenance burden** — Model updates must be pulled manually; version pinning required for reproducibility

### Mitigations

- Configurable model selection per agent allows users to override defaults
- Fallback chain to remote models ensures quality is available when needed
- Resource monitoring detects memory pressure and adjusts batch sizes
