# Context Engineering

## Context Assembly Pipeline

The context pipeline transforms a raw query into a structured prompt delivered to the target model.

```
Query → Retrieval → Assembly → Delivery
```

### 1. Query Processing
The incoming query is parsed for intent, entities, and implicit context. The orchestrator annotates it with task metadata (agent assignment, priority, cost tier).

### 2. Retrieval
Relevant context is fetched from memory sources based on the query embedding and metadata filters. Retrieval candidates include code chunks, conversation snippets, decisions, and skill patterns.

### 3. Assembly
Retrieved items are ranked, deduplicated, and packed into the context window. Assembly respects token budgets and priority allocation rules.

### 4. Delivery
The assembled context is formatted as a system prompt or user message and delivered to the target model via the provider API.

## Token Budget Management

### Max Context
Each model defines a maximum context window. The assembly step must not exceed this limit.

| Model | Max Context |
|---|---|
| Nemotron Ultra | 128k tokens |
| DeepSeek Coder | 128k tokens |
| Nemotron Super | 32k tokens |
| Nemotron Nano | 8k tokens |

### Priority Allocation
Token budget is allocated by priority:

1. **System prompt and instructions** — reserved, non-negotiable
2. **Task-specific context** — high priority, filled first
3. **Memory retrievals** — medium priority, fill remaining budget
4. **Conversation history** — low priority, truncated if needed

### Overflow Handling
When context exceeds the budget:
- Low-priority items are truncated or dropped.
- Long conversation histories are summarized.
- Memory retrievals beyond the budget are discarded with a notice to the agent.

## Memory Sources

| Source | Description | Typical Size |
|---|---|---|
| Code chunks | Semantically indexed fragments of code | 200-500 tokens each |
| Conversations | Prior session transcripts | 500-2000 tokens each |
| Decisions | Architectural and design decisions | 100-300 tokens each |
| Skill patterns | Few-shot examples for skills | 300-800 tokens each |

## Context Quality

### Relevance Scoring
Each retrieved item is scored for relevance against the query using cosine similarity on embeddings. Items below a configurable threshold are excluded.

### Deduplication
Duplicate or near-duplicate items (similarity > 0.95) are collapsed into a single representative entry.

### Freshness
Recent items are weighted higher than stale ones. A freshness decay function reduces the score of items older than a configurable age.

## Anti-Patterns

### Context Bloat
Including too many retrievals or verbose conversation history, inflating token cost without improving response quality. **Mitigation**: enforce strict token budgets and priority allocation.

### Stale Memories
Retrieving outdated code or decisions that no longer reflect the current state. **Mitigation**: freshness scoring and periodic memory pruning.

### Irrelevant Retrieval
Fetching context that does not relate to the current query, wasting token budget. **Mitigation**: improve embedding quality, tune similarity thresholds, and use metadata filtering.
