# Data Flow

## Context Assembly Pipeline

```
User Query
    │
    ▼
┌──────────────┐
│ Tokenizer &  │  Parse query, extract intent keywords
│ Intent Parse │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Vector Search │  Semantic similarity against 4 collections
│  (Qdrant)    │  code_chunks → conversations → decisions → skill_patterns
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Ranking &    │  Score results, deduplicate, enforce relevance threshold
│ Deduplication│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Token Budget │  Allocate across context window by priority tier
│ Assembly     │  code_chunks (highest) → decisions → skill_patterns → history
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Context      │  Final prompt packet sent to assigned agent
│ Packet       │
└──────────────┘
```

## Memory Lifecycle

1. **Code indexed** — Files are chunked at function/class boundaries during indexing or on file change detection
2. **Embeddings stored** — Chunks are embedded via Ollama (`qwen2.5-coder:7b` embeddings) and stored in Qdrant
3. **Semantic search** — At query time, the user request is embedded and matched against the vector index
4. **Context packet** — Ranked results are assembled into a token-budgeted prompt and routed to the assigned agent

## Token Budget Management

| Parameter | Default | Description |
|---|---|---|
| `max_context_window` | 8192 | Total token budget per agent invocation |
| `code_chunks_pct` | 50% | Allocation for retrieved code context |
| `decisions_pct` | 20% | Allocation for relevant architectural decisions |
| `skill_patterns_pct` | 15% | Allocation for reusable workflow templates |
| `history_pct` | 10% | Allocation for conversation history |
| `system_pct` | 5% | Allocation for system instructions |

**Overflow handling:** When results exceed budget, lowest-ranked items are truncated first. If code chunks alone exceed the budget, the most relevant functions are kept and file-level summaries replace remaining context.

## Decision Logging

Architectural decisions are stored in the `decisions` collection with:

- **id** — Unique identifier (e.g., `ADR-003`)
- **title** — Short description
- **status** — `accepted`, `deprecated`, `superseded`
- **context** — Problem statement and constraints
- **decision** — What was chosen
- **consequences** — Trade-offs and follow-up work
- **timestamp** — When the decision was recorded
- **embedding** — Vector representation for semantic retrieval

Decisions are automatically surfaced during context assembly when the current task relates to a previously resolved architectural question.
