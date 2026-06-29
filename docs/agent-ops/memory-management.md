# Memory Management

## Collections

| Collection | Purpose | Embedding |
|---|---|---|
| `code_chunks` | Semantic code search over indexed file fragments | bge-m3 |
| `conversations` | Session memory for multi-turn continuity | nomic-embed-text |
| `decisions` | Architectural and design decision records | bge-m3 |
| `skill_patterns` | Few-shot examples for skill execution | bge-m3 |

### code_chunks
Code is split into semantic chunks (functions, classes, logical blocks) and embedded for retrieval. Each chunk stores its file path, line range, language, and a summary.

### conversations
Full conversation transcripts are embedded per-turn. Retrieval returns the most relevant prior turns to provide continuity across sessions.

### decisions
Design decisions, architectural rationale, and trade-off records are stored with timestamps and linked to affected code areas.

### skill_patterns
Few-shot examples demonstrating correct skill execution. Used to prime agents when invoking specific skills.

## Memory Lifecycle

```
Creation → Indexing → Retrieval → Decay → Archival
```

### Creation
Memories are created during agent execution: code is chunked, conversations are logged, decisions are recorded, and skill patterns are extracted.

### Indexing
New memories are embedded and inserted into their respective Qdrant collections. Indexing is asynchronous and batched.

### Retrieval
At query time, memories are retrieved by vector similarity with optional metadata filters (collection, time range, agent, project).

### Decay
Memories lose relevance over time. A decay function reduces retrieval score based on age. Configurable per collection.

### Archival
Memories that fall below a relevance threshold or exceed a maximum age are moved to cold storage. Archived memories are not retrieved but can be restored.

## Embedding Models

| Model | Dimensions | Use Case | Speed |
|---|---|---|---|
| bge-m3 | 1024 | Code, decisions, skill patterns | Moderate |
| nomic-embed-text | 768 | Conversations | Fast |

### bge-m3
Multilingual model optimized for code and technical text. 1024-dimensional embeddings. Default for code and structured collections.

### nomic-embed-text
Lightweight model for conversational text. 768-dimensional embeddings. Lower latency suitable for high-volume conversation retrieval.

## Memory Quality

### Freshness Scoring
Each memory carries a creation timestamp. Retrieval scores are adjusted by a freshness weight that decays with age.

### Relevance Filtering
Retrieval results below a similarity threshold (configurable, default 0.7) are excluded from context assembly.

### Deduplication
Embeddings with cosine similarity above 0.95 are detected and merged. The surviving entry retains the most recent metadata.

## Memory Operations

Memory is managed through MCP tools exposed to agents.

| Tool | Description |
|---|---|
| `remember` | Store a new memory into a collection |
| `recall` | Retrieve memories by semantic similarity and filters |
| `forget` | Remove a memory by ID or query match |

### remember
Stores content with metadata (collection, tags, agent ID). The content is embedded and indexed asynchronously.

### recall
Queries a collection with a text or vector input. Returns ranked results with scores and metadata. Supports filters for collection, time range, and tags.

### forget
Deletes memories matching an ID or query. Used for correction, privacy, or cleanup.
