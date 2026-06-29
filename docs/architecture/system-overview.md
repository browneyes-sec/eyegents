# System Overview

## Platform Purpose

Eyegents is a local-first AI coding platform that combines vectorized memory, multi-agent orchestration, and cost-governed model routing. Code lives on your machine; embeddings and context stay local; expensive remote calls are used only when necessary.

## Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     OpenCode Agent CLI                      │
│  (orchestrator · backend · frontend · qa · ops · fullstack) │
│                         certifier                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ MCP protocol
┌──────────────────────────▼──────────────────────────────────┐
│                       MCP Server                            │
│  vector_search · github_api · filesystem · shell             │
│  skill_execute · context_assembly · memory_store             │
└────────┬─────────────────┬─────────────────┬────────────────┘
         │                 │                 │
    ┌────▼────┐     ┌─────▼─────┐    ┌──────▼──────┐
    │ Qdrant  │     │  Ollama   │    │  OpenRouter  │
    │ Vector  │     │  (local)  │    │  (remote)    │
    │  Index  │     │  qwen2.5  │    │  Nemotron    │
    │         │     │  -coder:7b│    │  DeepSeek    │
    └─────────┘     └───────────┘    └──────────────┘
```

## 7 Specialized Agents

| Agent | Role |
|---|---|
| **orchestrator** | Task decomposition, routing, cross-agent coordination |
| **backend** | Server-side logic, APIs, databases, infrastructure |
| **frontend** | UI components, styling, client-side behavior |
| **qa** | Testing strategies, bug reproduction, regression prevention |
| **ops** | Deployment, monitoring, CI/CD, system health |
| **fullstack** | End-to-end features spanning multiple layers |
| **certifier** | Final review, quality gates, correctness validation |

## 4 Memory Collections

| Collection | Contents |
|---|---|
| **code_chunks** | Embeddings of indexed source code files and functions |
| **conversations** | Interaction history, Q&A pairs, resolved issues |
| **decisions** | Architectural decisions with rationale and context |
| **skill_patterns** | Reusable workflow templates and learned procedures |

## MCP Tools

| Tool | Purpose |
|---|---|
| `vector_search` | Semantic search over code and memory collections |
| `github_api` | Repository operations, PRs, issues, code review |
| `filesystem` | File read/write/search with path safety enforcement |
| `shell` | Command execution with sandboxing and audit logging |
| `skill_execute` | Invoke pre-defined skill workflows from the skill collection |
