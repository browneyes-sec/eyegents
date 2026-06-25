# Eyegents Documentation

Welcome to the Eyegents documentation. Eyegents is a local-first AI coding platform with vectorized memory, multi-agent orchestration, and cost-governed model routing.

## Architecture

- [System Overview](architecture/system-overview.md) — Platform purpose, component diagram, agents, memory collections
- [Data Flow](architecture/data-flow.md) — Context assembly, memory lifecycle, token budgets, decision logging
- [Agent Routing](architecture/agent-routing.md) — Task complexity detection, model assignments, fallback chains
- [ADRs](architecture/adrs/) — Architecture Decision Records
  - [001 — Local-first LLM](architecture/adrs/001-local-first-llm.md)
  - [002 — OpenRouter Fallback](architecture/adrs/002-openrouter-fallback.md)
  - [003 — Monorepo Structure](architecture/adrs/003-monorepo-structure.md)

## Operations

- [Runbook](operations/runbook.md)
- [Incident Response](operations/incident-response.md)
- [Health Checks](operations/health-checks.md)
- [Resource Limits](operations/resource-limits.md)

## Agent Ops

- [Agent Lifecycle](agent-ops/agent-lifecycle.md)
- [Context Engineering](agent-ops/context-engineering.md)
- [Memory Management](agent-ops/memory-management.md)
- [Cost Governance](agent-ops/cost-governance.md)

## Security

- [Threat Model](security/threat-model.md)
- [Secrets Management](security/secrets-management.md)
- [Container Security](security/container-security.md)

## Development

- [Getting Started](development/getting-started.md)
- [Contributing](development/contributing.md)
- [Testing](development/testing.md)
- [Local Setup](development/local-setup.md)

## Infrastructure

- [Docker Architecture](infrastructure/docker-architecture.md)
- [Service Ports](infrastructure/service-ports.md)
- [Deployment](infrastructure/deployment.md)

## API

- [MCP Tools Reference](api/mcp-tools-reference.md)
- [OpenRouter Integration](api/openrouter-integration.md)
- [Model Routing API](api/model-routing-api.md)

## Guides

- [Quick Start](guides/quick-start.md)
- [OpenRouter Setup](guides/openrouter-setup.md)
- [First Agent](guides/first-agent.md)
